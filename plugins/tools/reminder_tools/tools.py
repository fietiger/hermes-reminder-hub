# tools.py - Hermes Tool Plugin for Smart Lunar/Solar Reminder Hub
import os
import json
import urllib.request
import urllib.parse
from typing import Any, Dict, Optional, List, Union

DEFAULT_HUB_URL = os.getenv("REMINDER_HUB_URL", "http://127.0.0.1:8780")
DEFAULT_HUB_TOKEN = os.getenv("REMINDER_HUB_TOKEN", "hermes_hub_secret_2026")

def _hub_req(method: str, path: str, body: Any = None) -> Any:
    url = f"{DEFAULT_HUB_URL.rstrip('/')}{path}"
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": f"Bearer {DEFAULT_HUB_TOKEN}",
        "X-API-Key": DEFAULT_HUB_TOKEN
    }
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return json.loads(err_body)
        except Exception:
            return {"error": f"HTTP {e.code}: {err_body}"}
    except Exception as e:
        return {"error": str(e)}

# 1. 即时发送 / 直发消息
REMINDER_SEND_DIRECT_SCHEMA = {
    "name": "reminder_send_direct",
    "description": "即时直发消息（无需等待定时触发，类似于即时短信/即时微信通知，支持单个通道或多通道并发广播）。",
    "parameters": {
        "type": "object",
        "properties": {
            "message": {"type": "string", "description": "要即时发送的消息内容（必填）"},
            "channel_id": {"type": "string", "description": "目标通道 ID（如 default_wx 或 xiaoniu_wx）"},
            "channel_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "多通道 ID 列表，同时向多个微信/Webhook 终端即时直发"
            },
            "to_user": {"type": "string", "description": "覆盖目标接收用户 wxid（可选）"}
        },
        "required": ["message"]
    }
}

def handle_reminder_send_direct(message: str, **kwargs) -> str:
    body = {"message": message, **kwargs}
    res = _hub_req("POST", "/api/send", body)
    return json.dumps(res, ensure_ascii=False)

# 2. 创建提醒 (支持单通道/多通道列表)
REMINDER_CREATE_SCHEMA = {
    "name": "reminder_create",
    "description": "创建智能定时提醒（支持公历/农历、单次/按天/按周/按月/按年周期，支持通知单个通道或同时广播到多个通道如 ['default_wx', 'xiaoniu_wx']）。",
    "parameters": {
        "type": "object",
        "properties": {
            "content": {"type": "string", "description": "提醒正文内容（必填）"},
            "title": {"type": "string", "description": "提醒标题（可选）"},
            "channel_id": {"type": "string", "description": "单通道 ID（如 default_wx，与 channel_ids 二选一）"},
            "channel_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "多通道 ID 列表，同时通知多个微信/Webhook 终端（如 ['default_wx', 'xiaoniu_wx']）"
            },
            "calendar_type": {"type": "string", "enum": ["solar", "lunar"], "description": "历法类型：solar (公历) 或 lunar (农历)"},
            "repeat_type": {"type": "string", "enum": ["once", "daily", "weekly", "monthly", "yearly"], "description": "重复周期"},
            "delay_minutes": {"type": "integer", "description": "多少分钟后提醒（单次有效）"},
            "delay_hours": {"type": "integer", "description": "多少小时后提醒（单次有效）"},
            "run_at": {"type": "string", "description": "指定公历时间（格式 YYYY-MM-DDTHH:MM）"},
            "time": {"type": "string", "description": "提醒具体时间点（如 09:00，周期或农历必填）"},
            "weekday": {"type": "integer", "description": "每周几提醒（0=周日, 1=周一 ... 6=周六，repeat_type=weekly 时必填）"},
            "monthly_day": {"type": "integer", "description": "每月几号提醒（1-31，repeat_type=monthly 时有效）"},
            "yearly_month": {"type": "integer", "description": "每年几月提醒（1-12，repeat_type=yearly 时有效）"},
            "yearly_day": {"type": "integer", "description": "每年几日提醒（1-31，repeat_type=yearly 时有效）"},
            "lunar_month": {"type": "integer", "description": "农历月份（1-12，calendar_type=lunar 时必填）"},
            "lunar_day": {"type": "integer", "description": "农历日期（1-30，calendar_type=lunar 时必填）"}
        },
        "required": ["content"]
    }
}

