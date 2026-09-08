/**
 * Hermes Reminder Hub - Cloudflare Workers + D1 Serverless Edition
 * 
 * 包含：
 * 1. 静态前端页面托管 (GET / 或 /index.html)
 * 2. 完整 REST API (/api/reminders, /api/channels, /api/templates, /api/send_history, /api/send)
 * 3. 农历/公历高精度双向算法
 * 4. Cron Triggers 每分钟自动轮询与外发
 */

// ==========================================
// 1. 静态单页应用 HTML (iOS 原生质感单页前端)
// ==========================================
const HTML = '<!DOCTYPE html>\n<html lang="zh-CN" class="h-full">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">\n    <meta name="apple-mobile-web-app-capable" content="yes">\n    <meta name="apple-mobile-web-app-status-bar-style" content="default">\n    <meta name="theme-color" content="#ffffff">\n    <title>提醒中枢</title>\n    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>\n    <script src="https://cdn.tailwindcss.com"></script>\n    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>\n    <style>\n        body { \n            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Roboto, sans-serif; \n            -webkit-tap-highlight-color: transparent;\n            touch-action: manipulation;\n            user-select: none;\n        }\n        input, textarea, select {\n            user-select: text;\n        }\n        .safe-top { padding-top: max(0.75rem, env(safe-area-inset-top, 0.75rem)); }\n        .safe-bottom-tab { padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 0.5rem)); }\n        .safe-bottom-content { padding-bottom: max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5rem)); }\n        \n        .glass-header {\n            background: rgba(255, 255, 255, 0.85);\n            backdrop-filter: blur(20px);\n            -webkit-backdrop-filter: blur(20px);\n        }\n        .glass-tabbar {\n            background: rgba(255, 255, 255, 0.92);\n            backdrop-filter: blur(20px);\n            -webkit-backdrop-filter: blur(20px);\n        }\n        \n        .ios-btn-active:active {\n            transform: scale(0.97);\n            opacity: 0.85;\n            transition: transform 0.1s ease;\n        }\n        .ios-card-active:active {\n            transform: scale(0.985);\n            transition: transform 0.12s ease;\n        }\n\n        .wechat-preview-card {\n            background: #ffffff;\n            border-radius: 14px;\n            box-shadow: 0 4px 16px rgba(0,0,0,0.06);\n            padding: 16px;\n            border: 1px solid #f1f5f9;\n        }\n        .wechat-preview-card h3 { font-size: 1.05rem; font-weight: 700; margin-bottom: 8px; color: #0f172a; }\n        .wechat-preview-card blockquote { border-left: 3px solid #4f46e5; padding-left: 10px; color: #475569; font-size: 0.82rem; margin: 8px 0; background: #f8fafc; border-radius: 0 6px 6px 0; padding-top: 4px; padding-bottom: 4px; }\n        .wechat-preview-card hr { margin: 12px 0; border-color: #f1f5f9; }\n        .wechat-preview-card p { line-height: 1.6; font-size: 0.88rem; color: #334155; white-space: pre-wrap; }\n        .wechat-preview-card pre { background: #f1f5f9; padding: 10px; border-radius: 8px; font-size: 0.78rem; overflow-x: auto; margin: 8px 0; }\n        .wechat-preview-card code { font-family: ui-monospace, monospace; background: #f1f5f9; padding: 2px 4px; border-radius: 4px; }\n        .wechat-preview-card em { font-size: 0.72rem; color: #94a3b8; font-style: normal; display: block; margin-top: 4px; }\n        \n        ::-webkit-scrollbar { width: 0px; height: 0px; }\n    </style>\n</head>\n<body class="bg-slate-100/80 text-slate-800 min-h-full flex flex-col antialiased">\n<div id="app" class="flex-1 flex flex-col max-w-lg mx-auto w-full bg-slate-50 min-h-screen shadow-2xl relative">\n\n    <!-- 顶部原生 App 导航栏 (Sticky Header) -->\n    <header class="sticky top-0 z-30 glass-header border-b border-slate-200/70 safe-top px-4 py-2.5 flex items-center justify-between">\n        <div class="flex items-center gap-2.5">\n            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-indigo-200">\n                ⏰\n            </div>\n            <div>\n                <h1 class="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1">\n                    <span>提醒中枢</span>\n                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>\n                </h1>\n                <p class="text-[10px] text-slate-400 font-medium">Hermes Reminder Hub</p>\n            </div>\n        </div>\n\n        <div class="flex items-center gap-1.5">\n            <!-- ⚡ 即时直发快捷按钮 -->\n            <button @click="showDirectSendModal = true" class="ios-btn-active px-3 py-1.5 bg-emerald-500 text-white rounded-full text-xs font-semibold shadow-sm flex items-center gap-1">\n                <span>⚡</span>\n                <span>直发</span>\n            </button>\n            <!-- ➕ 新建提醒按钮 -->\n            <button @click="openAddModal" class="ios-btn-active px-3 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-semibold shadow-sm flex items-center gap-1">\n                <span>➕</span>\n                <span>创建</span>\n            </button>\n        </div>\n    </header>\n\n    <!-- 主滑动内容容器 (Content Area) -->\n    <main class="flex-1 px-3.5 py-4 safe-bottom-content overflow-y-auto space-y-3.5">\n\n        <!-- 1. 定时提醒列表 (Reminders Tab) -->\n        <div v-if="activeTab === \'reminders\'" class="space-y-3">\n            <div class="flex items-center justify-between px-1">\n                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">活跃中的定时任务 ({{ reminders.length }})</span>\n                <button @click="loadData" :disabled="loading" class="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:underline">\n                    <span :class="loading ? \'animate-spin\' : \'\'">🔄</span> 刷新\n                </button>\n            </div>\n\n            <!-- 空状态 -->\n            <div v-if="reminders.length === 0" class="bg-white rounded-2xl border border-slate-200/80 text-center py-16 px-4 shadow-sm">\n                <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-3xl">\n                    📭\n                </div>\n                <h3 class="text-sm font-bold text-slate-700">暂无待触发的提醒</h3>\n                <p class="text-xs text-slate-400 mt-1 max-w-xs mx-auto">点击右上角「创建」添加农历生日、公历周期或通用提醒</p>\n                <button @click="openAddModal" class="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-full hover:bg-indigo-100 transition">\n                    ➕ 立即新建提醒\n                </button>\n            </div>\n\n            <!-- 提醒卡片列表 (支持点击编辑) -->\n            <div v-for="r in reminders" :key="r.id" class="ios-card-active bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 transition flex flex-col justify-between relative overflow-hidden">\n                <!-- 顶部标签栏 -->\n                <div class="flex items-center justify-between gap-2 mb-2">\n                    <div class="flex items-center gap-1.5 flex-wrap">\n                        <span :class="[\'text-[11px] px-2 py-0.5 rounded-full font-bold\', r.calendar_type === \'lunar\' ? \'bg-amber-100 text-amber-800\' : (r.calendar_type === \'solar\' ? \'bg-blue-100 text-blue-800\' : \'bg-slate-100 text-slate-800\')]">\n                            {{ getCategoryBadge(r.calendar_type) }}\n                        </span>\n                        <span class="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-100">\n                            {{ getRepeatLabel(r.repeat_type, r.calendar_type) }}\n                        </span>\n                        <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium truncate max-w-[120px]">\n                            🎨 {{ getTemplateName(r.template_id) }}\n                        </span>\n                    </div>\n\n                    <!-- 操作菜单 (编辑 + 预览 + 删除) -->\n                    <div class="flex items-center gap-1">\n                        <button @click="editReminder(r)" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition" title="编辑修改">\n                            ✏️\n                        </button>\n                        <button @click="previewReminder(r)" class="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition" title="预览卡片">\n                            👁️\n                        </button>\n                        <button @click="deleteReminder(r.id)" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition" title="删除">\n                            🗑️\n                        </button>\n                    </div>\n                </div>\n\n                <!-- 标题与内容 (点击可快捷进入编辑) -->\n                <div @click="editReminder(r)" class="cursor-pointer">\n                    <h3 v-if="r.title" class="text-sm font-bold text-slate-900 mb-1 leading-snug">{{ r.title }}</h3>\n                    <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-2.5">{{ r.content }}</p>\n                </div>\n\n                <!-- 底部元信息与触发时间 -->\n                <div class="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">\n                    <div class="flex items-center gap-1 text-slate-400">\n                        <span>📡</span>\n                        <span class="truncate max-w-[110px]">{{ (r.channel_ids || []).map(getChannelName).join(\', \') }}</span>\n                    </div>\n                    <div class="flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50/80 px-2 py-0.5 rounded-lg">\n                        <span>⏰</span>\n                        <span class="font-mono">{{ formatTimestamp(r.next_trigger_at) }}</span>\n                    </div>\n                </div>\n            </div>\n        </div>\n\n        <!-- 2. 消息模板列表 (Templates Tab) -->\n        <div v-if="activeTab === \'templates\'" class="space-y-3">\n            <div class="flex items-center justify-between px-1">\n                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Markdown 消息模板库 ({{ templates.length }})</span>\n                <button @click="openAddTemplateModal" class="text-xs text-indigo-600 font-bold flex items-center gap-1">\n                    ➕ 新建模板\n                </button>\n            </div>\n\n            <div v-for="t in templates" :key="t.id" class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-2.5">\n                <div class="flex items-center justify-between">\n                    <div class="flex items-center gap-2">\n                        <h3 class="text-sm font-bold text-slate-900">{{ t.name }}</h3>\n                        <span v-if="t.is_default" class="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100">默认</span>\n                    </div>\n                    <span class="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{{ t.type }}</span>\n                </div>\n\n                <pre class="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[11px] text-slate-700 font-mono whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">{{ t.content }}</pre>\n\n                <div class="flex items-center justify-between pt-2 border-t border-slate-100">\n                    <button @click="previewTemplate(t)" class="text-xs text-emerald-600 font-semibold flex items-center gap-1">\n                        <span>👁️</span> 效果预览\n                    </button>\n                    <div class="flex items-center gap-2">\n                        <button @click="editTemplate(t)" class="text-xs text-indigo-600 font-semibold">编辑</button>\n                        <button v-if="!t.id.startsWith(\'tpl_standard\') && !t.id.startsWith(\'tpl_direct\')" @click="deleteTemplate(t.id)" class="text-xs text-rose-500 font-semibold">删除</button>\n                    </div>\n                </div>\n            </div>\n        </div>\n\n        <!-- 3. 通知通道列表 (Channels Tab) -->\n        <div v-if="activeTab === \'channels\'" class="space-y-3">\n            <div class="flex items-center justify-between px-1">\n                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">已连接终端通道 ({{ channels.length }})</span>\n                <button @click="showAddChannelModal = true" class="text-xs text-indigo-600 font-bold flex items-center gap-1">\n                    ➕ 挂载新通道\n                </button>\n            </div>\n\n            <div v-for="c in channels" :key="c.id" class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-2">\n                <div class="flex items-center justify-between">\n                    <div class="flex items-center gap-2">\n                        <div class="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">\n                            📡\n                        </div>\n                        <div>\n                            <h3 class="text-sm font-bold text-slate-900 leading-none">{{ c.name }}</h3>\n                            <span class="text-[10px] font-mono text-slate-400">{{ c.id }}</span>\n                        </div>\n                    </div>\n                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-200">\n                        {{ c.enabled ? \'正常连通\' : \'已停用\' }}\n                    </span>\n                </div>\n\n                <div class="text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded-xl border border-slate-100 break-all">\n                    URL: {{ c.endpoint_url }}\n                </div>\n            </div>\n        </div>\n\n        <!-- 4. 发送历史列表 (Send History Tab) -->\n        <div v-if="activeTab === \'history\'" class="space-y-3">\n            <div class="flex items-center justify-between px-1 mb-3">\n                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">最近 {{ sendHistory.length }} 条发送记录</span>\n                <button @click="loadSendHistory()" class="text-xs text-indigo-600 font-bold flex items-center gap-1">\n                    🔄 刷新\n                </button>\n            </div>\n\n            <div v-if="sendHistoryLoading" class="flex justify-center py-12">\n                <div class="flex flex-col items-center gap-3">\n                    <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>\n                    <span class="text-xs text-slate-400">加载中...</span>\n                </div>\n            </div>\n\n            <div v-else-if="sendHistory.length === 0" class="flex flex-col items-center justify-center py-16 text-slate-400">\n                <div class="text-5xl mb-3 opacity-30">📭</div>\n                <p class="text-sm font-medium">暂无发送记录</p>\n                <p class="text-xs mt-1 opacity-70">定时提醒触发或直发后，记录将在这里显示</p>\n            </div>\n\n            <div v-else class="space-y-2">\n                <div v-for="item in sendHistory" :key="item.id" class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-2">\n                    <!-- 头部：状态 + 时间 + 通道 -->\n                    <div class="flex items-center justify-between">\n                        <div class="flex items-center gap-2">\n                            <span :class="[\'w-6 h-6 rounded-full flex items-center justify-center text-xs\', \n                                item.status === \'success\' ? \'bg-emerald-100 text-emerald-600\' :\n                                item.status === \'failed\' ? \'bg-red-100 text-red-600\' :\n                                \'bg-slate-100 text-slate-500\']">\n                                {{ item.status === \'success\' ? \'✓\' : item.status === \'failed\' ? \'✗\' : \'⏸\' }}\n                            </span>\n                            <span class="text-xs font-bold text-slate-700">{{ item.channel_name || item.channel_id }}</span>\n                        </div>\n                        <span class="text-[10px] text-slate-400">{{ formatRelativeTime(item.delivered_at) }}</span>\n                    </div>\n\n                    <!-- 消息内容预览 -->\n                    <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 whitespace-pre-wrap max-h-24 overflow-y-auto border border-slate-100">\n                        {{ item.message || \'(无内容记录)\' }}\n                    </div>\n\n                    <!-- 操作按钮 -->\n                    <div class="flex items-center gap-2 pt-1">\n                        <button v-if="item.message" @click="previewFromHistory(item)" class="flex-1 text-xs text-indigo-600 font-bold py-1.5 rounded-lg bg-indigo-50 active:bg-indigo-100 transition">\n                            👁️ 预览微信卡片\n                        </button>\n                        <button @click="copyMessage(item.message)" class="px-3 text-xs text-slate-500 py-1.5 rounded-lg bg-slate-50 active:bg-slate-100 transition">\n                            📋 复制\n                        </button>\n                    </div>\n                </div>\n            </div>\n        </div>\n\n    </main>\n\n    <!-- 底部原生 iOS TabBar (Fixed Bottom Navigation) -->\n    <nav class="fixed bottom-0 left-0 right-0 z-30 glass-tabbar border-t border-slate-200/60 safe-bottom-tab max-w-lg mx-auto">\n        <div class="grid grid-cols-4 py-1 text-center">\n            <button @click="activeTab = \'reminders\'" :class="[\'ios-btn-active py-1 flex flex-col items-center justify-center transition\', activeTab === \'reminders\' ? \'text-indigo-600 font-bold\' : \'text-slate-400\']">\n                <span class="text-lg leading-tight mb-0.5">📅</span>\n                <span class="text-[10px]">定时提醒</span>\n            </button>\n            <button @click="activeTab = \'templates\'" :class="[\'ios-btn-active py-1 flex flex-col items-center justify-center transition\', activeTab === \'templates\' ? \'text-indigo-600 font-bold\' : \'text-slate-400\']">\n                <span class="text-lg leading-tight mb-0.5">🎨</span>\n                <span class="text-[10px]">消息模板</span>\n            </button>\n            <button @click="activeTab = \'history\'" :class="[\'ios-btn-active py-1 flex flex-col items-center justify-center transition\', activeTab === \'history\' ? \'text-indigo-600 font-bold\' : \'text-slate-400\']">\n                <span class="text-lg leading-tight mb-0.5">📜</span>\n                <span class="text-[10px]">发送历史</span>\n            </button>\n            <button @click="activeTab = \'channels\'" :class="[\'ios-btn-active py-1 flex flex-col items-center justify-center transition\', activeTab === \'channels\' ? \'text-indigo-600 font-bold\' : \'text-slate-400\']">\n                <span class="text-lg leading-tight mb-0.5">📡</span>\n                <span class="text-[10px]">通知通道</span>\n            </button>\n        </div>\n    </nav>\n\n    <!-- 弹窗 1：主表单 - 新建/编辑提醒抽屉 (Create / Edit Reminder Sheet) -->\n    <div v-if="showAddModal" class="fixed inset-0 bg-black/60 z-40 flex items-end justify-center backdrop-blur-xs transition-opacity animate-fade-in">\n        <div class="bg-white w-full rounded-t-3xl max-h-[92vh] flex flex-col p-5 shadow-2xl safe-bottom-tab overflow-hidden animate-slide-up">\n            <div class="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>\n\n            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">\n                <h2 class="text-base font-bold text-slate-900 flex items-center gap-1.5">\n                    <span>{{ isEditingReminder ? \'✏️\' : \'⏰\' }}</span>\n                    <span>{{ isEditingReminder ? \'编辑定时提醒\' : \'新建智能提醒\' }}</span>\n                </h2>\n                <button @click="showAddModal = false" class="text-slate-400 hover:text-slate-600 p-1 text-base">✕</button>\n            </div>\n\n            <div class="flex-1 overflow-y-auto space-y-3.5 pr-0.5">\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">标题（可选）</label>\n                    <input v-model="form.title" type="text" placeholder="例如：爸妈生日 / 信用卡还款 / 初一吃素" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white">\n                </div>\n\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">提醒正文内容（必填）</label>\n                    <textarea v-model="form.content" placeholder="输入要推送到微信的提醒正文..." class="w-full border border-slate-300 rounded-xl p-3 text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"></textarea>\n                </div>\n\n                <!-- 调度配置入口卡片 -->\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">时间与历法调度规则</label>\n                    <div @click="showScheduleModal = true" class="flex items-center justify-between p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl cursor-pointer hover:bg-indigo-100/60 transition active:scale-[0.98]">\n                        <div class="flex items-center gap-2.5">\n                            <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-sm">\n                                {{ getCategoryIcon(form.calendar_type) }}\n                            </div>\n                            <div>\n                                <div class="text-xs sm:text-sm font-bold text-indigo-950">{{ scheduleSummary.title }}</div>\n                                <div class="text-[11px] text-indigo-700/80 mt-0.5">{{ scheduleSummary.desc }}</div>\n                            </div>\n                        </div>\n                        <span class="text-xs font-bold text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded-xl shadow-xs">\n                            更改 ❯\n                        </span>\n                    </div>\n                </div>\n\n                <!-- 模板选择 -->\n                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">\n                    <div>\n                        <div class="flex items-center justify-between mb-1">\n                            <label class="text-xs font-bold text-slate-700">排版模板</label>\n                            <button type="button" @click="previewSelectedTemplate(form.template_id)" class="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5">\n                                <span>👁️</span> 预览选中的模板\n                            </button>\n                        </div>\n                        <select v-model="form.template_id" class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm outline-none bg-white">\n                            <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>\n                        </select>\n                    </div>\n                    <div>\n                        <label class="block text-xs font-bold text-slate-700 mb-1">已选目标通道 ({{ form.channel_ids.length }}个)</label>\n                        <div class="text-xs text-indigo-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 truncate">\n                            {{ (form.channel_ids || []).map(getChannelName).join(\', \') || \'未选择通道\' }}\n                        </div>\n                    </div>\n                </div>\n\n                <!-- 通道勾选 -->\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1.5">广播通道勾选</label>\n                    <div class="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">\n                        <label v-for="c in channels" :key="c.id" class="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer text-xs">\n                            <input type="checkbox" :value="c.id" v-model="form.channel_ids" class="w-4 h-4 text-indigo-600 rounded border-slate-300">\n                            <span class="font-medium text-slate-800 truncate">{{ c.name }}</span>\n                        </label>\n                    </div>\n                </div>\n            </div>\n\n            <!-- 底部操作按钮 -->\n            <div class="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">\n                <button @click="openFormPreview" class="ios-btn-active px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl flex items-center gap-1">\n                    <span>👁️</span> 预览卡片\n                </button>\n                <div class="flex gap-2">\n                    <button @click="showAddModal = false" class="px-4 py-2 text-xs text-slate-600 rounded-xl font-medium">取消</button>\n                    <button @click="saveReminder" :disabled="submitting" class="ios-btn-active px-5 py-2 text-xs bg-indigo-600 text-white font-bold rounded-xl shadow-md">\n                        {{ submitting ? \'保存中...\' : (isEditingReminder ? \'保存修改\' : \'确认创建\') }}\n                    </button>\n                </div>\n            </div>\n        </div>\n    </div>\n\n    <!-- 弹窗 2：调度配置独立子弹窗 (通用/农历/公历三列平级架构) -->\n    <div v-if="showScheduleModal" class="fixed inset-0 bg-black/70 z-50 flex items-end justify-center backdrop-blur-xs animate-fade-in">\n        <div class="bg-white w-full rounded-t-3xl max-h-[90vh] flex flex-col p-5 shadow-2xl safe-bottom-tab overflow-hidden animate-slide-up">\n            <div class="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>\n\n            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">\n                <h2 class="text-base font-bold text-slate-900 flex items-center gap-1.5">\n                    <span>🗓️</span>\n                    <span>配置时间与调度模式</span>\n                </h2>\n                <button @click="showScheduleModal = false" class="text-slate-400 p-1 text-base">✕</button>\n            </div>\n\n            <div class="flex-1 overflow-y-auto space-y-4">\n                <!-- 1. 调度体系三列并列选择：通用 / 农历 / 公历 -->\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1.5">1. 选择调度模式</label>\n                    <div class="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">\n                        <!-- 通用 (每日/每周/单次延时) -->\n                        <button @click="scheduleDraft.calendar_type = \'common\'; scheduleDraft.repeat_type = \'daily\'" :class="[\'py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1\', scheduleDraft.calendar_type === \'common\' ? \'bg-white text-indigo-600 shadow-sm\' : \'text-slate-600\']">\n                            <span>⚡</span>\n                            <span>通用</span>\n                        </button>\n                        <!-- 农历体系 (农历每年/农历每月) -->\n                        <button @click="scheduleDraft.calendar_type = \'lunar\'; scheduleDraft.repeat_type = \'yearly\'" :class="[\'py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1\', scheduleDraft.calendar_type === \'lunar\' ? \'bg-white text-amber-700 shadow-sm\' : \'text-slate-600\']">\n                            <span>🏮</span>\n                            <span>农历</span>\n                        </button>\n                        <!-- 公历体系 (公历每年/公历每月) -->\n                        <button @click="scheduleDraft.calendar_type = \'solar\'; scheduleDraft.repeat_type = \'yearly\'" :class="[\'py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1\', scheduleDraft.calendar_type === \'solar\' ? \'bg-white text-blue-700 shadow-sm\' : \'text-slate-600\']">\n                            <span>☀️</span>\n                            <span>公历</span>\n                        </button>\n                    </div>\n                </div>\n\n                <!-- 2. 分类下的专属周期规则 -->\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1.5">2. 选择重复周期规则</label>\n                    \n                    <!-- 1. 通用分类 (每日、每周几、单次倒计时) -->\n                    <div v-if="scheduleDraft.calendar_type === \'common\'" class="grid grid-cols-3 gap-2">\n                        <div @click="scheduleDraft.repeat_type = \'daily\'" :class="[\'p-2.5 rounded-xl border text-center cursor-pointer transition\', scheduleDraft.repeat_type === \'daily\' ? \'border-indigo-600 bg-indigo-50 font-bold text-indigo-900\' : \'border-slate-200 bg-white\']">\n                            <div class="text-xs font-bold">🌅 每日重复</div>\n                            <div class="text-[10px] text-slate-400">每天固定时间</div>\n                        </div>\n                        <div @click="scheduleDraft.repeat_type = \'weekly\'" :class="[\'p-2.5 rounded-xl border text-center cursor-pointer transition\', scheduleDraft.repeat_type === \'weekly\' ? \'border-indigo-600 bg-indigo-50 font-bold text-indigo-900\' : \'border-slate-200 bg-white\']">\n                            <div class="text-xs font-bold">📅 每周几</div>\n                            <div class="text-[10px] text-slate-400">固定周几触发</div>\n                        </div>\n                        <div @click="scheduleDraft.repeat_type = \'once\'" :class="[\'p-2.5 rounded-xl border text-center cursor-pointer transition\', scheduleDraft.repeat_type === \'once\' ? \'border-indigo-600 bg-indigo-50 font-bold text-indigo-900\' : \'border-slate-200 bg-white\']">\n                            <div class="text-xs font-bold">⏱️ 单次倒计时</div>\n                            <div class="text-[10px] text-slate-400">延迟N分钟/指定</div>\n                        </div>\n                    </div>\n\n                    <!-- 2. 农历分类 (农历每年几月几号、农历每月几号) -->\n                    <div v-else-if="scheduleDraft.calendar_type === \'lunar\'" class="grid grid-cols-2 gap-2">\n                        <div @click="scheduleDraft.repeat_type = \'yearly\'" :class="[\'p-3 rounded-xl border text-center cursor-pointer transition\', scheduleDraft.repeat_type === \'yearly\' ? \'border-amber-600 bg-amber-50 font-bold text-amber-900\' : \'border-slate-200 bg-white\']">\n                            <div class="text-xs sm:text-sm font-bold">🏮 农历每年几月几号</div>\n                            <div class="text-[10px] text-amber-600 font-normal mt-0.5">如农历生日/中秋节/春节</div>\n                        </div>\n                        <div @click="scheduleDraft.repeat_type = \'monthly\'" :class="[\'p-3 rounded-xl border text-center cursor-pointer transition\', scheduleDraft.repeat_type === \'monthly\' ? \'border-amber-600 bg-amber-50 font-bold text-amber-900\' : \'border-slate-200 bg-white\']">\n                            <div class="text-xs sm:text-sm font-bold">🌙 农历每月几号</div>\n                            <div class="text-[10px] text-amber-600 font-normal mt-0.5">如每月初一/十五吃素</div>\n                        </div>\n                    </div>\n\n                    <!-- 3. 公历分类 (公历每年几月几号、公历每月几号) -->\n                    <div v-else class="grid grid-cols-2 gap-2">\n                        <div @click="scheduleDraft.repeat_type = \'yearly\'" :class="[\'p-3 rounded-xl border text-center cursor-pointer transition\', scheduleDraft.repeat_type === \'yearly\' ? \'border-blue-600 bg-blue-50 font-bold text-blue-900\' : \'border-slate-200 bg-white\']">\n                            <div class="text-xs sm:text-sm font-bold">🎂 公历每年几月几号</div>\n                            <div class="text-[10px] text-blue-600 font-normal mt-0.5">如公历生日/结婚纪念日</div>\n                        </div>\n                        <div @click="scheduleDraft.repeat_type = \'monthly\'" :class="[\'p-3 rounded-xl border text-center cursor-pointer transition\', scheduleDraft.repeat_type === \'monthly\' ? \'border-blue-600 bg-blue-50 font-bold text-blue-900\' : \'border-slate-200 bg-white\']">\n                            <div class="text-xs sm:text-sm font-bold">🗓️ 公历每月几号</div>\n                            <div class="text-[10px] text-blue-600 font-normal mt-0.5">如每月10号还信用卡/房租</div>\n                        </div>\n                    </div>\n                </div>\n\n                <!-- 3. 对应参数输入 -->\n                <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">\n                    <!-- 通用参数 -->\n                    <template v-if="scheduleDraft.calendar_type === \'common\'">\n                        <div v-if="scheduleDraft.repeat_type === \'daily\'" class="flex items-center justify-between gap-2">\n                            <span class="text-xs font-bold text-slate-700">每天提醒时间点 (北京时间)</span>\n                            <input v-model="scheduleDraft.time" type="time" class="border border-slate-300 rounded-xl px-3 py-1.5 text-sm bg-white font-mono">\n                        </div>\n\n                        <div v-if="scheduleDraft.repeat_type === \'weekly\'" class="grid grid-cols-2 gap-2">\n                            <div>\n                                <label class="block text-xs font-bold text-slate-700 mb-1">选择周几</label>\n                                <select v-model.number="scheduleDraft.weekday" class="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm bg-white">\n                                    <option :value="1">周一</option>\n                                    <option :value="2">周二</option>\n                                    <option :value="3">周三</option>\n                                    <option :value="4">周四</option>\n                                    <option :value="5">周五</option>\n                                    <option :value="6">周六</option>\n                                    <option :value="0">周日</option>\n                                </select>\n                            </div>\n                            <div>\n                                <label class="block text-xs font-bold text-slate-700 mb-1">时间</label>\n                                <input v-model="scheduleDraft.time" type="time" class="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm bg-white font-mono">\n                            </div>\n                        </div>\n\n                        <div v-if="scheduleDraft.repeat_type === \'once\'" class="space-y-2">\n                            <div>\n                                <label class="block text-xs font-bold text-slate-700 mb-1">相对延迟 (分钟)</label>\n                                <input v-model.number="scheduleDraft.delay_minutes" type="number" placeholder="如 15 (15分钟后触发)" class="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm bg-white">\n                            </div>\n                            <div>\n                                <label class="block text-xs font-bold text-slate-700 mb-1">或指定具体日期时间</label>\n                                <input v-model="scheduleDraft.run_at" type="datetime-local" class="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm bg-white font-mono">\n                            </div>\n                        </div>\n                    </template>\n\n                    <!-- 农历参数 -->\n                    <template v-else-if="scheduleDraft.calendar_type === \'lunar\'">\n                        <div v-if="scheduleDraft.repeat_type === \'yearly\'" class="grid grid-cols-3 gap-2">\n                            <div>\n                                <label class="block text-xs font-bold text-amber-900 mb-1">农历月份</label>\n                                <input v-model.number="scheduleDraft.lunar_month" type="number" min="1" max="12" placeholder="如 9" class="w-full border border-amber-300 rounded-xl px-2 py-1.5 text-xs bg-white">\n                            </div>\n                            <div>\n                                <label class="block text-xs font-bold text-amber-900 mb-1">农历日期</label>\n                                <input v-model.number="scheduleDraft.lunar_day" type="number" min="1" max="30" placeholder="如 18" class="w-full border border-amber-300 rounded-xl px-2 py-1.5 text-xs bg-white">\n                            </div>\n                            <div>\n                                <label class="block text-xs font-bold text-amber-900 mb-1">时间</label>\n                                <input v-model="scheduleDraft.time" type="time" class="w-full border border-amber-300 rounded-xl px-2 py-1.5 text-xs bg-white font-mono">\n                            </div>\n                        </div>\n\n                        <div v-if="scheduleDraft.repeat_type === \'monthly\'" class="grid grid-cols-2 gap-2">\n                            <div>\n                                <label class="block text-xs font-bold text-amber-900 mb-1">农历几号 (1-30)</label>\n                                <input v-model.number="scheduleDraft.lunar_day" type="number" min="1" max="30" placeholder="如 15 (每月十五)" class="w-full border border-amber-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm bg-white">\n                            </div>\n                            <div>\n                                <label class="block text-xs font-bold text-amber-900 mb-1">时间</label>\n                                <input v-model="scheduleDraft.time" type="time" class="w-full border border-amber-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm bg-white font-mono">\n                            </div>\n                        </div>\n                    </template>\n\n                    <!-- 公历参数 -->\n                    <template v-else>\n                        <div v-if="scheduleDraft.repeat_type === \'yearly\'" class="grid grid-cols-3 gap-2">\n                            <div>\n                                <label class="block text-xs font-bold text-blue-900 mb-1">公历月份</label>\n                                <input v-model.number="scheduleDraft.yearly_month" type="number" min="1" max="12" placeholder="如 10" class="w-full border border-blue-300 rounded-xl px-2 py-1.5 text-xs bg-white">\n                            </div>\n                            <div>\n                                <label class="block text-xs font-bold text-blue-900 mb-1">公历日期</label>\n                                <input v-model.number="scheduleDraft.yearly_day" type="number" min="1" max="31" placeholder="如 27" class="w-full border border-blue-300 rounded-xl px-2 py-1.5 text-xs bg-white">\n                            </div>\n                            <div>\n                                <label class="block text-xs font-bold text-blue-900 mb-1">时间</label>\n                                <input v-model="scheduleDraft.time" type="time" class="w-full border border-blue-300 rounded-xl px-2 py-1.5 text-xs bg-white font-mono">\n                            </div>\n                        </div>\n\n                        <div v-if="scheduleDraft.repeat_type === \'monthly\'" class="grid grid-cols-2 gap-2">\n                            <div>\n                                <label class="block text-xs font-bold text-blue-900 mb-1">公历几号 (1-31)</label>\n                                <input v-model.number="scheduleDraft.monthly_day" type="number" min="1" max="31" placeholder="如 10" class="w-full border border-blue-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm bg-white">\n                            </div>\n                            <div>\n                                <label class="block text-xs font-bold text-blue-900 mb-1">时间</label>\n                                <input v-model="scheduleDraft.time" type="time" class="w-full border border-blue-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm bg-white font-mono">\n                            </div>\n                        </div>\n                    </template>\n                </div>\n            </div>\n\n            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2">\n                <button @click="showScheduleModal = false" class="px-4 py-2 text-xs text-slate-600 rounded-xl">取消</button>\n                <button @click="applyScheduleDraft" class="ios-btn-active px-5 py-2 text-xs bg-indigo-600 text-white font-bold rounded-xl shadow-md">保存调度</button>\n            </div>\n        </div>\n    </div>\n\n    <!-- 弹窗 3：即时直发抽屉 (Direct Send Sheet) -->\n    <div v-if="showDirectSendModal" class="fixed inset-0 bg-black/60 z-40 flex items-end justify-center backdrop-blur-xs animate-fade-in">\n        <div class="bg-white w-full rounded-t-3xl max-h-[85vh] flex flex-col p-5 shadow-2xl safe-bottom-tab overflow-hidden animate-slide-up">\n            <div class="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>\n\n            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">\n                <h2 class="text-base font-bold text-slate-900 flex items-center gap-1.5">\n                    <span>⚡</span>\n                    <span>即时直发消息</span>\n                </h2>\n                <button @click="showDirectSendModal = false" class="text-slate-400 p-1 text-base">✕</button>\n            </div>\n\n            <div class="space-y-3.5 overflow-y-auto pr-0.5">\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">直发正文内容</label>\n                    <textarea v-model="directSendForm.message" placeholder="输入要立即推送到微信的消息内容..." class="w-full border border-slate-300 rounded-xl p-3 text-sm h-28 resize-none outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"></textarea>\n                </div>\n\n                <div>\n                    <div class="flex items-center justify-between mb-1">\n                        <label class="text-xs font-bold text-slate-700">排版模板</label>\n                        <button type="button" @click="previewSelectedTemplate(directSendForm.template_id)" class="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5">\n                            <span>👁️</span> 预览选中的模板\n                        </button>\n                    </div>\n                    <select v-model="directSendForm.template_id" class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm outline-none bg-white">\n                        <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>\n                    </select>\n                </div>\n\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">目标通道勾选</label>\n                    <div class="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">\n                        <label v-for="c in channels" :key="c.id" class="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer text-xs">\n                            <input type="checkbox" :value="c.id" v-model="directSendForm.channel_ids" class="w-4 h-4 text-emerald-600 rounded">\n                            <span class="font-medium text-slate-800 truncate">{{ c.name }}</span>\n                        </label>\n                    </div>\n                </div>\n            </div>\n\n            <div class="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">\n                <button @click="openDirectPreview" class="ios-btn-active px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl flex items-center gap-1">\n                    <span>👁️</span> 预览卡片\n                </button>\n                <div class="flex gap-2">\n                    <button @click="showDirectSendModal = false" class="px-4 py-2 text-xs text-slate-600 rounded-xl">取消</button>\n                    <button @click="sendDirectNow" :disabled="sendingDirect" class="ios-btn-active px-5 py-2 text-xs bg-emerald-600 text-white font-bold rounded-xl shadow-md flex items-center gap-1">\n                        <span>⚡</span>\n                        <span>{{ sendingDirect ? \'发送中...\' : \'立即直发\' }}</span>\n                    </button>\n                </div>\n            </div>\n        </div>\n    </div>\n\n    <!-- 弹窗 4：微信风格卡片实时渲染预览 (WeChat Live Card Preview) -->\n    <div v-if="showPreviewModal" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">\n        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-5 flex flex-col max-h-[85vh]">\n            <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">\n                <div class="flex items-center gap-1.5">\n                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>\n                    <h2 class="text-sm font-bold text-slate-900">微信卡片渲染效果预览</h2>\n                </div>\n                <button @click="showPreviewModal = false" class="text-slate-400 p-1 text-sm">✕</button>\n            </div>\n\n            <div class="flex-1 overflow-y-auto my-1 p-3 bg-slate-100 rounded-2xl border border-slate-200/80">\n                <div class="wechat-preview-card" v-html="previewHtml"></div>\n            </div>\n\n            <div class="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">\n                <span class="text-[10px] text-slate-400">所见即所得 · 原生微信排版</span>\n                <button @click="showPreviewModal = false" class="ios-btn-active px-4 py-1.5 text-xs bg-slate-900 text-white font-bold rounded-full">\n                    关闭\n                </button>\n            </div>\n        </div>\n    </div>\n\n    <!-- 弹窗 5：模板编辑抽屉 -->\n    <div v-if="showTemplateModal" class="fixed inset-0 bg-black/60 z-40 flex items-end justify-center backdrop-blur-xs animate-fade-in">\n        <div class="bg-white w-full rounded-t-3xl max-h-[90vh] flex flex-col p-5 shadow-2xl safe-bottom-tab overflow-hidden animate-slide-up">\n            <div class="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>\n\n            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">\n                <h2 class="text-base font-bold text-slate-900">{{ templateForm.id ? \'编辑消息模板\' : \'新建消息模板\' }}</h2>\n                <button @click="showTemplateModal = false" class="text-slate-400 p-1 text-base">✕</button>\n            </div>\n\n            <div class="space-y-3 overflow-y-auto pr-0.5">\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">模板名称</label>\n                    <input v-model="templateForm.name" type="text" placeholder="例如：重点事项提醒卡片" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white">\n                </div>\n\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">模板类型</label>\n                    <select v-model="templateForm.type" class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white">\n                        <option value="reminder">定时提醒</option>\n                        <option value="direct">即时直发</option>\n                        <option value="all">通用</option>\n                    </select>\n                </div>\n\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">Markdown 格式模板</label>\n                    <textarea v-model="templateForm.content" placeholder="输入 Markdown 内容模板..." class="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono h-40 resize-none bg-slate-50 focus:bg-white"></textarea>\n                </div>\n            </div>\n\n            <div class="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">\n                <button @click="previewTemplateDraft" class="ios-btn-active px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl flex items-center gap-1">\n                    <span>👁️</span> 预览模板\n                </button>\n                <div class="flex gap-2">\n                    <button @click="showTemplateModal = false" class="px-4 py-2 text-xs text-slate-600 rounded-xl">取消</button>\n                    <button @click="saveTemplate" class="ios-btn-active px-5 py-2 text-xs bg-indigo-600 text-white font-bold rounded-xl shadow-md">保存模板</button>\n                </div>\n            </div>\n        </div>\n    </div>\n\n    <!-- 弹窗 6：挂载通道抽屉 -->\n    <div v-if="showAddChannelModal" class="fixed inset-0 bg-black/60 z-40 flex items-end justify-center backdrop-blur-xs animate-fade-in">\n        <div class="bg-white w-full rounded-t-3xl max-h-[85vh] flex flex-col p-5 shadow-2xl safe-bottom-tab overflow-hidden animate-slide-up">\n            <div class="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>\n\n            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">\n                <h2 class="text-base font-bold text-slate-900">挂载新通知通道</h2>\n                <button @click="showAddChannelModal = false" class="text-slate-400 p-1 text-base">✕</button>\n            </div>\n\n            <div class="space-y-3 overflow-y-auto pr-0.5">\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">通道 ID (唯一)</label>\n                    <input v-model="channelForm.id" type="text" placeholder="例如 xiaoniu_wx" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white">\n                </div>\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">通道名称</label>\n                    <input v-model="channelForm.name" type="text" placeholder="例如 小牛VPS微信直通" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white">\n                </div>\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">接口 URL</label>\n                    <input v-model="channelForm.endpoint_url" type="text" placeholder="例如 http://198.200.49.120:8765/send" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white">\n                </div>\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">Token 密钥 (可选)</label>\n                    <input v-model="channelForm.auth_key" type="text" placeholder="通信鉴权密钥" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white">\n                </div>\n            </div>\n\n            <div class="flex justify-end gap-2 pt-3 mt-3 border-t border-slate-100">\n                <button @click="showAddChannelModal = false" class="px-4 py-2 text-xs text-slate-600 rounded-xl">取消</button>\n                <button @click="saveChannel" class="ios-btn-active px-5 py-2 text-xs bg-slate-900 text-white font-bold rounded-xl shadow-md">保存通道</button>\n            </div>\n        </div>\n    </div>\n\n</div>\n\n<script>\nconst { createApp, ref, computed, onMounted } = Vue;\n\ncreateApp({\n    setup() {\n        const activeTab = ref(\'reminders\');\n        const reminders = ref([]);\n        const sendHistory = ref([]);\n        const sendHistoryLoading = ref(false);\n        const channels = ref([]);\n        const templates = ref([]);\n        const loading = ref(false);\n        const showAddModal = ref(false);\n        const showScheduleModal = ref(false);\n        const showPreviewModal = ref(false);\n        const showAddChannelModal = ref(false);\n        const showDirectSendModal = ref(false);\n        const showTemplateModal = ref(false);\n        const isEditingReminder = ref(false);\n        const submitting = ref(false);\n        const sendingDirect = ref(false);\n        const previewHtml = ref(\'\');\n\n        const form = ref({\n            id: \'\',\n            title: \'\',\n            content: \'\',\n            calendar_type: \'common\',\n            repeat_type: \'daily\',\n            template_id: \'tpl_standard\',\n            channel_ids: [\'default_wx\'],\n            time: \'09:00\',\n            weekday: 5,\n            monthly_day: 10,\n            yearly_month: 10,\n            yearly_day: 27,\n            lunar_month: 9,\n            lunar_day: 18,\n            delay_minutes: 15,\n            run_at: \'\'\n        });\n\n        // 调度配置子弹窗暂存状态 (三列体系: common | lunar | solar)\n        const scheduleDraft = ref({\n            calendar_type: \'common\',\n            repeat_type: \'daily\',\n            time: \'09:00\',\n            weekday: 5,\n            monthly_day: 10,\n            yearly_month: 10,\n            yearly_day: 27,\n            lunar_month: 9,\n            lunar_day: 18,\n            delay_minutes: 15,\n            run_at: \'\'\n        });\n\n        const directSendForm = ref({\n            message: \'\',\n            template_id: \'tpl_direct_default\',\n            channel_ids: [\'default_wx\']\n        });\n\n        const templateForm = ref({\n            id: \'\',\n            name: \'\',\n            type: \'reminder\',\n            content: \'\'\n        });\n\n        const channelForm = ref({\n            id: \'\',\n            name: \'\',\n            endpoint_url: \'\',\n            auth_key: \'hermes-weixin-direct-key-2024\'\n        });\n\n        // 计算当前主表单的调度规则摘要\n        const scheduleSummary = computed(() => {\n            const f = form.value;\n            if (f.calendar_type === \'lunar\') {\n                if (f.repeat_type === \'yearly\') {\n                    return { title: `🏮 农历每年 ${f.lunar_month || 1}月${f.lunar_day || 1}日 ${f.time || \'09:00\'}`, desc: \'每年农历特定日期触发（如生日/传统节日）\' };\n                } else {\n                    return { title: `🌙 农历每月 ${f.lunar_day || 1}日 ${f.time || \'09:00\'}`, desc: \'每月农历特定日期触发（如初一/十五吃素）\' };\n                }\n            } else if (f.calendar_type === \'solar\') {\n                if (f.repeat_type === \'yearly\') {\n                    return { title: `🎂 公历每年 ${f.yearly_month || 1}月${f.yearly_day || 1}日 ${f.time || \'09:00\'}`, desc: \'每年公历纪念日触发\' };\n                } else {\n                    return { title: `🗓️ 公历每月 ${f.monthly_day || 1}号 ${f.time || \'09:00\'}`, desc: \'每月公历指定日期触发（如还款/交租）\' };\n                }\n            } else {\n                if (f.repeat_type === \'daily\') {\n                    return { title: `🌅 每日固定 ${f.time || \'09:00\'}`, desc: \'每天指定时间点触发\' };\n                } else if (f.repeat_type === \'weekly\') {\n                    const wMap = [\'周日\', \'周一\', \'周二\', \'周三\', \'周四\', \'周五\', \'周六\'];\n                    return { title: `📅 每周${wMap[f.weekday] || \'五\'} ${f.time || \'09:00\'}`, desc: \'每周固定周几触发\' };\n                } else {\n                    return { title: `⏱️ 单次延时 (${f.delay_minutes || 15}分钟后)`, desc: \'倒计时单次触发\' };\n                }\n            }\n        });\n\n        const getCategoryIcon = (cal) => {\n            if (cal === \'lunar\') return \'🏮\';\n            if (cal === \'solar\') return \'☀️\';\n            return \'⚡\';\n        };\n\n        const getCategoryBadge = (cal) => {\n            if (cal === \'lunar\') return \'🏮 农历\';\n            if (cal === \'solar\') return \'☀️ 公历\';\n            return \'⚡ 通用\';\n        };\n\n        const openAddModal = () => {\n            isEditingReminder.value = false;\n            form.value = {\n                id: \'\',\n                title: \'\',\n                content: \'\',\n                calendar_type: \'common\',\n                repeat_type: \'daily\',\n                template_id: templates.value[0]?.id || \'tpl_standard\',\n                channel_ids: channels.value.length > 0 ? [channels.value[0].id] : [\'default_wx\'],\n                time: \'09:00\',\n                weekday: 5,\n                monthly_day: 10,\n                yearly_month: 10,\n                yearly_day: 27,\n                lunar_month: 9,\n                lunar_day: 18,\n                delay_minutes: 15,\n                run_at: \'\'\n            };\n            scheduleDraft.value = { ...form.value };\n            showAddModal.value = true;\n        };\n\n        // 编辑已有提醒任务\n        const editReminder = (r) => {\n            isEditingReminder.value = true;\n            let rule = {};\n            try {\n                rule = JSON.parse(r.rule_detail || \'{}\');\n            } catch (e) {}\n\n            form.value = {\n                id: r.id,\n                title: r.title || \'\',\n                content: r.content || \'\',\n                calendar_type: r.calendar_type || \'common\',\n                repeat_type: r.repeat_type || \'daily\',\n                template_id: r.template_id || \'tpl_standard\',\n                channel_ids: r.channel_ids || [\'default_wx\'],\n                time: rule.time || \'09:00\',\n                weekday: rule.weekday !== undefined ? rule.weekday : 5,\n                monthly_day: rule.monthly_day || 10,\n                yearly_month: rule.yearly_month || 10,\n                yearly_day: rule.yearly_day || 27,\n                lunar_month: rule.lunar_month || 9,\n                lunar_day: rule.lunar_day || 18,\n                delay_minutes: rule.delay_minutes || 15,\n                run_at: rule.run_at || \'\'\n            };\n\n            scheduleDraft.value = { ...form.value };\n            showAddModal.value = true;\n        };\n\n        const applyScheduleDraft = () => {\n            Object.assign(form.value, scheduleDraft.value);\n            showScheduleModal.value = false;\n        };\n\n        const openAddTemplateModal = () => {\n            templateForm.value = { id: \'\', name: \'\', type: \'reminder\', content: \'### 🔔 {{title}}\\n\\n> **🕒 时间**：{{time}}\\n\\n---\\n\\n{{content}}\' };\n            showTemplateModal.value = true;\n        };\n\n        const editTemplate = (t) => {\n            templateForm.value = { ...t };\n            showTemplateModal.value = true;\n        };\n\n        // 渲染辅助\n        const renderMarkdown = (tplStr, vars) => {\n            let res = tplStr;\n            for (const [k, v] of Object.entries(vars)) {\n                res = res.replaceAll(`{{${k}}}`, v !== undefined && v !== null ? v : \'\');\n            }\n            return marked.parse(res);\n        };\n\n        // 预览主表单提醒卡片\n        const openFormPreview = () => {\n            const tpl = templates.value.find(t => t.id === form.value.template_id) || templates.value[0] || { content: \'{{content}}\' };\n            const vars = {\n                title: form.value.title || \'智能提醒任务\',\n                content: form.value.content || \'（这里是提醒正文示例内容）\',\n                time: new Date().toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false }),\n                type: scheduleSummary.value.title,\n                channel_name: (form.value.channel_ids || []).map(getChannelName).join(\' + \') || \'微信直通\'\n            };\n            previewHtml.value = renderMarkdown(tpl.content, vars);\n            showPreviewModal.value = true;\n        };\n\n        // 预览即时直发卡片\n        const openDirectPreview = () => {\n            const tpl = templates.value.find(t => t.id === directSendForm.value.template_id) || templates.value[0] || { content: \'{{content}}\' };\n            const vars = {\n                title: \'即时直发通知\',\n                content: directSendForm.value.message || \'（这里是即时直发消息示例内容）\',\n                time: new Date().toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false }),\n                type: \'即时通知\',\n                channel_name: (directSendForm.value.channel_ids || []).map(getChannelName).join(\' + \') || \'微信直通\'\n            };\n            previewHtml.value = renderMarkdown(tpl.content, vars);\n            showPreviewModal.value = true;\n        };\n\n        // 预览指定选中的模板\n        const previewSelectedTemplate = (tplId) => {\n            const t = templates.value.find(x => x.id === tplId) || templates.value[0];\n            if (t) previewTemplate(t);\n        };\n\n        // 预览现有任务\n        const previewReminder = (r) => {\n            const tpl = templates.value.find(t => t.id === r.template_id) || templates.value[0] || { content: \'{{content}}\' };\n            const vars = {\n                title: r.title || \'智能定时提醒\',\n                content: r.content,\n                time: new Date(r.next_trigger_at || Date.now()).toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false }),\n                type: getRepeatLabel(r.repeat_type, r.calendar_type),\n                channel_name: (r.channel_ids || []).map(getChannelName).join(\' + \')\n            };\n            previewHtml.value = renderMarkdown(tpl.content, vars);\n            showPreviewModal.value = true;\n        };\n\n        // 预览模板列表中的模板\n        const previewTemplate = (t) => {\n            const vars = {\n                title: \'测试提醒标题\',\n                content: \'这是一条用于演示该 Markdown 模板效果的示例文本内容。\\n- 支持列表与重点强调\\n- 支持引用与表情\',\n                time: new Date().toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false }),\n                type: \'🏮 农历 · 每年\',\n                channel_name: \'本地微信直通\'\n            };\n            previewHtml.value = renderMarkdown(t.content, vars);\n            showPreviewModal.value = true;\n        };\n\n        const previewTemplateDraft = () => {\n            const vars = {\n                title: templateForm.value.name || \'模板预览标题\',\n                content: \'这是模板草稿的内容测试。\',\n                time: new Date().toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false }),\n                type: \'⚡ 通用 · 每日\',\n                channel_name: \'微信直通通道\'\n            };\n            previewHtml.value = renderMarkdown(templateForm.value.content, vars);\n            showPreviewModal.value = true;\n        };\n\n        // 加载发送历史\n        const loadSendHistory = async () => {\n            sendHistoryLoading.value = true;\n            try {\n                const res = await fetch(\'api/send_history?limit=100\');\n                const data = await res.json();\n                sendHistory.value = data.history || [];\n            } catch (e) {\n                console.error(\'加载发送历史失败:\', e);\n            } finally {\n                sendHistoryLoading.value = false;\n            }\n        };\n\n        const previewFromHistory = (item) => {\n            if (!item.message) return;\n            previewHtml.value = marked.parse(item.message);\n            showPreviewModal.value = true;\n        };\n\n        const copyMessage = (msg) => {\n            if (!msg) return;\n            if (navigator.clipboard && navigator.clipboard.writeText) {\n                navigator.clipboard.writeText(msg).then(() => {\n                    alert(\'已复制消息内容\');\n                }).catch(() => {\n                    prompt(\'请手动复制:\', msg);\n                });\n            } else {\n                prompt(\'请手动复制:\', msg);\n            }\n        };\n\n        const formatRelativeTime = (timestamp) => {\n            if (!timestamp) return \'\';\n            const date = new Date(timestamp);\n            const now = new Date();\n            const diff = now - date;\n            const minutes = Math.floor(diff / 60000);\n            const hours = Math.floor(diff / 3600000);\n            const days = Math.floor(diff / 86400000);\n            \n            if (minutes < 1) return \'刚刚\';\n            if (minutes < 60) return `${minutes} 分钟前`;\n            if (hours < 24) return `${hours} 小时前`;\n            if (days < 7) return `${days} 天前`;\n            return date.toLocaleDateString(\'zh-CN\', { month: \'2-digit\', day: \'2-digit\' });\n        };\n\n        const loadData = async () => {\n            loading.value = true;\n            try {\n                const [rRes, cRes, tRes] = await Promise.all([\n                    fetch(\'api/reminders\').then(r => r.json()),\n                    fetch(\'api/channels\').then(r => r.json()),\n                    fetch(\'api/templates\').then(r => r.json())\n                ]);\n                reminders.value = rRes.reminders || [];\n                channels.value = cRes.channels || [];\n                templates.value = tRes.templates || [];\n                // 同时静默拉取发送历史\n                loadSendHistory();\n            } catch (e) {\n                console.error(\'加载失败:\', e);\n            } finally {\n                loading.value = false;\n            }\n        };\n\n        const saveTemplate = async () => {\n            if (!templateForm.value.name.trim() || !templateForm.value.content.trim()) return alert(\'请填写模板名称和内容\');\n            try {\n                const res = await fetch(\'api/templates\', {\n                    method: \'POST\',\n                    headers: { \'Content-Type\': \'application/json\' },\n                    body: JSON.stringify(templateForm.value)\n                });\n                const data = await res.json();\n                if (data.success) {\n                    showTemplateModal.value = false;\n                    await loadData();\n                } else {\n                    alert(\'保存模板失败: \' + (data.error || \'未知错误\'));\n                }\n            } catch (e) {\n                alert(\'请求异常: \' + e.message);\n            }\n        };\n\n        const deleteTemplate = async (id) => {\n            if (!confirm(\'确定删除该模板？\')) return;\n            try {\n                await fetch(\'api/templates/\' + id, { method: \'DELETE\' });\n                await loadData();\n            } catch (e) {\n                alert(\'删除失败: \' + e.message);\n            }\n        };\n\n        const sendDirectNow = async () => {\n            if (!directSendForm.value.message.trim()) return alert(\'请输入要直发的消息内容\');\n            if (!directSendForm.value.channel_ids || directSendForm.value.channel_ids.length === 0) return alert(\'请至少选择一个目标通道\');\n            sendingDirect.value = true;\n            try {\n                const res = await fetch(\'api/send\', {\n                    method: \'POST\',\n                    headers: { \'Content-Type\': \'application/json\' },\n                    body: JSON.stringify(directSendForm.value)\n                });\n                const data = await res.json();\n                if (data.ok) {\n                    alert(\'⚡ 消息已直发成功！\');\n                    directSendForm.value.message = \'\';\n                    showDirectSendModal.value = false;\n                } else {\n                    alert(\'发送失败: \' + (data.error || \'未知错误\'));\n                }\n            } catch (e) {\n                alert(\'请求异常: \' + e.message);\n            } finally {\n                sendingDirect.value = false;\n            }\n        };\n\n        const saveReminder = async () => {\n            if (!form.value.content.trim()) return alert(\'请填写提醒内容\');\n            if (!form.value.channel_ids || form.value.channel_ids.length === 0) return alert(\'请至少勾选一个通知通道\');\n            submitting.value = true;\n            try {\n                const isEdit = isEditingReminder.value && !!form.value.id;\n                const endpoint = isEdit ? `api/reminders/${form.value.id}` : \'api/reminders\';\n                const method = isEdit ? \'PUT\' : \'POST\';\n\n                const res = await fetch(endpoint, {\n                    method: method,\n                    headers: { \'Content-Type\': \'application/json\' },\n                    body: JSON.stringify(form.value)\n                });\n                const data = await res.json();\n                if (data.success) {\n                    showAddModal.value = false;\n                    await loadData();\n                } else {\n                    alert(\'保存失败: \' + (data.error || \'未知错误\'));\n                }\n            } catch (e) {\n                alert(\'请求异常: \' + e.message);\n            } finally {\n                submitting.value = false;\n            }\n        };\n\n        const deleteReminder = async (id) => {\n            if (!confirm(\'确定删除该提醒？\')) return;\n            try {\n                await fetch(\'api/reminders/\' + id, { method: \'DELETE\' });\n                await loadData();\n            } catch (e) {\n                alert(\'删除失败: \' + e.message);\n            }\n        };\n\n        const saveChannel = async () => {\n            if (!channelForm.value.id || !channelForm.value.endpoint_url) return alert(\'请填写通道 ID 和接口 URL\');\n            try {\n                await fetch(\'api/channels\', {\n                    method: \'POST\',\n                    headers: { \'Content-Type\': \'application/json\' },\n                    body: JSON.stringify(channelForm.value)\n                });\n                showAddChannelModal.value = false;\n                await loadData();\n            } catch (e) {\n                alert(\'添加通道失败: \' + e.message);\n            }\n        };\n\n        const getRepeatLabel = (t, cal) => {\n            if (cal === \'lunar\') {\n                return t === \'yearly\' ? \'农历 · 每年\' : \'农历 · 每月\';\n            }\n            if (cal === \'solar\') {\n                return t === \'yearly\' ? \'公历 · 每年\' : \'公历 · 每月\';\n            }\n            const map = { daily: \'每日重复\', weekly: \'每周重复\', once: \'单次倒计时\' };\n            return map[t] || t;\n        };\n\n        const getChannelName = (id) => {\n            const c = channels.value.find(x => x.id === id);\n            return c ? c.name : id;\n        };\n\n        const getTemplateName = (id) => {\n            const t = templates.value.find(x => x.id === id);\n            return t ? t.name : (id || \'默认模板\');\n        };\n\n        const formatTimestamp = (ts) => {\n            if (!ts) return \'N/A\';\n            const d = new Date(ts);\n            return d.toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false });\n        };\n\n        const formatTime = (ts) => {\n            if (!ts) return \'\';\n            return new Date(ts).toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', month: \'2-digit\', day: \'2-digit\', hour: \'2-digit\', minute: \'2-digit\', hour12: false });\n        };\n\n        onMounted(() => {\n            loadData();\n        });\n\n        return {\n            activeTab, reminders, sendHistory, sendHistoryLoading, channels, templates, loading, showAddModal, showScheduleModal, showPreviewModal, showAddChannelModal, showDirectSendModal, showTemplateModal, isEditingReminder, submitting, sendingDirect,\n            form, scheduleDraft, channelForm, directSendForm, templateForm, scheduleSummary, previewHtml,\n            openAddModal, editReminder, applyScheduleDraft, openAddTemplateModal, editTemplate,\n            openFormPreview, openDirectPreview, previewReminder, previewTemplate, previewTemplateDraft, previewSelectedTemplate,\n            loadData, loadSendHistory, previewFromHistory, copyMessage, formatRelativeTime,\n            saveReminder, deleteReminder, saveChannel, saveTemplate, deleteTemplate, sendDirectNow,\n            getRepeatLabel, getChannelName, getTemplateName, getCategoryIcon, getCategoryBadge, formatTimestamp, formatTime\n        };\n    }\n}).mount(\'#app\');\n</script>\n</body>\n</html>\n';

