import urllib.request
import json
import time

HUB_URL = "http://127.0.0.1:8780"
TOKEN = "hermes_hub_secret_2026"

def req(path, method="GET", body=None):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN}"
    }
    data = json.dumps(body).encode("utf-8") if body else None
    r = urllib.request.Request(f"{HUB_URL}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read().decode("utf-8"))

print("=== 1. 测试查看通道 ===")
channels = req("/api/channels")
print("Channels:", channels)

print("\n=== 2. 测试添加小牛通道 ===")
add_chan = req("/api/channels", "POST", {
    "id": "xiaoniu_wx",
    "name": "小牛VPS微信直通",
    "endpoint_url": "http://198.200.49.120:8765/send",
    "auth_key": "hermes-weixin-direct-key-2024"
})
print("Add Channel Result:", add_chan)

print("\n=== 3. 测试创建公历单次延时提醒 (10秒后) ===")
rem1 = req("/api/reminders", "POST", {
    "title": "测试泡茶",
    "content": "茶泡好了，请及时喝茶！",
    "channel_id": "default_wx",
    "calendar_type": "solar",
    "repeat_type": "once",
    "delay_minutes": 1
})
print("Create Delay Reminder Result:", rem1)

print("\n=== 4. 测试创建农历每年提醒 (如每年八月十五中秋节) ===")
rem_lunar = req("/api/reminders", "POST", {
    "title": "中秋节祝福",
    "content": "祝家人中秋快乐，月圆人团圆！",
    "channel_id": "default_wx",
    "calendar_type": "lunar",
    "repeat_type": "yearly",
    "lunar_month": 8,
    "lunar_day": 15,
    "time": "09:00"
})
print("Create Lunar Reminder Result:", rem_lunar)

print("\n=== 5. 测试创建每周定时提醒 (每周五下午 17:30 发周报) ===")
rem_weekly = req("/api/reminders", "POST", {
    "title": "周报提醒",
    "content": "本周工作即将结束，记得提交周报！",
    "channel_id": "default_wx",
    "calendar_type": "solar",
    "repeat_type": "weekly",
    "weekday": 5,
    "time": "17:30"
})
print("Create Weekly Reminder Result:", rem_weekly)

print("\n=== 6. 查看所有任务列表 ===")
list_res = req("/api/reminders")
print(f"Total Reminders: {len(list_res['reminders'])}")
for r in list_res['reminders']:
    print(f" - [{r['id']}] {r['title']} ({r['calendar_type']}/{r['repeat_type']}) 下次触发: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(r['next_trigger_at']/1000))}")

print("\n=== 7. 测试删除某个提醒 ===")
del_res = req(f"/api/reminders/{rem1['reminder_id']}", "DELETE")
print("Delete Result:", del_res)