def handle_reminder_create(content: str, **kwargs) -> str:
    body = {"content": content, **kwargs}
    res = _hub_req("POST", "/api/reminders", body)
    return json.dumps(res, ensure_ascii=False)

# 3. 查询提醒
REMINDER_LIST_SCHEMA = {
    "name": "reminder_list",
    "description": "查询当前所有待触发的定时提醒任务列表、绑定的通道及下次触发时间。",
    "parameters": {"type": "object", "properties": {}}
}

def handle_reminder_list(**kwargs) -> str:
    res = _hub_req("GET", "/api/reminders")
    return json.dumps(res, ensure_ascii=False)

# 4. 取消提醒
REMINDER_CANCEL_SCHEMA = {
    "name": "reminder_cancel",
    "description": "根据提醒任务 ID 取消/删除指定的定时提醒。",
    "parameters": {
        "type": "object",
        "properties": {
            "reminder_id": {"type": "string", "description": "提醒任务 ID (例如 rem_178890123_abc)"}
        },
        "required": ["reminder_id"]
    }
}

def handle_reminder_cancel(reminder_id: str, **kwargs) -> str:
    res = _hub_req("DELETE", f"/api/reminders/{reminder_id}")
    return json.dumps(res, ensure_ascii=False)

# 5. 通道列表
REMINDER_CHANNEL_LIST_SCHEMA = {
    "name": "reminder_channel_list",
    "description": "查看当前云端提醒中枢挂载的所有通知通道（微信直通、不同实例等）。",
    "parameters": {"type": "object", "properties": {}}
}

def handle_reminder_channel_list(**kwargs) -> str:
    res = _hub_req("GET", "/api/channels")
    return json.dumps(res, ensure_ascii=False)

# 6. 添加通道
REMINDER_CHANNEL_ADD_SCHEMA = {
    "name": "reminder_channel_add",
    "description": "向提醒中枢添加新的通知通道（例如接入另一台机器或实例的微信直通）。",
    "parameters": {
        "type": "object",
        "properties": {
            "id": {"type": "string", "description": "通道唯一标识（如 xiaoniu_wx）"},
            "name": {"type": "string", "description": "通道名称（如 小牛VPS微信直通）"},
            "endpoint_url": {"type": "string", "description": "目标直通接口（如 http://198.200.49.120:8765/send）"},
            "auth_key": {"type": "string", "description": "通信密钥 Token"},
            "target_user": {"type": "string", "description": "默认接收用户 ID（可选）"}
        },
        "required": ["id", "endpoint_url"]
    }
}

def handle_reminder_channel_add(id: str, endpoint_url: str, **kwargs) -> str:
    body = {"id": id, "endpoint_url": endpoint_url, **kwargs}
    res = _hub_req("POST", "/api/channels", body)
    return json.dumps(res, ensure_ascii=False)

def register_tools(ctx):
    """Register reminder tools into Hermes Agent."""
    tools = [
        ("reminder_send_direct", REMINDER_SEND_DIRECT_SCHEMA, handle_reminder_send_direct, "⚡"),
        ("reminder_create", REMINDER_CREATE_SCHEMA, handle_reminder_create, "⏰"),
        ("reminder_list", REMINDER_LIST_SCHEMA, handle_reminder_list, "📋"),
        ("reminder_cancel", REMINDER_CANCEL_SCHEMA, handle_reminder_cancel, "🗑️"),
        ("reminder_channel_list", REMINDER_CHANNEL_LIST_SCHEMA, handle_reminder_channel_list, "📡"),
        ("reminder_channel_add", REMINDER_CHANNEL_ADD_SCHEMA, handle_reminder_channel_add, "➕")
    ]
    for name, schema, handler, emoji in tools:
        try:
            ctx.register_tool(name, schema, handler, emoji=emoji)
        except Exception:
            pass
