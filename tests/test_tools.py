import sys
sys.path.insert(0, '/root/hermes-reminder-hub/plugins/tools/reminder_tools')
import tools

print("=== 1. 测试 Tool: handle_reminder_channel_list ===")
print(tools.handle_reminder_channel_list())

print("\n=== 2. 测试 Tool: handle_reminder_create (农历九月十八爸妈生日) ===")
res_create = tools.handle_reminder_create(
    title="爸妈生日提醒",
    content="农历九月十八是爸妈生日，记得买礼物发红包！",
    calendar_type="lunar",
    repeat_type="yearly",
    lunar_month=9,
    lunar_day=18,
    time="09:30"
)
print("Tool Create Result:", res_create)

print("\n=== 3. 测试 Tool: handle_reminder_list ===")
print("Tool List Result:", tools.handle_reminder_list())
