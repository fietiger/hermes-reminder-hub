const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { solarToLunar, lunarToSolar, getNextLunarTrigger } = require('./lunar_calc');

const PORT = process.env.PORT || 8780;
const DB_PATH = process.env.DB_PATH || './reminder.db';
const AUTH_TOKEN = process.env.REMINDER_AUTH_TOKEN || 'hermes_hub_secret_2026';
const STATIC_INDEX = path.join(__dirname, 'static', 'index.html');

const db = new sqlite3.Database(DB_PATH);

// 初始化数据库表（支持 channel_ids 数组与向前兼容）
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS channels (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'weixin_direct',
            endpoint_url TEXT NOT NULL,
            auth_key TEXT,
            target_user TEXT,
            enabled INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT NOT NULL,
            channel_id TEXT,
            channel_ids TEXT,
            target_override TEXT,
            calendar_type TEXT DEFAULT 'solar',
            repeat_type TEXT DEFAULT 'once',
            rule_detail TEXT,
            next_trigger_at INTEGER NOT NULL,
            status TEXT DEFAULT 'active',
            last_delivered_at INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`ALTER TABLE reminders ADD COLUMN channel_ids TEXT`, (err) => {});

    db.run(`
        CREATE TABLE IF NOT EXISTS delivery_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reminder_id TEXT,
            channel_id TEXT,
            status TEXT,
            response TEXT,
            delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 默认插入本地微信直通通道
    db.run(`
        INSERT OR IGNORE INTO channels (id, name, type, endpoint_url, auth_key, target_user, enabled)
        VALUES ('default_wx', '本地微信直通', 'weixin_direct', 'http://127.0.0.1:8765/send', 'hermes-weixin-direct-key-2024', '', 1)
    `);
});

// 辅助函数：解析提醒所绑定的通道 ID 列表
function getTargetChannelIds(reminder) {
    if (reminder.channel_ids) {
        try {
            const arr = JSON.parse(reminder.channel_ids);
            if (Array.isArray(arr) && arr.length > 0) return arr;
        } catch (e) {
            const arr = reminder.channel_ids.split(',').map(s => s.trim()).filter(Boolean);
            if (arr.length > 0) return arr;
        }
    }
    if (reminder.channel_id) return [reminder.channel_id];
    return ['default_wx'];
}

// 辅助计算下次触发时间戳 (毫秒)
function calculateNextTrigger(calendarType, repeatType, rule, fromTime = Date.now()) {
    const fromDate = new Date(fromTime);
    if (calendarType === 'lunar') {
        const lMonth = parseInt(rule.lunar_month, 10);
        const lDay = parseInt(rule.lunar_day, 10);
        const lTime = rule.time || '09:00';
        const res = getNextLunarTrigger(lMonth, lDay, lTime, fromDate);
        return res ? res.timestamp : null;
    }

    // 公历计算
    const timeStr = rule.time || '09:00';
    const [hh, mm] = timeStr.split(':').map(x => parseInt(x || '0', 10));

    if (repeatType === 'once') {
        if (rule.delay_minutes) return fromTime + rule.delay_minutes * 60 * 1000;
        if (rule.delay_hours) return fromTime + rule.delay_hours * 3600 * 1000;
        if (rule.delay_days) return fromTime + rule.delay_days * 86400 * 1000;
        if (rule.run_at) return new Date(rule.run_at).getTime();
        return fromTime;
    }

    if (repeatType === 'daily') {
        const d = new Date(fromTime);
        d.setHours(hh, mm, 0, 0);
        if (d.getTime() <= fromTime) d.setDate(d.getDate() + 1);
        return d.getTime();
    }

    if (repeatType === 'weekly') {
        const targetWeekday = parseInt(rule.weekday, 10); // 0=Sun, 1=Mon...6=Sat
        const d = new Date(fromTime);
        d.setHours(hh, mm, 0, 0);
        let diff = (targetWeekday - d.getDay() + 7) % 7;
        if (diff === 0 && d.getTime() <= fromTime) diff = 7;
        d.setDate(d.getDate() + diff);
        return d.getTime();
    }

    if (repeatType === 'monthly') {
        const day = parseInt(rule.monthly_day || '1', 10);
        const d = new Date(fromTime);
        d.setDate(day);
        d.setHours(hh, mm, 0, 0);
        if (d.getTime() <= fromTime) {
            d.setMonth(d.getMonth() + 1);
        }
        return d.getTime();
    }

    if (repeatType === 'yearly') {
        const m = parseInt(rule.yearly_month || '1', 10) - 1;
        const day = parseInt(rule.yearly_day || '1', 10);
        const d = new Date(fromTime);
        d.setMonth(m, day);
        d.setHours(hh, mm, 0, 0);
        if (d.getTime() <= fromTime) {
            d.setFullYear(d.getFullYear() + 1);
        }
        return d.getTime();
    }

    return null;
}

// 执行单通道消息投递 (原始消息投递)
function deliverDirectRaw(channel, content, targetUser, callback) {
    const payload = Buffer.from(JSON.stringify({
        content: content,
        to_user: targetUser || channel.target_user || ''
    }), 'utf-8');

    const targetUrl = url.parse(channel.endpoint_url);
    const req = http.request({
        hostname: targetUrl.hostname,
        port: targetUrl.port || 80,
        path: targetUrl.path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': payload.length,
            'Authorization': channel.auth_key ? `Bearer ${channel.auth_key}` : '',
            'X-API-Key': channel.auth_key || ''
        },
        timeout: 10000
    }, (res) => {
        let respData = '';
        res.on('data', chunk => respData += chunk);
        res.on('end', () => {
            callback(null, { statusCode: res.statusCode, body: respData });
        });
    });

    req.on('error', (err) => {
        callback(err, null);
    });

    req.write(payload);
    req.end();
}

function deliverToSingleChannel(channel, reminder, callback) {
    const text = `【定时提醒】${reminder.title ? reminder.title + '\n' : ''}${reminder.content}`;
    deliverDirectRaw(channel, text, reminder.target_override, callback);
}

// 调度引擎：每 10 秒巡检一次到期任务，并行分发到绑定的所有通道
function processDueReminders() {
    const now = Date.now();
    const sql = `SELECT * FROM reminders WHERE status = 'active' AND next_trigger_at <= ?`;

    db.all(sql, [now], (err, remindersList) => {
        if (err || !remindersList || remindersList.length === 0) return;

        // 获取所有启用通道
        db.all(`SELECT * FROM channels WHERE enabled = 1`, [], (cErr, allChannels) => {
            if (cErr || !allChannels) return;
            const channelMap = Object.fromEntries(allChannels.map(c => [c.id, c]));

            remindersList.forEach((row) => {
                const targetIds = getTargetChannelIds(row);
                
                // 并行分发到每个绑定的通道
                targetIds.forEach((cId) => {
                    const ch = channelMap[cId];
                    if (!ch) {
                        db.run(`INSERT INTO delivery_logs (reminder_id, channel_id, status, response) VALUES (?, ?, ?, ?)`,
                            [row.id, cId, 'skipped', 'Channel not found or disabled']
                        );
                        return;
                    }

                    deliverToSingleChannel(ch, row, (delErr, result) => {
                        const statusStr = delErr ? 'failed' : (result.statusCode >= 200 && result.statusCode < 300 ? 'success' : `http_${result.statusCode}`);
                        const logResp = delErr ? delErr.message : result.body;

                        db.run(`INSERT INTO delivery_logs (reminder_id, channel_id, status, response) VALUES (?, ?, ?, ?)`,
                            [row.id, cId, statusStr, logResp]
                        );
                    });
                });

                // 更新状态与下次触发时间
                if (row.repeat_type === 'once') {
                    db.run(`UPDATE reminders SET status = 'completed', last_delivered_at = ? WHERE id = ?`, [Date.now(), row.id]);
                } else {
                    const rule = JSON.parse(row.rule_detail || '{}');
                    const nextTime = calculateNextTrigger(row.calendar_type, row.repeat_type, rule, Date.now() + 1000);
                    if (nextTime) {
                        db.run(`UPDATE reminders SET next_trigger_at = ?, last_delivered_at = ? WHERE id = ?`, [nextTime, Date.now(), row.id]);
                    } else {
                        db.run(`UPDATE reminders SET status = 'completed', last_delivered_at = ? WHERE id = ?`, [Date.now(), row.id]);
                    }
                }
            });
        });
    });
}

setInterval(processDueReminders, 10000); // 10秒精度巡检

// REST API 服务
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    const sendJson = (code, data) => {
        res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
    };

    // 0. 静态 Web 控制台前端页面
    if (pathname === '/' || pathname === '/index.html' || pathname === '/dashboard') {
        if (fs.existsSync(STATIC_INDEX)) {
            const html = fs.readFileSync(STATIC_INDEX, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(html);
        }
        return sendJson(404, { error: 'Static frontend not found' });
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        let jsonBody = {};
        if (body) {
            try { jsonBody = JSON.parse(body); } catch (e) {}
        }

        // 1. 健康检查
        if (pathname === '/api/health') {
            return sendJson(200, { status: 'ok', service: 'hermes-reminder-hub', time: new Date().toISOString() });
        }

        // 2. 即时发送 API (POST /api/send 或 POST /api/notify)
        if ((pathname === '/api/send' || pathname === '/api/notify') && method === 'POST') {
            const { message, content, channel_id, channel_ids, to_user } = jsonBody;
            const textToSend = message || content;
            if (!textToSend) {
                return sendJson(400, { error: 'message or content is required' });
            }

            let targetChannels = [];
            if (Array.isArray(channel_ids) && channel_ids.length > 0) {
                targetChannels = channel_ids;
            } else if (channel_id) {
                targetChannels = [channel_id];
            } else {
                targetChannels = ['default_wx'];
            }

            db.all(`SELECT * FROM channels WHERE enabled = 1`, [], (cErr, allChannels) => {
                if (cErr) return sendJson(500, { error: cErr.message });
                const channelMap = Object.fromEntries(allChannels.map(c => [c.id, c]));

                const results = [];
                let completedCount = 0;

                targetChannels.forEach((cId) => {
                    const ch = channelMap[cId];
                    if (!ch) {
                        results.push({ channel_id: cId, success: false, error: 'Channel not found or disabled' });
                        completedCount++;
                        if (completedCount === targetChannels.length) {
                            sendJson(200, { ok: true, direct_send: true, results });
                        }
                        return;
                    }

                    deliverDirectRaw(ch, textToSend, to_user, (delErr, delRes) => {
                        const isOk = !delErr && delRes.statusCode >= 200 && delRes.statusCode < 300;
                        const record = {
                            channel_id: cId,
                            channel_name: ch.name,
                            success: isOk,
                            statusCode: delRes ? delRes.statusCode : null,
                            response: delErr ? delErr.message : delRes.body
                        };
                        results.push(record);

                        // 记录日志
                        db.run(`INSERT INTO delivery_logs (reminder_id, channel_id, status, response) VALUES (?, ?, ?, ?)`,
                            ['instant_send', cId, isOk ? 'success' : 'failed', delErr ? delErr.message : delRes.body]
                        );

                        completedCount++;
                        if (completedCount === targetChannels.length) {
                            sendJson(200, { ok: true, direct_send: true, results });
                        }
                    });
                });
            });
            return;
        }

        // 3. 通道管理 API
        if (pathname === '/api/channels' && method === 'GET') {
            db.all('SELECT * FROM channels ORDER BY created_at DESC', [], (err, rows) => {
                if (err) return sendJson(500, { error: err.message });
                sendJson(200, { channels: rows });
            });
            return;
        }

        if (pathname === '/api/channels' && method === 'POST') {
            const { id, name, type, endpoint_url, auth_key, target_user } = jsonBody;
            if (!id || !endpoint_url) return sendJson(400, { error: 'id and endpoint_url are required' });
            db.run(`
                INSERT INTO channels (id, name, type, endpoint_url, auth_key, target_user, enabled)
                VALUES (?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET name=excluded.name, endpoint_url=excluded.endpoint_url, auth_key=excluded.auth_key, target_user=excluded.target_user
            `, [id, name || id, type || 'weixin_direct', endpoint_url, auth_key || '', target_user || ''], function(err) {
                if (err) return sendJson(500, { error: err.message });
                sendJson(200, { success: true, channel_id: id });
            });
            return;
        }

        // 4. 提醒管理 API
        if (pathname === '/api/reminders' && method === 'GET') {
            db.all('SELECT * FROM reminders ORDER BY next_trigger_at ASC', [], (err, rows) => {
                if (err) return sendJson(500, { error: err.message });
                const normalized = rows.map(r => ({
                    ...r,
                    channel_ids: getTargetChannelIds(r)
                }));
                sendJson(200, { reminders: normalized });
            });
            return;
        }

        if (pathname === '/api/reminders' && method === 'POST') {
            const { title, content, channel_id, channel_ids, calendar_type, repeat_type, target_override } = jsonBody;
            if (!content) return sendJson(400, { error: 'content is required' });

            const remId = 'rem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            const calType = calendar_type === 'lunar' ? 'lunar' : 'solar';
            const repType = repeat_type || 'once';
            
            // 归一化通道数组
            let targetChannels = [];
            if (Array.isArray(channel_ids) && channel_ids.length > 0) {
                targetChannels = channel_ids;
            } else if (typeof channel_ids === 'string') {
                targetChannels = channel_ids.split(',').map(s => s.trim()).filter(Boolean);
            } else if (channel_id) {
                targetChannels = [channel_id];
            } else {
                targetChannels = ['default_wx'];
            }

            const primaryChannel = targetChannels[0] || 'default_wx';
            const channelIdsJson = JSON.stringify(targetChannels);

            const nextTrigger = calculateNextTrigger(calType, repType, jsonBody, Date.now());
            if (!nextTrigger) {
                return sendJson(400, { error: 'Unable to calculate next trigger time. Check your time rules.' });
            }

            db.run(`
                INSERT INTO reminders (id, title, content, channel_id, channel_ids, target_override, calendar_type, repeat_type, rule_detail, next_trigger_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            `, [remId, title || '', content, primaryChannel, channelIdsJson, target_override || '', calType, repType, JSON.stringify(jsonBody), nextTrigger], function(err) {
                if (err) return sendJson(500, { error: err.message });
                sendJson(200, {
                    success: true,
                    reminder_id: remId,
                    channels: targetChannels,
                    next_trigger_at: nextTrigger,
                    next_trigger_iso: new Date(nextTrigger).toISOString(),
                    calendar_type: calType,
                    repeat_type: repType
                });
            });
            return;
        }

        if (pathname.startsWith('/api/reminders/') && method === 'DELETE') {
            const remId = pathname.split('/')[3];
            db.run('DELETE FROM reminders WHERE id = ?', [remId], function(err) {
                if (err) return sendJson(500, { error: err.message });
                sendJson(200, { success: true, deleted: this.changes > 0 });
            });
            return;
        }

        sendJson(404, { error: 'Not Found' });
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Hermes Reminder Hub Server running on port ${PORT}`);
});