// ==========================================
// 2. 农历算法 (高精度公历/农历双向计算库)
// ==========================================
const Lunar = (() => {
// lunar_calc.js - 精简高精度农历与公历互转算法 (1900-2100)
// 支持阳历转农历、农历转阳历、闰月识别、农历每年与农历每月周期计算

const LUNAR_INFO = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
    0x0d520
];

function lYearDays(y) {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
    return sum + leapDays(y);
}

function leapMonth(y) {
    return LUNAR_INFO[y - 1900] & 0xf;
}

function leapDays(y) {
    if (leapMonth(y)) return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29;
    return 0;
}

function monthDays(y, m) {
    return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29;
}

// 阳历转农历: 返回 { year, month, day, isLeap }
function solarToLunar(year, month, day) {
    const baseDate = new Date(1900, 0, 31);
    const objDate = new Date(year, month - 1, day);
    let offset = Math.floor((objDate.getTime() - baseDate.getTime()) / 86400000);

    let temp = 0;
    let y = 1900;
    for (; y < 2100 && offset > 0; y++) {
        temp = lYearDays(y);
        offset -= temp;
    }
    if (offset < 0) {
        offset += temp;
        y--;
    }

    const lYear = y;
    const leap = leapMonth(y);
    let isLeap = false;
    let m = 1;
    for (; m < 13 && offset > 0; m++) {
        if (leap > 0 && m === (leap + 1) && !isLeap) {
            --m;
            isLeap = true;
            temp = leapDays(lYear);
        } else {
            temp = monthDays(lYear, m);
        }
        if (isLeap && m === (leap + 1)) isLeap = false;
        offset -= temp;
    }
    if (offset === 0 && leap > 0 && m === leap + 1) {
        if (isLeap) isLeap = false;
        else isLeap = true; --m;
    }
    if (offset < 0) {
        offset += temp;
        --m;
    }
    const lMonth = m;
    const lDay = offset + 1;
    return { year: lYear, month: lMonth, day: lDay, isLeap };
}

// 农历转阳历: 返回 { year, month, day }
function lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap = false) {
    let offset = 0;
    for (let y = 1900; y < lunarYear; y++) {
        offset += lYearDays(y);
    }
    const leap = leapMonth(lunarYear);
    for (let m = 1; m < lunarMonth; m++) {
        offset += monthDays(lunarYear, m);
        if (leap === m) {
            offset += leapDays(lunarYear);
        }
    }
    if (isLeap) {
        offset += monthDays(lunarYear, lunarMonth);
    }
    offset += (lunarDay - 1);
    const baseDate = new Date(1900, 0, 31);
    const targetDate = new Date(baseDate.getTime() + offset * 86400000);
    return {
        year: targetDate.getFullYear(),
        month: targetDate.getMonth() + 1,
        day: targetDate.getDate()
    };
}

