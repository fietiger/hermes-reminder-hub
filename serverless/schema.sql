-- Cloudflare D1 数据库初始化结构
-- 1. 提醒任务表
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    template_id TEXT DEFAULT 'tpl_standard',
    calendar_type TEXT NOT NULL, -- 'solar' | 'lunar'
    repeat_type TEXT NOT NULL,   -- 'yearly' | 'monthly' | 'weekly' | 'daily' | 'once'
    target_date TEXT,            -- 'MM-DD'
    target_time TEXT NOT NULL,   -- 'HH:mm'
    channel_ids TEXT DEFAULT '["default_wx"]', -- JSON array of channel ids
    enabled INTEGER DEFAULT 1,
    next_trigger_at INTEGER,     -- 毫秒时间戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 发送通道表
CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    headers TEXT,                -- JSON 格式自定义 Header
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 发送历史记录表
CREATE TABLE IF NOT EXISTS delivery_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reminder_id TEXT,
    channel_id TEXT,
    message TEXT,
    status TEXT,
    response TEXT,
    delivered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 消息模版表
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 预置默认通道 (可修改为公网 Hermes 微信直发地址或 Webhook)
INSERT OR IGNORE INTO channels (id, name, endpoint_url, enabled) 
VALUES ('default_wx', '微信直通服务', 'https://bot.benext.uk/send', 1);

-- 预置消息模版
INSERT OR IGNORE INTO templates (id, name, content, is_default) VALUES
('tpl_standard', '标准精美卡片 (默认)', '### 🔔 {{title}}\n\n> ⏰ **触发时间**: {{time}}\n> 🏷️ **提醒分类**: {{type}}\n> 📡 **通知通道**: {{channel_name}}\n\n---\n\n{{content}}\n\n*—— 来自 Hermes 智能提醒中枢*', 1),
('tpl_festival', '节日与生日祝福', '### 🏮 **{{title}}** 🏮\n\n🎉 今天是特别的日子！\n\n> 🗓️ 历法类型: {{type}}\n> ⏰ 提醒时间: {{time}}\n\n✨ **重要事项 / 祝福** ✨\n{{content}}\n\n祝您度过愉快美好的一天！💐', 0),
('tpl_todo', '工作与待办提醒', '### 📋 【待办任务】{{title}}\n\n**详细说明**:\n{{content}}\n\n> ⏳ 设定时间: {{time}}\n> 🎯 请及时跟进与处理！', 0),
('tpl_minimal', '极简无干扰', '🔔 **{{title}}**\n{{content}}', 0),
('tpl_direct', '即时直发通知', '### ⚡ 即时通知\n\n> 🕒 发送时间: {{time}}\n> 📡 来源: {{channel_name}}\n\n---\n\n{{content}}', 0),
('tpl_raw', '原始纯文本', '{{content}}', 0);
