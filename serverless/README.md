# Hermes Reminder Hub - Serverless Edition (Cloudflare Workers + D1)

这是 **Hermes 智能提醒中枢** 的无服务器（Serverless）部署版本，依托 **Cloudflare 全球边缘网络** 运行，具备 **0 成本、免维护、永不下线** 的特点。

---

## 🌟 核心特性
- 🌐 **前端静态托管**：内置 iOS 原生 App 质感单页应用（Vue 3 + Tailwind CSS + Lucide 图标）；
- 🏮 **全功能农历/公历算法**：内置高精度农历月/年双向换算核心（初一/十五/节日/生日）；
- ⏰ **Cron Triggers 定时调度**：借助 Cloudflare 每分钟 Cron 自动轮询到期提醒；
- 🗄️ **Cloudflare D1 边缘存储**：真正的边缘分布式 SQLite，毫秒级响应；
- 📡 **多通道广播与模板引擎**：支持多通道并行推送与 Markdown 卡片模板渲染。

---

## 🚀 极速部署指南（5分钟）

### 1. 安装 Wrangler CLI 并登录
```bash
npm install -g wrangler
wrangler login
```

### 2. 创建 D1 数据库并初始化
```bash
# 创建 D1 数据库
wrangler d1 create reminder-db

# 执行 schema.sql 进行建表与预置数据初始化
wrangler d1 execute reminder-db --file=./schema.sql --remote
```

### 3. 配置 `wrangler.toml`
将终端输出的 `database_id` 填入 `wrangler.toml` 中：
```toml
name = "hermes-reminder-hub"
compatibility_date = "2024-01-01"
main = "worker.js"

[[d1_databases]]
binding = "DB"
database_name = "reminder-db"
database_id = "你的_D1_DATABASE_ID"

[triggers]
crons = ["* * * * *"] # 每分钟自动调度轮询
```

### 4. 一键部署到全球边缘网络
```bash
wrangler deploy
```

---

## 📁 目录结构说明
```text
serverless/
├── worker.js       # 核心单文件 Worker（包含静态 HTML 前端、API 路由、农历算法、Cron 定时引擎）
├── schema.sql      # Cloudflare D1 数据库表结构与预置模板
├── wrangler.toml   # Cloudflare 部署与 D1/Cron 绑定配置
└── README.md       # 本说明文档
```