// 1. 计算农历每年触发时间戳 (如农历九月十八 09:30)
function getNextLunarYearlyTrigger(lunarMonth, lunarDay, timeStr = "09:00", fromDate = new Date()) {
    const [hourStr, minStr] = timeStr.split(":");
    const hour = parseInt(hourStr || "9", 10);
    const minute = parseInt(minStr || "0", 10);

    const bjFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false });
    const bjParts = Object.fromEntries(bjFormatter.formatToParts(fromDate).map(p => [p.type, p.value]));
    const curYear = parseInt(bjParts.year, 10);

    for (let y = curYear; y <= curYear + 3; y++) {
        const solar = lunarToSolar(y, lunarMonth, lunarDay, false);
        const mm = String(solar.month).padStart(2, "0");
        const dd = String(solar.day).padStart(2, "0");
        const hh = String(hour).padStart(2, "0");
        const min = String(minute).padStart(2, "0");
        const isoBeijing = `${solar.year}-${mm}-${dd}T${hh}:${min}:00+08:00`;
        const triggerTime = new Date(isoBeijing).getTime();
        if (triggerTime > fromDate.getTime()) {
            return {
                timestamp: triggerTime,
                solarDate: `${solar.year}-${mm}-${dd}`,
                time: `${hh}:${min}`,
                lunarStr: `农历每年${lunarMonth}月${lunarDay}日`
            };
        }
    }
    return null;
}

