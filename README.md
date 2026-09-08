# Hermes Reminder Hub (智能农历/公历提醒中枢与微信直通)

这是一个为 **Hermes Agent** 量身打造的**高可用智能提醒中枢与多通道通知系统**。

支持部署在 **Docker (本地/VPS)** 或 **Cloudflare Workers (全球边缘计算)**，支持公历、农历、单次延时、按天、按周、按月、按年等多种复杂周期，并提供微信直通（Weixin Direct）平台适配器与 Hermes Agent Tool 插件。

---

## 🌟 核心特性

1. **农历 / 阳历双引擎调度**：
   - 原生支持农历生日、农历节日（如八月十五中秋节）自动换算公历下一次触发时间；
   - 支持公历每日、每周（如每周五 17:30）、每月（如每月 10 号还信用卡）、每年等复杂周期。
2. **多通道抽象（Multi-Channel Architecture）**：
   - 单个提醒服务可同时挂载多个通知通道（如小马本地微信、小牛 VPS 微信、企业微信或外部 Webhook）；
   - 创建提醒时可按需路由，无需为不同 Agent 重复部署服务。
3. **Hermes Agent 深度集成**：
   - **Platform Plugin** (`plugins/platforms/weixin_direct`): 微信直通适配器；
   - **Tool Plugin** (`plugins/tools/reminder_tools`): 包含 `reminder_create`、`reminder_list`、`reminder_cancel`、`reminder_channel_list`、`reminder_channel_add` 工具集。
4. **双形态运行支持**：
   - **Docker 一键运行**：内置 Node.js + SQLite3 + 10 秒级精准轮询调度引擎；
   - **Cloudflare Workers / D1**：支持边缘无服务器部署与 Cron Triggers。

---

## 🚀 架构设计

```
                         ┌─────────────────────────────────┐
                         │   Hermes Reminder Hub Server    │
                         │    (Docker / Cloudflare Worker) │
                         │    - Lunar & Solar Scheduler    │
                         │    - Channels Router            │
                         └──────────────┬──────────────────┘
                                        │ 到期通知触发 (HTTP POST)
                   ┌────────────────────┴────────────────────┐
                   ▼                                         ▼
     ┌───────────────────────────┐             ┌───────────────────────────┐
     │  Channel 1: 本地微信直通   │             │   Channel 2: 小牛微信直通  │
     │  (http://127.0.0.1:8765)  │             │(http://198.200.49.120:8765│
     └─────────────┬─────────────┘             └─────────────┬─────────────┘
                   ▼                                         ▼
            用户微信客户端 A                           用户微信客户端 B
```

---

## 🛠️ 快速开始 (Docker 本地测试与运行)

### 1. 启动提醒中枢容器
```bash
docker run -d \
  --name hermes-reminder-hub \
  -p 8780:8780 \
  -e PORT=8780 \
  -e REMINDER_AUTH_TOKEN=your_secret_token \
  --restart unless-stopped \
  hermes-reminder-hub:latest
```

### 2. 测试创建提醒
- **农历生日提醒**（每年农历九月十八 09:30）：
```bash
curl -X POST http://127.0.0.1:8780/api/reminders \
  -H "Authorization: Bearer your_secret_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "爸妈生日",
    "content": "祝爸妈生日快乐！",
    "calendar_type": "lunar",
    "repeat_type": "yearly",
    "lunar_month": 9,
    "lunar_day": 18,
    "time": "09:30"
  }'
```

---

## 🔌 Hermes 插件配置

将 `plugins/tools/reminder_tools` 放入你的 Hermes 插件目录，Hermes 将自动获得以下能力：
- *“15分钟后提醒我喝水”* ➜ 自动调用 `reminder_create`；
- *“每年农历正月初一提醒我拜年”* ➜ 自动调用 `reminder_create`；
- *“查看未来的提醒列表”* ➜ 自动调用 `reminder_list`。
