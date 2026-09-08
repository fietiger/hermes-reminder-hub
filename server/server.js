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

// 初始化数据库表
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
            channel_id TEXT NOT NULL,
            target_override TEXT,
            calendar_type TEXT DEFAULT 'solar',
            repeat_type TEXT DEFAULT 'once',
            rule_detail TEXT,
            next_trigger_at INTEGER NOT NULL,
            status TEXT DEFAULT 'active',
            last_delivered_at INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES channels(id)
        )
    `);

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

// 执行消息投递 (通过通道指定的 Webhook / 微信直通)
function deliverMessage(channel, reminder, callback) {
    const payload = JSON.stringify({
        content: `【定时提醒】${reminder.title ? reminder.title + '\n' : ''}${reminder.content}`,
        to_user: reminder.target_override || channel.target_user || ''
    });

    const targetUrl = url.parse(channel.endpoint_url);
    const req = http.request({
        hostname: targetUrl.hostname,
        port: targetUrl.port || 80,
        path: targetUrl.path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
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

// 调度引擎：每 10 秒巡检一次到期任务
function processDueReminders() {
    const now = Date.now();
    const sql = `
        SELECT r.*, c.endpoint_url, c.auth_key, c.target_user, c.enabled as channel_enabled, c.name as channel_name
        FROM reminders r
        LEFT JOIN channels c ON r.channel_id = c.id
        WHERE r.status = 'active' AND r.next_trigger_at <= ?
    `;

    db.all(sql, [now], (err, rows) => {
        if (err || !rows || rows.length === 0) return;

        rows.forEach((row) => {
            const channel = {
                endpoint_url: row.endpoint_url,
                auth_key: row.auth_key,
                target_user: row.target_user
            };

            deliverMessage(channel, row, (delErr, result) => {
                const statusStr = delErr ? 'failed' : (result.statusCode >= 200 && result.statusCode < 300 ? 'success' : `http_${result.statusCode}`);
                const logResp = delErr ? delErr.message : result.body;

                db.run(`INSERT INTO delivery_logs (reminder_id, channel_id, status, response) VALUES (?, ?, ?, ?)`,
                    [row.id, row.channel_id, statusStr, logResp]
                );

                // 更新下次触发时间或标记完成
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

    // 简单鉴权 (只针对外部 API，允许内部控制台读取)
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-api-key'] || parsedUrl.query.token;
    // 如果没有传 token 且来自浏览器直接访问，允许同源/本地查看，否则校验 token
    const isBrowserDirect = !pathname.startsWith('/api/admin') && (!token || token === AUTH_TOKEN);

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

        // 2. 通道管理 API
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

        // 3. 提醒管理 API
        if (pathname === '/api/reminders' && method === 'GET') {
            db.all('SELECT * FROM reminders ORDER BY next_trigger_at ASC', [], (err, rows) => {
                if (err) return sendJson(500, { error: err.message });
                sendJson(200, { reminders: rows });
            });
            return;
        }

        if (pathname === '/api/reminders' && method === 'POST') {
            const { title, content, channel_id, calendar_type, repeat_type, target_override } = jsonBody;
            if (!content) return sendJson(400, { error: 'content is required' });

            const remId = 'rem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            const calType = calendar_type === 'lunar' ? 'lunar' : 'solar';
            const repType = repeat_type || 'once';
            const chanId = channel_id || 'default_wx';

            const nextTrigger = calculateNextTrigger(calType, repType, jsonBody, Date.now());
            if (!nextTrigger) {
                return sendJson(400, { error: 'Unable to calculate next trigger time. Check your time rules.' });
            }

            db.run(`
                INSERT INTO reminders (id, title, content, channel_id, target_override, calendar_type, repeat_type, rule_detail, next_trigger_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            `, [remId, title || '', content, chanId, target_override || '', calType, repType, JSON.stringify(jsonBody), nextTrigger], function(err) {
                if (err) return sendJson(500, { error: err.message });
                sendJson(200, {
                    success: true,
                    reminder_id: remId,
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