// 2. 计算农历每月特定日期触发时间戳 (如农历每月十五/初一 09:00)
function getNextLunarMonthlyTrigger(lunarDay, timeStr = "09:00", fromDate = new Date()) {
    const [hourStr, minStr] = timeStr.split(":");
    const hour = parseInt(hourStr || "9", 10);
    const minute = parseInt(minStr || "0", 10);

    // 获取当前日期的农历年月
    const bjFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "numeric", day: "numeric" });
    const bjParts = Object.fromEntries(bjFormatter.formatToParts(fromDate).map(p => [p.type, p.value]));
    const currentLunar = solarToLunar(parseInt(bjParts.year, 10), parseInt(bjParts.month, 10), parseInt(bjParts.day, 10));

    let targetYear = currentLunar.year;
    let targetMonth = currentLunar.month;

    // 搜索未来 24 个农历月
    for (let i = 0; i < 24; i++) {
        const maxDays = monthDays(targetYear, targetMonth);
        const actualDay = Math.min(lunarDay, maxDays);

        const solar = lunarToSolar(targetYear, targetMonth, actualDay, false);
        const mm = String(solar.month).padStart(2, "0");
        const dd = String(solar.day).padStart(2, "0");
        const hh = String(hour).padStart(2, "0");
        const min = String(minute).padStart(2, "0");
        const isoBeijing = `${solar.year}-${mm}-${dd}T${hh}:${min}:00+08:00`;
        const triggerTime = new Date(isoBeijing).getTime();

        if (triggerTime > fromDate.getTime()) {
            return {
                timestamp: triggerTime,
                solarDate: `${solar.year}-${mm}-${dd}`,
                time: `${hh}:${min}`,
                lunarStr: `农历每月${lunarDay}日 (下次: ${targetMonth}月${actualDay}日)`
            };
        }

        // 下一个农历月
        targetMonth++;
        if (targetMonth > 12) {
            targetMonth = 1;
            targetYear++;
        }
    }
    return null;
}

// 统一对外接口
function getNextLunarTrigger(lunarMonth, lunarDay, timeStr = "09:00", fromDate = new Date(), repeatType = "yearly") {
    if (repeatType === "monthly") {
        return getNextLunarMonthlyTrigger(lunarDay, timeStr, fromDate);
    }
    return getNextLunarYearlyTrigger(lunarMonth, lunarDay, timeStr, fromDate);
}

if (typeof module !== 'undefined') {
    module.exports = { solarToLunar, lunarToSolar, getNextLunarTrigger, getNextLunarYearlyTrigger, getNextLunarMonthlyTrigger };
}

    return { solarToLunar, lunarToSolar, getNextLunarTrigger, getNextLunarYearlyTrigger, getNextLunarMonthlyTrigger };
})();

// ==========================================
// 3. 辅助函数：公历与通用时间调度计算
// ==========================================
function getNextSolarTrigger(repeatType, targetDate, targetTime) {
    const now = new Date();
    const [hours, minutes] = targetTime.split(':').map(Number);
    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

    if (repeatType === 'daily') {
        if (target <= now) {
            target.setDate(target.getDate() + 1);
        }
    } else if (repeatType === 'weekly') {
        const targetDay = parseInt(targetDate);
        let diff = targetDay - now.getDay();
        if (diff < 0 || (diff === 0 && target <= now)) {
            diff += 7;
        }
        target.setDate(target.getDate() + diff);
    } else if (repeatType === 'monthly') {
        const targetDay = parseInt(targetDate);
        target.setDate(targetDay);
        if (target <= now) {
            target.setMonth(target.getMonth() + 1);
        }
    } else if (repeatType === 'yearly') {
        const [m, d] = targetDate.split('-').map(Number);
        target = new Date(now.getFullYear(), m - 1, d, hours, minutes, 0, 0);
        if (target <= now) {
            target.setFullYear(target.getFullYear() + 1);
        }
    } else if (repeatType === 'once') {
        if (targetDate.includes('-')) {
            const parts = targetDate.split('-');
            let y = now.getFullYear();
            let m, d;
            if (parts.length === 3) {
                y = parseInt(parts[0]);
                m = parseInt(parts[1]);
                d = parseInt(parts[2]);
            } else {
                m = parseInt(parts[0]);
                d = parseInt(parts[1]);
            }
            target = new Date(y, m - 1, d, hours, minutes, 0, 0);
        }
    }
    return target.getTime();
}

function getNextTrigger(calendarType, repeatType, targetDate, targetTime) {
    if (calendarType === 'lunar') {
        if (repeatType === 'yearly') {
            const [m, d] = targetDate.split('-').map(Number);
            return Lunar.getNextLunarYearlyTrigger(m, d, targetTime).getTime();
        } else if (repeatType === 'monthly') {
            const d = parseInt(targetDate);
            return Lunar.getNextLunarMonthlyTrigger(d, targetTime).getTime();
        }
        return Lunar.getNextLunarTrigger(repeatType, targetDate, targetTime).getTime();
    } else {
        return getNextSolarTrigger(repeatType, targetDate, targetTime);
    }
}

// 模板变量渲染
function renderTemplate(templateContent, variables) {
    let rendered = templateContent || '';
    for (const [key, value] of Object.entries(variables)) {
        rendered = rendered.replace(new RegExp(`\\{{\\s*${key}\\s*\\}}`, 'g'), value || '');
    }
    return rendered;
}

// 格式化定时提醒
function formatReminderMessage(r, templateMap, channelMap) {
    const tpl = templateMap[r.template_id] || templateMap['tpl_standard'] || {
        content: '### 🔔 {{title}}\n\n> ⏰ **触发时间**: {{time}}\n> 🏷️ **提醒分类**: {{type}}\n\n---\n\n{{content}}'
    };

    let typeStr = r.calendar_type === 'lunar' ? '农历' : (['daily', 'weekly', 'once'].includes(r.repeat_type) ? '通用' : '公历');
    let repeatName = { yearly: '每年', monthly: '每月', weekly: '每周', daily: '每天', once: '单次' }[r.repeat_type] || r.repeat_type;
    let fullType = `${typeStr} · ${repeatName} (${r.target_date || ''} ${r.target_time})`;

    let targetChannelNames = getTargetChannelIds(r).map(id => channelMap[id]?.name || id).join(' + ') || '默认微信直通';

    const nowStr = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

    return renderTemplate(tpl.content, {
        title: r.title || '提醒事项',
        content: r.content || '(无详细内容)',
        time: nowStr,
        type: fullType,
        channel_name: targetChannelNames
    });
}

// 目标通道解析辅助
function getTargetChannelIds(row) {
    if (!row) return ['default_wx'];
    if (row.channel_ids) {
        try {
            const parsed = typeof row.channel_ids === 'string' ? JSON.parse(row.channel_ids) : row.channel_ids;
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch(e) {}
    }
    if (row.channel_id) return [row.channel_id];
    return ['default_wx'];
}

// HTTP JSON 响应辅助
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}

// 发送消息到指定通道 (使用 Worker 标准 fetch)
async function deliverToChannel(channel, textToSend, targetOverride) {
    if (!channel || !channel.endpoint_url) {
        return { success: false, statusCode: 0, body: 'Channel endpoint not configured' };
    }

    let customHeaders = { 'Content-Type': 'application/json; charset=utf-8' };
    if (channel.headers) {
        try {
            const parsed = typeof channel.headers === 'string' ? JSON.parse(channel.headers) : channel.headers;
            Object.assign(customHeaders, parsed);
        } catch(e) {}
    }

    let payload = { text: textToSend };
    if (targetOverride) {
        payload.target = targetOverride;
    }

    try {
        const resp = await fetch(channel.endpoint_url, {
            method: 'POST',
            headers: customHeaders,
            body: JSON.stringify(payload)
        });
        const bodyText = await resp.text();
        return {
            success: resp.ok,
            statusCode: resp.status,
            body: bodyText
        };
    } catch (err) {
        return {
            success: false,
            statusCode: 0,
            body: err.message
        };
    }
}

// ==========================================
// 4. 定时调度核心 (Cron Triggers 触发)
// ==========================================
async function checkAndTriggerReminders(env) {
    const now = Date.now();
    
    // 1. 查询所有到达触发时间的任务
    const { results: dueReminders } = await env.DB.prepare(
        'SELECT * FROM reminders WHERE enabled = 1 AND next_trigger_at <= ?'
    ).bind(now).all();

    if (!dueReminders || dueReminders.length === 0) return;

    // 2. 加载通道与模板映射
    const { results: channelRows } = await env.DB.prepare('SELECT * FROM channels').all();
    const channelMap = {};
    (channelRows || []).forEach(c => { channelMap[c.id] = c; });

    const { results: templateRows } = await env.DB.prepare('SELECT * FROM templates').all();
    const templateMap = {};
    (templateRows || []).forEach(t => { templateMap[t.id] = t; });

    for (const r of dueReminders) {
        const finalMsg = formatReminderMessage(r, templateMap, channelMap);
        const targetIds = getTargetChannelIds(r);

        for (const cId of targetIds) {
            const ch = channelMap[cId];
            if (!ch || !ch.enabled) {
                await env.DB.prepare(
                    'INSERT INTO delivery_logs (reminder_id, channel_id, message, status, response) VALUES (?, ?, ?, ?, ?)'
                ).bind(r.id, cId, finalMsg, 'skipped', 'Channel not found or disabled').run();
                continue;
            }

            const result = await deliverToChannel(ch, finalMsg);
            const statusStr = result.success ? 'success' : (result.statusCode > 0 ? `http_${result.statusCode}` : 'failed');

            await env.DB.prepare(
                'INSERT INTO delivery_logs (reminder_id, channel_id, message, status, response) VALUES (?, ?, ?, ?, ?)'
            ).bind(r.id, cId, finalMsg, statusStr, result.body).run();
        }

        // 计算下一次触发时间并更新
        let nextTrigger = null;
        if (r.repeat_type === 'once') {
            await env.DB.prepare('UPDATE reminders SET enabled = 0, updated_at = datetime("now") WHERE id = ?').bind(r.id).run();
        } else {
            nextTrigger = getNextTrigger(r.calendar_type, r.repeat_type, r.target_date, r.target_time);
            await env.DB.prepare(
                'UPDATE reminders SET next_trigger_at = ?, updated_at = datetime("now") WHERE id = ?'
            ).bind(nextTrigger, r.id).run();
        }
    }
}

// ==========================================
// 5. Worker 导出入口 (Fetch API + Cron Handlers)
// ==========================================
export default {
    // HTTP API 与网页静态托管
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        if (method === 'OPTIONS') {
            return jsonResponse({ ok: true });
        }

        // 1. 静态单页应用
        if (path === '/' || path === '/index.html' || path === '/reminder' || path === '/reminder/') {
            return new Response(HTML, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // 2. 健康检查
        if (path === '/api/health') {
            return jsonResponse({ status: 'ok', serverless: true, timestamp: Date.now() });
        }

        // 3. 通道 API (/api/channels)
        if (path === '/api/channels' && method === 'GET') {
            const { results } = await env.DB.prepare('SELECT * FROM channels ORDER BY created_at ASC').all();
            return jsonResponse({ channels: results || [] });
        }

        if (path === '/api/channels' && method === 'POST') {
            const b = await request.json().catch(() => ({}));
            const id = b.id || `ch_${Date.now()}`;
            const hStr = b.headers ? (typeof b.headers === 'string' ? b.headers : JSON.stringify(b.headers)) : null;
            await env.DB.prepare(
                'INSERT INTO channels (id, name, endpoint_url, headers, enabled) VALUES (?, ?, ?, ?, ?)'
            ).bind(id, b.name, b.endpoint_url, hStr, b.enabled ?? 1).run();
            return jsonResponse({ ok: true, id });
        }

        if (path.startsWith('/api/channels/') && method === 'DELETE') {
            const id = path.split('/')[3];
            await env.DB.prepare('DELETE FROM channels WHERE id = ?').bind(id).run();
            return jsonResponse({ ok: true });
        }

        // 4. 模板 API (/api/templates)
        if (path === '/api/templates' && method === 'GET') {
            const { results } = await env.DB.prepare('SELECT * FROM templates ORDER BY created_at ASC').all();
            return jsonResponse({ templates: results || [] });
        }

        if (path === '/api/templates' && method === 'POST') {
            const b = await request.json().catch(() => ({}));
            const id = b.id || `tpl_${Date.now()}`;
            await env.DB.prepare(
                'INSERT OR REPLACE INTO templates (id, name, content, is_default) VALUES (?, ?, ?, ?)'
            ).bind(id, b.name, b.content, b.is_default ? 1 : 0).run();
            return jsonResponse({ ok: true, id });
        }

        if (path.startsWith('/api/templates/') && method === 'DELETE') {
            const id = path.split('/')[3];
            await env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(id).run();
            return jsonResponse({ ok: true });
        }

        // 5. 提醒管理 API (/api/reminders)
        if (path === '/api/reminders' && method === 'GET') {
            const { results } = await env.DB.prepare('SELECT * FROM reminders ORDER BY next_trigger_at ASC').all();
            const normalized = (results || []).map(r => ({
                ...r,
                channel_ids: getTargetChannelIds(r)
            }));
            return jsonResponse({ reminders: normalized });
        }

        if ((path === '/api/reminders' && method === 'POST') || (path.startsWith('/api/reminders/') && method === 'PUT')) {
            const b = await request.json().catch(() => ({}));
            const id = b.id || (path.startsWith('/api/reminders/') ? path.split('/')[3] : `rem_${Date.now()}`);
            const targetChans = b.channel_ids || (b.channel_id ? [b.channel_id] : ['default_wx']);
            const nextTrigger = getNextTrigger(b.calendar_type, b.repeat_type, b.target_date, b.target_time);

            await env.DB.prepare(`
                INSERT INTO reminders (id, title, content, template_id, calendar_type, repeat_type, target_date, target_time, channel_ids, enabled, next_trigger_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    content = excluded.content,
                    template_id = excluded.template_id,
                    calendar_type = excluded.calendar_type,
                    repeat_type = excluded.repeat_type,
                    target_date = excluded.target_date,
                    target_time = excluded.target_time,
                    channel_ids = excluded.channel_ids,
                    next_trigger_at = excluded.next_trigger_at,
                    updated_at = datetime('now')
            `).bind(
                id, b.title, b.content || '', b.template_id || 'tpl_standard',
                b.calendar_type, b.repeat_type, b.target_date || '', b.target_time,
                JSON.stringify(targetChans), nextTrigger
            ).run();

            return jsonResponse({ ok: true, id, next_trigger_at: nextTrigger });
        }

        if (path.startsWith('/api/reminders/') && method === 'DELETE') {
            const id = path.split('/')[3];
            await env.DB.prepare('DELETE FROM reminders WHERE id = ?').bind(id).run();
            return jsonResponse({ ok: true });
        }

        // 6. 发送历史 API (/api/send_history)
        if (path === '/api/send_history' && method === 'GET') {
            const limit = parseInt(url.searchParams.get('limit') || '100');
            const { results } = await env.DB.prepare(`
                SELECT dl.*, c.name as channel_name 
                FROM delivery_logs dl 
                LEFT JOIN channels c ON dl.channel_id = c.id 
                ORDER BY dl.id DESC 
                LIMIT ?
            `).bind(limit).all();
            return jsonResponse({ history: results || [] });
        }

        // 7. 即时直发 API (/api/send)
        if (path === '/api/send' && method === 'POST') {
            const b = await request.json().catch(() => ({}));
            const targetIds = b.channel_ids || (b.channel_id ? [b.channel_id] : ['default_wx']);
            
            const { results: channelRows } = await env.DB.prepare('SELECT * FROM channels').all();
            const channelMap = {};
            (channelRows || []).forEach(c => { channelMap[c.id] = c; });

            let textToSend = b.message || b.text;
            if (b.template_id) {
                const { results: tRows } = await env.DB.prepare('SELECT * FROM templates WHERE id = ?').bind(b.template_id).all();
                if (tRows && tRows[0]) {
                    const nowStr = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
                    const cNames = targetIds.map(id => channelMap[id]?.name || id).join(' + ') || '微信直通';
                    textToSend = renderTemplate(tRows[0].content, {
                        title: b.title || '即时通知',
                        content: textToSend,
                        time: nowStr,
                        type: '⚡ 即时直发',
                        channel_name: cNames
                    });
                }
            }

            const results = [];
            for (const cId of targetIds) {
                const ch = channelMap[cId];
                if (!ch || !ch.enabled) {
                    results.push({ channel_id: cId, success: false, response: 'Channel disabled or not found' });
                    continue;
                }
                const delRes = await deliverToChannel(ch, textToSend, b.target);
                results.push({
                    channel_id: cId,
                    channel_name: ch.name,
                    success: delRes.success,
                    statusCode: delRes.statusCode,
                    response: delRes.body
                });

                await env.DB.prepare(
                    'INSERT INTO delivery_logs (reminder_id, channel_id, message, status, response) VALUES (?, ?, ?, ?, ?)'
                ).bind('instant_send', cId, textToSend, delRes.success ? 'success' : 'failed', delRes.body).run();
            }

            return jsonResponse({ ok: true, direct_send: true, results });
        }

        return jsonResponse({ error: 'Not Found' }, 404);
    },

    // Cron Trigger 每分钟触发
    async scheduled(event, env, ctx) {
        ctx.waitUntil(checkAndTriggerReminders(env));
    }
};
