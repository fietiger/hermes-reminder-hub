/**
 * Hermes Reminder Hub - Cloudflare Workers + D1 Serverless Edition
 */

const HTML = '<!DOCTYPE html>\n<html lang="zh-CN" class="h-full">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">\n    <meta name="apple-mobile-web-app-capable" content="yes">\n    <meta name="apple-mobile-web-app-status-bar-style" content="default">\n    <meta name="theme-color" content="#ffffff">\n    <title>提醒中枢 (Hermes Reminder Hub)</title>\n    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>\n    <script src="https://cdn.tailwindcss.com"></script>\n    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>\n    <style>\n        body { \n            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Roboto, sans-serif; \n            -webkit-tap-highlight-color: transparent;\n            touch-action: manipulation;\n        }\n        .safe-top {{ padding-top: max(0.75rem, env(safe-area-inset-top, 0.75rem)); }}\n        .safe-bottom-tab {{ padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 0.5rem)); }}\n        .safe-bottom-content {{ padding-bottom: max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5rem)); }}\n        \n        .glass-header {\n            background: rgba(255, 255, 255, 0.88);\n            backdrop-filter: blur(20px);\n            -webkit-backdrop-filter: blur(20px);\n        }\n        .glass-tabbar {\n            background: rgba(255, 255, 255, 0.94);\n            backdrop-filter: blur(20px);\n            -webkit-backdrop-filter: blur(20px);\n        }\n        .glass-card {\n            background: rgba(255, 255, 255, 0.95);\n            backdrop-filter: blur(10px);\n        }\n        \n        .ios-btn-active:active {\n            transform: scale(0.97);\n            opacity: 0.88;\n            transition: transform 0.1s ease;\n        }\n        .ios-card-active:active {\n            transform: scale(0.988);\n            transition: transform 0.12s ease;\n        }\n\n        .wechat-preview-card {\n            background: #ffffff;\n            border-radius: 14px;\n            box-shadow: 0 4px 20px rgba(0,0,0,0.06);\n            padding: 18px;\n            border: 1px solid #f1f5f9;\n        }\n        .wechat-preview-card h3 {{ font-size: 1.05rem; font-weight: 700; margin-bottom: 8px; color: #0f172a; }}\n        .wechat-preview-card blockquote {{ border-left: 3px solid #4f46e5; padding-left: 10px; color: #475569; font-size: 0.82rem; margin: 8px 0; background: #f8fafc; border-radius: 0 6px 6px 0; padding-top: 4px; padding-bottom: 4px; }}\n        .wechat-preview-card hr {{ margin: 12px 0; border-color: #f1f5f9; }}\n        .wechat-preview-card p {{ line-height: 1.6; font-size: 0.88rem; color: #334155; white-space: pre-wrap; }}\n        .wechat-preview-card pre {{ background: #f1f5f9; padding: 10px; border-radius: 8px; font-size: 0.78rem; overflow-x: auto; margin: 8px 0; }}\n        .wechat-preview-card code {{ font-family: ui-monospace, monospace; background: #f1f5f9; padding: 2px 4px; border-radius: 4px; }}\n        .wechat-preview-card em {{ font-size: 0.72rem; color: #94a3b8; font-style: normal; display: block; margin-top: 4px; }}\n        \n        /* 桌面端自定义美化滚动条 */\n        @media (min-width: 768px) {\n            ::-webkit-scrollbar {{ width: 6px; height: 6px; }}\n            ::-webkit-scrollbar-track {{ background: #f1f5f9; }}\n            ::-webkit-scrollbar-thumb {{ background: #cbd5e1; border-radius: 3px; }}\n            ::-webkit-scrollbar-thumb:hover {{ background: #94a3b8; }}\n        }\n        @media (max-width: 767px) {\n            ::-webkit-scrollbar {{ width: 0px; height: 0px; }}\n        }\n    </style>\n</head>\n<body class="bg-slate-100/90 text-slate-800 min-h-full flex flex-col antialiased">\n<div id="app" class="flex-1 flex w-full min-h-screen">\n\n    <!-- ===================================================== -->\n    <!-- 💻 桌面端专属：左侧常驻 Sidebar 侧边栏 (md 及以上显示) -->\n    <!-- ===================================================== -->\n    <aside class="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-200/80 p-5 flex-shrink-0 justify-between sticky top-0 h-screen select-none z-20">\n        <div class="space-y-6">\n            <!-- 品牌 Logo -->\n            <div class="flex items-center gap-3 px-2">\n                <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-indigo-200">\n                    ⏰\n                </div>\n                <div>\n                    <h1 class="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">\n                        <span>提醒中枢</span>\n                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>\n                    </h1>\n                    <p class="text-[11px] text-slate-400 font-medium">Hermes Reminder Hub</p>\n                </div>\n            </div>\n\n            <!-- 快捷新建操作按钮 -->\n            <div class="space-y-2 pt-1">\n                <button @click="openAddModal" class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-indigo-200 flex items-center justify-center gap-2 transition duration-150">\n                    <span>➕</span>\n                    <span>新建智能提醒</span>\n                </button>\n                <button @click="showDirectSendModal = true" class="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-emerald-200 flex items-center justify-center gap-2 transition duration-150">\n                    <span>⚡</span>\n                    <span>即时直发微信</span>\n                </button>\n            </div>\n\n            <!-- 侧边导航栏 Tab 菜单 -->\n            <nav class="space-y-1.5 pt-2">\n                <button @click="activeTab = \'reminders\'" :class="[\'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition\', activeTab === \'reminders\' ? \'bg-indigo-50 text-indigo-700 font-bold\' : \'text-slate-600 hover:bg-slate-50\']">\n                    <div class="flex items-center gap-3">\n                        <span class="text-lg">📅</span>\n                        <span>定时提醒</span>\n                    </div>\n                    <span v-if="reminders.length" class="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">{{ reminders.length }}</span>\n                </button>\n                <button @click="activeTab = \'templates\'" :class="[\'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition\', activeTab === \'templates\' ? \'bg-indigo-50 text-indigo-700 font-bold\' : \'text-slate-600 hover:bg-slate-50\']">\n                    <div class="flex items-center gap-3">\n                        <span class="text-lg">🎨</span>\n                        <span>消息模板</span>\n                    </div>\n                    <span v-if="templates.length" class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">{{ templates.length }}</span>\n                </button>\n                <button @click="activeTab = \'history\'" :class="[\'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition\', activeTab === \'history\' ? \'bg-indigo-50 text-indigo-700 font-bold\' : \'text-slate-600 hover:bg-slate-50\']">\n                    <div class="flex items-center gap-3">\n                        <span class="text-lg">📜</span>\n                        <span>发送历史</span>\n                    </div>\n                    <span v-if="sendHistory.length" class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">{{ sendHistory.length }}</span>\n                </button>\n                <button @click="activeTab = \'channels\'" :class="[\'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition\', activeTab === \'channels\' ? \'bg-indigo-50 text-indigo-700 font-bold\' : \'text-slate-600 hover:bg-slate-50\']">\n                    <div class="flex items-center gap-3">\n                        <span class="text-lg">📡</span>\n                        <span>通知通道</span>\n                    </div>\n                    <span v-if="channels.length" class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">{{ channels.length }}</span>\n                </button>\n            </nav>\n        </div>\n\n        <!-- 底部运行状态指示 -->\n        <div class="pt-4 border-t border-slate-100 px-2 space-y-2">\n            <div class="flex items-center justify-between text-xs text-slate-500">\n                <span class="flex items-center gap-1.5 font-medium">\n                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>\n                    服务在线守护中\n                </span>\n                <button @click="loadData" :disabled="loading" class="text-indigo-600 hover:underline font-bold text-xs">\n                    <span :class="loading ? \'animate-spin inline-block\' : \'\'">🔄</span> 刷新\n                </button>\n            </div>\n            <div class="text-[11px] text-slate-400 font-mono">\n                v1.2 · 农历高精度双向算法\n            </div>\n        </div>\n    </aside>\n\n    <!-- ===================================================== -->\n    <!-- 📱 手机端 & 💻 桌面端：主内容工作区 -->\n    <!-- ===================================================== -->\n    <div class="flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen relative">\n        \n        <!-- 📱 移动端专属 Sticky Header (md 以上隐藏) -->\n        <header class="md:hidden sticky top-0 z-30 glass-header border-b border-slate-200/70 safe-top px-4 py-2.5 flex items-center justify-between">\n            <div class="flex items-center gap-2.5">\n                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-indigo-200">\n                    ⏰\n                </div>\n                <div>\n                    <h1 class="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1">\n                        <span>提醒中枢</span>\n                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>\n                    </h1>\n                    <p class="text-[10px] text-slate-400 font-medium">Hermes Reminder Hub</p>\n                </div>\n            </div>\n\n            <div class="flex items-center gap-1.5">\n                <button @click="showDirectSendModal = true" class="ios-btn-active px-3 py-1.5 bg-emerald-500 text-white rounded-full text-xs font-semibold shadow-sm flex items-center gap-1">\n                    <span>⚡</span>\n                    <span>直发</span>\n                </button>\n                <button @click="openAddModal" class="ios-btn-active px-3 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-semibold shadow-sm flex items-center gap-1">\n                    <span>➕</span>\n                    <span>创建</span>\n                </button>\n            </div>\n        </header>\n\n        <!-- 💻 桌面端专属 Header 顶栏 (md 及以上显示) -->\n        <header class="hidden md:flex items-center justify-between px-8 py-5 border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-20">\n            <div>\n                <h2 class="text-xl font-black text-slate-900 tracking-tight">\n                    {{ activeTab === \'reminders\' ? \'📅 活跃的定时提醒\' : (activeTab === \'templates\' ? \'🎨 消息卡片模板库\' : (activeTab === \'history\' ? \'📜 消息发送历史\' : \'📡 通知通道管理\')) }}\n                </h2>\n                <p class="text-xs text-slate-400 font-medium mt-0.5">\n                    {{ activeTab === \'reminders\' ? \'支持通用周期、阴历农历与公历阳历高精度自动调度\' : (activeTab === \'templates\' ? \'自定义微信 Markdown 卡片排版风格与预设模板\' : (activeTab === \'history\' ? \'查看定时触发与即时直发的真实推送历史记录\' : \'配置与挂载微信直通或自定义 Webhook 通道\')) }}\n                </p>\n            </div>\n\n            <div class="flex items-center gap-3">\n                <button @click="loadData" :disabled="loading" class="px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5">\n                    <span :class="loading ? \'animate-spin\' : \'\'">🔄</span> 刷新数据\n                </button>\n                <button @click="showDirectSendModal = true" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-100 flex items-center gap-1.5 transition">\n                    <span>⚡</span>\n                    <span>即时直发</span>\n                </button>\n                <button @click="openAddModal" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-100 flex items-center gap-1.5 transition">\n                    <span>➕</span>\n                    <span>新建提醒</span>\n                </button>\n            </div>\n        </header>\n\n        <!-- 主内容滑动容器 (自适应宽屏栅格) -->\n        <main class="flex-1 p-3.5 md:p-8 safe-bottom-content md:pb-12 overflow-y-auto max-w-7xl w-full mx-auto">\n\n            <!-- ========================================== -->\n            <!-- 1. 定时提醒列表 (Reminders Tab) -->\n            <!-- ========================================== -->\n            <div v-if="activeTab === \'reminders\'" class="space-y-4">\n                <!-- 移动端顶部计数 -->\n                <div class="md:hidden flex items-center justify-between px-1">\n                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">活跃中的定时任务 ({{ reminders.length }})</span>\n                    <button @click="loadData" :disabled="loading" class="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:underline">\n                        <span :class="loading ? \'animate-spin\' : \'\'">🔄</span> 刷新\n                    </button>\n                </div>\n\n                <!-- 空状态 -->\n                <div v-if="reminders.length === 0" class="bg-white rounded-2xl border border-slate-200/80 text-center py-20 px-4 shadow-sm">\n                    <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-3xl">\n                        📭\n                    </div>\n                    <h3 class="text-sm font-bold text-slate-700">暂无待触发的提醒任务</h3>\n                    <p class="text-xs text-slate-400 mt-1 max-w-xs mx-auto">点击「新建提醒」添加农历初一十五、生日或通用周期定时</p>\n                    <button @click="openAddModal" class="mt-4 px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition shadow-sm">\n                        ➕ 立即新建提醒\n                    </button>\n                </div>\n\n                <!-- 宽屏响应式栅格卡片列表 (单列/双列/三列) -->\n                <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 md:gap-4">\n                    <div v-for="r in reminders" :key="r.id" class="ios-card-active bg-white rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md border border-slate-200/80 transition flex flex-col justify-between relative overflow-hidden group">\n                        \n                        <div>\n                            <!-- 顶部标签与操作按钮 -->\n                            <div class="flex items-center justify-between gap-2 mb-2.5">\n                                <div class="flex items-center gap-1.5 flex-wrap">\n                                    <span :class="[\'text-[11px] px-2.5 py-0.5 rounded-full font-bold\', r.calendar_type === \'lunar\' ? \'bg-amber-100 text-amber-800\' : (r.calendar_type === \'solar\' ? \'bg-blue-100 text-blue-800\' : \'bg-slate-100 text-slate-800\')]">\n                                        {{ getCategoryBadge(r.calendar_type) }}\n                                    </span>\n                                    <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-100">\n                                        {{ getRepeatLabel(r.repeat_type, r.calendar_type) }}\n                                    </span>\n                                    <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium truncate max-w-[120px]">\n                                        🎨 {{ getTemplateName(r.template_id) }}\n                                    </span>\n                                </div>\n\n                                <!-- 操作菜单 (试发 + 预览 + 编辑 + 删除) -->\n                                <div class="flex items-center gap-1">\n                                    <button @click="testSendReminder(r)" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition" title="立即试发（不影响原定周期）">\n                                        ✈️\n                                    </button>\n                                    <button @click="previewReminder(r)" class="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition" title="预览卡片">\n                                        👁️\n                                    </button>\n                                    <button @click="editReminder(r)" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition" title="编辑修改">\n                                        ✏️\n                                    </button>\n                                    <button @click="deleteReminder(r.id)" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition" title="删除">\n                                        🗑️\n                                    </button>\n                                </div>\n                            </div>\n\n                            <!-- 标题与内容 (点击编辑) -->\n                            <div @click="editReminder(r)" class="cursor-pointer">\n                                <h3 v-if="r.title" class="text-sm md:text-base font-bold text-slate-900 mb-1 leading-snug group-hover:text-indigo-600 transition">{{ r.title }}</h3>\n                                <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 group-hover:bg-slate-100/70 p-3 rounded-xl border border-slate-100 mb-3 transition max-h-32 overflow-y-auto">{{ r.content }}</p>\n                            </div>\n                        </div>\n\n                        <!-- 底部元信息与触发时间 -->\n                        <div class="flex items-center justify-between text-[11px] pt-2.5 border-t border-slate-100">\n                            <div class="flex items-center gap-1.5 text-slate-400">\n                                <span>📡</span>\n                                <span class="truncate max-w-[130px]">{{ (r.channel_ids || []).map(getChannelName).join(\', \') }}</span>\n                            </div>\n                            <div class="flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50/90 px-2.5 py-1 rounded-lg">\n                                <span>⏰</span>\n                                <span class="font-mono">{{ formatTimestamp(r.next_trigger_at) }}</span>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n            </div>\n\n            <!-- ========================================== -->\n            <!-- 2. 消息模板列表 (Templates Tab) -->\n            <!-- ========================================== -->\n            <div v-if="activeTab === \'templates\'" class="space-y-4">\n                <div class="flex items-center justify-between px-1">\n                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Markdown 消息模板库 ({{ templates.length }})</span>\n                    <button @click="openAddTemplateModal" class="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1 transition">\n                        ➕ 新建自定义模板\n                    </button>\n                </div>\n\n                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\n                    <div v-for="t in templates" :key="t.id" class="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-3">\n                        <div>\n                            <div class="flex items-center justify-between mb-2">\n                                <div class="flex items-center gap-2">\n                                    <h3 class="text-sm font-bold text-slate-900">{{ t.name }}</h3>\n                                    <span v-if="t.is_default" class="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100">默认</span>\n                                </div>\n                                <span class="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{{ t.id }}</span>\n                            </div>\n\n                            <pre class="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">{{ t.content }}</pre>\n                        </div>\n\n                        <div class="flex items-center justify-between pt-2.5 border-t border-slate-100">\n                            <button @click="previewTemplate(t)" class="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1">\n                                <span>👁️</span> 效果预览\n                            </button>\n                            <div class="flex items-center gap-3">\n                                <button @click="editTemplate(t)" class="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">编辑</button>\n                                <button v-if="!t.id.startsWith(\'tpl_standard\') && !t.id.startsWith(\'tpl_direct\')" @click="deleteTemplate(t.id)" class="text-xs text-rose-500 hover:text-rose-600 font-semibold">删除</button>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n            </div>\n\n            <!-- ========================================== -->\n            <!-- 3. 通知通道列表 (Channels Tab) -->\n            <!-- ========================================== -->\n            <div v-if="activeTab === \'channels\'" class="space-y-4">\n                <div class="flex items-center justify-between px-1">\n                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">已连接终端通道 ({{ channels.length }})</span>\n                    <button @click="showAddChannelModal = true" class="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1 transition">\n                        ➕ 挂载新通道\n                    </button>\n                </div>\n\n                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\n                    <div v-for="c in channels" :key="c.id" class="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200/80 space-y-3">\n                        <div class="flex items-center justify-between">\n                            <div class="flex items-center gap-2.5">\n                                <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base font-bold">\n                                    📡\n                                </div>\n                                <div>\n                                    <h3 class="text-sm font-bold text-slate-900 leading-none">{{ c.name }}</h3>\n                                    <span class="text-[10px] font-mono text-slate-400 mt-0.5 block">{{ c.id }}</span>\n                                </div>\n                            </div>\n                            <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-200">\n                                {{ c.enabled ? \'正常连通\' : \'已停用\' }}\n                            </span>\n                        </div>\n\n                        <div class="text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100 break-all">\n                            <div class="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Endpoint URL</div>\n                            {{ c.endpoint_url }}\n                        </div>\n                    </div>\n                </div>\n            </div>\n\n            <!-- ========================================== -->\n            <!-- 4. 发送历史列表 (Send History Tab) -->\n            <!-- ========================================== -->\n            <div v-if="activeTab === \'history\'" class="space-y-4">\n                <div class="flex items-center justify-between px-1">\n                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">最近 {{ sendHistory.length }} 条发送记录</span>\n                    <button @click="loadSendHistory()" class="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1 transition">\n                        🔄 刷新历史\n                    </button>\n                </div>\n\n                <div v-if="sendHistoryLoading" class="flex justify-center py-16">\n                    <div class="flex flex-col items-center gap-3">\n                        <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>\n                        <span class="text-xs text-slate-400">加载发送记录中...</span>\n                    </div>\n                </div>\n\n                <div v-else-if="sendHistory.length === 0" class="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80 text-slate-400">\n                    <div class="text-5xl mb-3 opacity-30">📭</div>\n                    <p class="text-sm font-bold text-slate-700">暂无发送记录</p>\n                    <p class="text-xs mt-1 text-slate-400">定时提醒触发或即时直发后，推送记录将在此处实时显示</p>\n                </div>\n\n                <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 md:gap-4">\n                    <div v-for="item in sendHistory" :key="item.id" class="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-3">\n                        <div class="space-y-2">\n                            <!-- 头部：状态 + 时间 + 通道 -->\n                            <div class="flex items-center justify-between">\n                                <div class="flex items-center gap-2">\n                                    <span :class="[\'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold\', \n                                        item.status === \'success\' ? \'bg-emerald-100 text-emerald-600\' :\n                                        item.status === \'failed\' ? \'bg-red-100 text-red-600\' :\n                                        \'bg-slate-100 text-slate-500\']">\n                                        {{ item.status === \'success\' ? \'✓\' : item.status === \'failed\' ? \'✗\' : \'⏸\' }}\n                                    </span>\n                                    <span class="text-xs font-bold text-slate-800">{{ item.channel_name || item.channel_id }}</span>\n                                </div>\n                                <span class="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">{{ formatRelativeTime(item.delivered_at) }}</span>\n                            </div>\n\n                            <!-- 消息内容预览 -->\n                            <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 whitespace-pre-wrap max-h-32 overflow-y-auto border border-slate-100 font-mono leading-relaxed">\n                                {{ item.message || \'(无内容记录)\' }}\n                            </div>\n                        </div>\n\n                        <!-- 操作按钮 -->\n                        <div class="flex items-center gap-2 pt-1 border-t border-slate-100">\n                            <button v-if="item.message" @click="previewFromHistory(item)" class="flex-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition">\n                                👁️ 预览微信卡片\n                            </button>\n                            <button @click="copyMessage(item.message)" class="px-3 text-xs text-slate-500 hover:text-slate-700 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition">\n                                📋 复制\n                            </button>\n                        </div>\n                    </div>\n                </div>\n            </div>\n\n        </main>\n\n        <!-- 📱 移动端专属 iOS 底部 TabBar (md 及以上自动隐藏) -->\n        <nav class="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-tabbar border-t border-slate-200/60 safe-bottom-tab max-w-lg mx-auto">\n            <div class="grid grid-cols-4 py-1 text-center">\n                <button @click="activeTab = \'reminders\'" :class="[\'ios-btn-active py-1 flex flex-col items-center justify-center transition\', activeTab === \'reminders\' ? \'text-indigo-600 font-bold\' : \'text-slate-400\']">\n                    <span class="text-lg leading-tight mb-0.5">📅</span>\n                    <span class="text-[10px]">定时提醒</span>\n                </button>\n                <button @click="activeTab = \'templates\'" :class="[\'ios-btn-active py-1 flex flex-col items-center justify-center transition\', activeTab === \'templates\' ? \'text-indigo-600 font-bold\' : \'text-slate-400\']">\n                    <span class="text-lg leading-tight mb-0.5">🎨</span>\n                    <span class="text-[10px]">消息模板</span>\n                </button>\n                <button @click="activeTab = \'history\'" :class="[\'ios-btn-active py-1 flex flex-col items-center justify-center transition\', activeTab === \'history\' ? \'text-indigo-600 font-bold\' : \'text-slate-400\']">\n                    <span class="text-lg leading-tight mb-0.5">📜</span>\n                    <span class="text-[10px]">发送历史</span>\n                </button>\n                <button @click="activeTab = \'channels\'" :class="[\'ios-btn-active py-1 flex flex-col items-center justify-center transition\', activeTab === \'channels\' ? \'text-indigo-600 font-bold\' : \'text-slate-400\']">\n                    <span class="text-lg leading-tight mb-0.5">📡</span>\n                    <span class="text-[10px]">通知通道</span>\n                </button>\n            </div>\n        </nav>\n\n    </div>\n\n    <!-- ===================================================== -->\n    <!-- 🪟 模态框与弹窗（双端响应式：移动端底部抽屉 / 桌面端居中弹窗） -->\n    <!-- ===================================================== -->\n\n    <!-- 弹窗 1：新建 / 编辑提醒 -->\n    <div v-if="showAddModal" class="fixed inset-0 bg-black/60 z-40 flex items-end md:items-center justify-center backdrop-blur-xs transition-opacity p-0 md:p-4">\n        <div class="bg-white w-full md:max-w-xl rounded-t-3xl md:rounded-3xl max-h-[92vh] flex flex-col p-5 md:p-6 shadow-2xl safe-bottom-tab overflow-hidden animate-slide-up">\n            <div class="md:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>\n\n            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">\n                <h2 class="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">\n                    <span>{{ isEditingReminder ? \'✏️\' : \'⏰\' }}</span>\n                    <span>{{ isEditingReminder ? \'编辑定时提醒\' : \'新建智能提醒\' }}</span>\n                </h2>\n                <button @click="showAddModal = false" class="text-slate-400 hover:text-slate-600 p-1.5 text-base">✕</button>\n            </div>\n\n            <div class="flex-1 overflow-y-auto space-y-4 pr-1">\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">标题（可选）</label>\n                    <input v-model="form.title" type="text" placeholder="例如：爸妈生日 / 信用卡还款 / 初一吃素" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white">\n                </div>\n\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">提醒正文内容（必填）</label>\n                    <textarea v-model="form.content" placeholder="输入要推送到微信的提醒正文..." class="w-full border border-slate-300 rounded-xl p-3 text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"></textarea>\n                </div>\n\n                <!-- 调度配置入口卡片 -->\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">触发调度规则</label>\n                    <div @click="openScheduleModal" class="ios-card-active bg-gradient-to-r from-indigo-50/90 to-purple-50/90 border border-indigo-100 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer">\n                        <div class="flex items-center gap-3">\n                            <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-sm shadow-indigo-200">\n                                {{ form.calendar_type === \'lunar\' ? \'🏮\' : (form.calendar_type === \'solar\' ? \'☀️\' : \'⚡\') }}\n                            </div>\n                            <div>\n                                <div class="text-sm font-bold text-indigo-950 flex items-center gap-2">\n                                    <span>{{ scheduleSummary }}</span>\n                                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/80 text-indigo-700 font-bold border border-indigo-200">\n                                        {{ getCategoryBadge(form.calendar_type) }}\n                                    </span>\n                                </div>\n                                <p class="text-[11px] text-indigo-600/80 mt-0.5">点击重新配置时间与重复规律</p>\n                            </div>\n                        </div>\n                        <span class="text-indigo-400 font-bold text-base">➔</span>\n                    </div>\n                </div>\n\n                <!-- 模板选择 -->\n                <div>\n                    <div class="flex items-center justify-between mb-1">\n                        <label class="block text-xs font-bold text-slate-700">通知排版模板</label>\n                        <button @click="previewSelectedTemplate(form.template_id)" class="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">\n                            <span>👁️</span> 预览模板\n                        </button>\n                    </div>\n                    <select v-model="form.template_id" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white outline-none">\n                        <option v-for="t in templates" :key="t.id" :value="t.id">\n                            {{ t.name }}\n                        </option>\n                    </select>\n                </div>\n\n                <!-- 目标通道多选 -->\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">推送终端通道 ({{ (form.channel_ids || []).length }}个)</label>\n                    <div class="grid grid-cols-2 gap-2">\n                        <label v-for="c in channels" :key="c.id" :class="[\'border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition text-xs font-medium\', (form.channel_ids || []).includes(c.id) ? \'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold\' : \'border-slate-200 bg-slate-50 text-slate-600\']">\n                            <input type="checkbox" :value="c.id" v-model="form.channel_ids" class="rounded text-indigo-600">\n                            <span class="truncate">{{ c.name }}</span>\n                        </label>\n                    </div>\n                </div>\n            </div>\n\n            <!-- 底部操作按钮 -->\n            <div class="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">\n                <button @click="openFormPreview" class="ios-btn-active px-3.5 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center gap-1 transition">\n                    <span>👁️</span> 预览微信卡片\n                </button>\n                <div class="flex gap-2">\n                    <button @click="showAddModal = false" class="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 rounded-xl">取消</button>\n                    <button @click="saveReminder" :disabled="submitting" class="ios-btn-active px-6 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition">\n                        {{ isEditingReminder ? \'保存修改\' : \'立即创建\' }}\n                    </button>\n                </div>\n            </div>\n        </div>\n    </div>\n\n    <!-- 弹窗 2：调度配置 (通用 / 农历 / 公历) -->\n    <div v-if="showScheduleModal" class="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center backdrop-blur-xs p-0 md:p-4">\n        <div class="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[92vh] flex flex-col p-5 md:p-6 shadow-2xl safe-bottom-tab overflow-hidden animate-slide-up">\n            <div class="md:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>\n\n            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">\n                <h2 class="text-base font-bold text-slate-900">配置调度规律</h2>\n                <button @click="showScheduleModal = false" class="text-slate-400 hover:text-slate-600 p-1 text-base">✕</button>\n            </div>\n\n            <!-- 三列顶部分类切换 (通用 / 农历 / 公历) -->\n            <div class="grid grid-cols-3 bg-slate-100 p-1 rounded-2xl mb-4 text-xs font-bold">\n                <button @click="scheduleDraft.calendar_type = \'common\'; scheduleDraft.repeat_type = \'daily\'" :class="[\'py-2 rounded-xl transition\', scheduleDraft.calendar_type === \'common\' ? \'bg-white text-indigo-600 shadow-sm\' : \'text-slate-500\']">\n                    ⚡ 通用\n                </button>\n                <button @click="scheduleDraft.calendar_type = \'lunar\'; scheduleDraft.repeat_type = \'yearly\'" :class="[\'py-2 rounded-xl transition\', scheduleDraft.calendar_type === \'lunar\' ? \'bg-white text-amber-700 shadow-sm\' : \'text-slate-500\']">\n                    🏮 农历\n                </button>\n                <button @click="scheduleDraft.calendar_type = \'solar\'; scheduleDraft.repeat_type = \'yearly\'" :class="[\'py-2 rounded-xl transition\', scheduleDraft.calendar_type === \'solar\' ? \'bg-white text-blue-700 shadow-sm\' : \'text-slate-500\']">\n                    ☀️ 公历\n                </button>\n            </div>\n\n            <div class="flex-1 overflow-y-auto space-y-4 pr-0.5">\n                \n                <!-- 1. 通用体系 (每天 / 每周 / 倒计时) -->\n                <div v-if="scheduleDraft.calendar_type === \'common\'" class="space-y-3">\n                    <div class="grid grid-cols-4 gap-1.5 sm:gap-2">\n                        <button @click="scheduleDraft.repeat_type = \'daily\'" :class="[\'p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1\', scheduleDraft.repeat_type === \'daily\' ? \'border-indigo-500 bg-indigo-50/80 text-indigo-900 font-bold\' : \'border-slate-200 bg-slate-50 text-slate-600\']">\n                            <span class="text-lg sm:text-xl">🌅</span>\n                            <span class="text-[11px] sm:text-xs">每天重复</span>\n                        </button>\n                        <button @click="scheduleDraft.repeat_type = \'weekly\'" :class="[\'p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1\', scheduleDraft.repeat_type === \'weekly\' ? \'border-indigo-500 bg-indigo-50/80 text-indigo-900 font-bold\' : \'border-slate-200 bg-slate-50 text-slate-600\']">\n                            <span class="text-lg sm:text-xl">📅</span>\n                            <span class="text-[11px] sm:text-xs">每周几</span>\n                        </button>\n                        <button @click="scheduleDraft.repeat_type = \'once\'" :class="[\'p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1\', scheduleDraft.repeat_type === \'once\' ? \'border-indigo-500 bg-indigo-50/80 text-indigo-900 font-bold\' : \'border-slate-200 bg-slate-50 text-slate-600\']">\n                            <span class="text-lg sm:text-xl">⏱️</span>\n                            <span class="text-[11px] sm:text-xs">单次倒计时</span>\n                        </button>\n                        <button @click="scheduleDraft.repeat_type = \'cron\'" :class="[\'p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1\', scheduleDraft.repeat_type === \'cron\' ? \'border-indigo-500 bg-indigo-50/80 text-indigo-900 font-bold\' : \'border-slate-200 bg-slate-50 text-slate-600\']">\n                            <span class="text-lg sm:text-xl">⚙️</span>\n                            <span class="text-[11px] sm:text-xs">Cron表达式</span>\n                        </button>\n                    </div>\n\n                    <div v-if="scheduleDraft.repeat_type === \'weekly\'">\n                        <label class="block text-xs font-bold text-slate-700 mb-1">选择星期几</label>\n                        <select v-model="scheduleDraft.weekday" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50">\n                            <option :value="1">周一</option>\n                            <option :value="2">周二</option>\n                            <option :value="3">周三</option>\n                            <option :value="4">周四</option>\n                            <option :value="5">周五</option>\n                            <option :value="6">周六</option>\n                            <option :value="0">周日</option>\n                        </select>\n                    </div>\n\n                    <div v-if="scheduleDraft.repeat_type === \'once\'">\n                        <label class="block text-xs font-bold text-slate-700 mb-1">几分钟后触发</label>\n                        <input v-model.number="scheduleDraft.delay_minutes" type="number" min="1" placeholder="例如 15" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50">\n                    </div>\n\n                    <div v-if="scheduleDraft.repeat_type === \'cron\'" class="space-y-2">\n                        <label class="block text-xs font-bold text-slate-700 mb-1">标准 5 段 Cron 表达式 (分 时 日 月 周)</label>\n                        <input v-model="scheduleDraft.cron_expr" type="text" placeholder="例如 30 9 * * 1-5" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 font-mono focus:bg-white">\n                        <div class="flex flex-wrap gap-1.5 pt-1">\n                            <span class="text-[10px] text-slate-400 font-bold">快捷示例:</span>\n                            <button type="button" @click="scheduleDraft.cron_expr = \'30 9 * * 1-5\'" class="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-mono">工作日9:30</button>\n                            <button type="button" @click="scheduleDraft.cron_expr = \'0 */2 * * *\'" class="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-mono">每2小时</button>\n                            <button type="button" @click="scheduleDraft.cron_expr = \'0 10 1,15 * *\'" class="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-mono">每月1/15号10点</button>\n                            <button type="button" @click="scheduleDraft.cron_expr = \'*/15 * * * *\'" class="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-mono">每15分钟</button>\n                        </div>\n                    </div>\n                </div>\n\n                <!-- 2. 农历体系 (农历每年 / 农历每月) -->\n                <div v-if="scheduleDraft.calendar_type === \'lunar\'" class="space-y-3">\n                    <div class="grid grid-cols-2 gap-2">\n                        <button @click="scheduleDraft.repeat_type = \'yearly\'" :class="[\'p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1\', scheduleDraft.repeat_type === \'yearly\' ? \'border-amber-500 bg-amber-50 text-amber-950 font-bold\' : \'border-slate-200 bg-slate-50 text-slate-600\']">\n                            <span class="text-xl">🏮</span>\n                            <span class="text-xs">农历每年 (生日/节日)</span>\n                        </button>\n                        <button @click="scheduleDraft.repeat_type = \'monthly\'" :class="[\'p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1\', scheduleDraft.repeat_type === \'monthly\' ? \'border-amber-500 bg-amber-50 text-amber-950 font-bold\' : \'border-slate-200 bg-slate-50 text-slate-600\']">\n                            <span class="text-xl">🌙</span>\n                            <span class="text-xs">农历每月 (初一/十五)</span>\n                        </button>\n                    </div>\n\n                    <div v-if="scheduleDraft.repeat_type === \'yearly\'" class="grid grid-cols-2 gap-2">\n                        <div>\n                            <label class="block text-xs font-bold text-slate-700 mb-1">农历月份</label>\n                            <select v-model.number="scheduleDraft.lunar_month" class="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-slate-50">\n                                <option v-for="m in 12" :key="m" :value="m">农历 {{ m }} 月</option>\n                            </select>\n                        </div>\n                        <div>\n                            <label class="block text-xs font-bold text-slate-700 mb-1">农历日期</label>\n                            <select v-model.number="scheduleDraft.lunar_day" class="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-slate-50">\n                                <option v-for="d in 30" :key="d" :value="d">初 {{ d <= 10 ? d : d }} 日</option>\n                            </select>\n                        </div>\n                    </div>\n\n                    <div v-if="scheduleDraft.repeat_type === \'monthly\'">\n                        <label class="block text-xs font-bold text-slate-700 mb-1">农历每月几号</label>\n                        <select v-model.number="scheduleDraft.lunar_day" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50">\n                            <option :value="1">每月初一 (吃素/祈福)</option>\n                            <option :value="15">每月十五 (满月/上香)</option>\n                            <option v-for="d in 30" :key="d" :value="d">每月 {{ d }} 号</option>\n                        </select>\n                    </div>\n                </div>\n\n                <!-- 3. 公历体系 (公历每年 / 公历每月) -->\n                <div v-if="scheduleDraft.calendar_type === \'solar\'" class="space-y-3">\n                    <div class="grid grid-cols-2 gap-2">\n                        <button @click="scheduleDraft.repeat_type = \'yearly\'" :class="[\'p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1\', scheduleDraft.repeat_type === \'yearly\' ? \'border-blue-500 bg-blue-50 text-blue-950 font-bold\' : \'border-slate-200 bg-slate-50 text-slate-600\']">\n                            <span class="text-xl">🎂</span>\n                            <span class="text-xs">公历每年 (阳历生日)</span>\n                        </button>\n                        <button @click="scheduleDraft.repeat_type = \'monthly\'" :class="[\'p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1\', scheduleDraft.repeat_type === \'monthly\' ? \'border-blue-500 bg-blue-50 text-blue-950 font-bold\' : \'border-slate-200 bg-slate-50 text-slate-600\']">\n                            <span class="text-xl">🗓️</span>\n                            <span class="text-xs">公历每月 (固定几号)</span>\n                        </button>\n                    </div>\n\n                    <div v-if="scheduleDraft.repeat_type === \'yearly\'" class="grid grid-cols-2 gap-2">\n                        <div>\n                            <label class="block text-xs font-bold text-slate-700 mb-1">公历月份</label>\n                            <select v-model.number="scheduleDraft.yearly_month" class="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-slate-50">\n                                <option v-for="m in 12" :key="m" :value="m">{{ m }} 月</option>\n                            </select>\n                        </div>\n                        <div>\n                            <label class="block text-xs font-bold text-slate-700 mb-1">公历日期</label>\n                            <select v-model.number="scheduleDraft.yearly_day" class="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-slate-50">\n                                <option v-for="d in 31" :key="d" :value="d">{{ d }} 日</option>\n                            </select>\n                        </div>\n                    </div>\n\n                    <div v-if="scheduleDraft.repeat_type === \'monthly\'">\n                        <label class="block text-xs font-bold text-slate-700 mb-1">公历每月几号</label>\n                        <select v-model.number="scheduleDraft.monthly_day" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50">\n                            <option v-for="d in 31" :key="d" :value="d">每月 {{ d }} 号</option>\n                        </select>\n                    </div>\n                </div>\n\n                <!-- 触发具体时间点 (HH:mm) -->\n                <div v-if="scheduleDraft.repeat_type !== \'once\' && scheduleDraft.repeat_type !== \'cron\'">\n                    <label class="block text-xs font-bold text-slate-700 mb-1">触发具体时间</label>\n                    <input v-model="scheduleDraft.time" type="time" class="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 font-mono">\n                </div>\n            </div>\n\n            <div class="flex justify-end gap-2 pt-4 mt-3 border-t border-slate-100">\n                <button @click="showScheduleModal = false" class="px-4 py-2 text-xs text-slate-500 rounded-xl">取消</button>\n                <button @click="applyScheduleDraft" class="ios-btn-active px-6 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition">\n                    保存调度\n                </button>\n            </div>\n        </div>\n    </div>\n\n    <!-- 弹窗 3：即时直发微信模态框 -->\n    <div v-if="showDirectSendModal" class="fixed inset-0 bg-black/60 z-40 flex items-end md:items-center justify-center backdrop-blur-xs p-0 md:p-4">\n        <div class="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[90vh] flex flex-col p-5 md:p-6 shadow-2xl safe-bottom-tab overflow-hidden animate-slide-up">\n            <div class="md:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>\n\n            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">\n                <h2 class="text-base font-bold text-slate-900 flex items-center gap-1.5">\n                    <span>⚡</span>\n                    <span>即时直发微信</span>\n                </h2>\n                <button @click="showDirectSendModal = false" class="text-slate-400 hover:text-slate-600 p-1 text-base">✕</button>\n            </div>\n\n            <div class="space-y-4 overflow-y-auto pr-0.5">\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">推送正文消息</label>\n                    <textarea v-model="directSendForm.message" placeholder="输入要立刻推送的消息内容..." class="w-full border border-slate-300 rounded-xl p-3 text-sm h-28 resize-none bg-slate-50 focus:bg-white"></textarea>\n                </div>\n\n                <div>\n                    <div class="flex items-center justify-between mb-1">\n                        <label class="block text-xs font-bold text-slate-700">套用消息模板</label>\n                        <button @click="previewSelectedTemplate(directSendForm.template_id)" class="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">\n                            <span>👁️</span> 预览模板\n                        </button>\n                    </div>\n                    <select v-model="directSendForm.template_id" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs bg-slate-50">\n                        <option value="tpl_direct_default">标准即时通知模板 (推荐)</option>\n                        <option value="tpl_raw">纯文本不包裹模板</option>\n                        <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>\n                    </select>\n                </div>\n\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">发送目标通道</label>\n                    <div class="grid grid-cols-2 gap-2">\n                        <label v-for="c in channels" :key="c.id" :class="[\'border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition text-xs font-medium\', (directSendForm.channel_ids || []).includes(c.id) ? \'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold\' : \'border-slate-200 bg-slate-50 text-slate-600\']">\n                            <input type="checkbox" :value="c.id" v-model="directSendForm.channel_ids" class="rounded text-emerald-600">\n                            <span class="truncate">{{ c.name }}</span>\n                        </label>\n                    </div>\n                </div>\n            </div>\n\n            <div class="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">\n                <button @click="openDirectPreview" class="ios-btn-active px-3 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center gap-1 transition">\n                    <span>👁️</span> 预览微信卡片\n                </button>\n                <div class="flex gap-2">\n                    <button @click="showDirectSendModal = false" class="px-4 py-2 text-xs text-slate-500 rounded-xl">取消</button>\n                    <button @click="sendDirectNow" :disabled="sendingDirect" class="ios-btn-active px-5 py-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition">\n                        {{ sendingDirect ? \'正在发送...\' : \'立刻发送 🚀\' }}\n                    </button>\n                </div>\n            </div>\n        </div>\n    </div>\n\n    <!-- 弹窗 4：微信卡片所见即所得实时预览模态框 -->\n    <div v-if="showPreviewModal" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm p-4">\n        <div class="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-3.5 animate-scale-up border border-slate-200">\n            <div class="flex items-center justify-between pb-2 border-b border-slate-100">\n                <div class="flex items-center gap-2">\n                    <span class="text-base">💬</span>\n                    <h3 class="text-sm font-bold text-slate-900">微信卡片渲染效果预览</h3>\n                </div>\n                <button @click="showPreviewModal = false" class="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold">✕</button>\n            </div>\n\n            <div class="bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200/60 max-h-[65vh] overflow-y-auto">\n                <div class="wechat-preview-card" v-html="previewHtml"></div>\n            </div>\n\n            <div class="flex items-center justify-between pt-2 text-[11px] text-slate-400">\n                <span>所见即所得 · 原生微信排版</span>\n                <button @click="showPreviewModal = false" class="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-xl text-xs">关闭</button>\n            </div>\n        </div>\n    </div>\n\n    <!-- 弹窗 5：消息模板编辑 -->\n    <div v-if="showTemplateModal" class="fixed inset-0 bg-black/60 z-40 flex items-end md:items-center justify-center backdrop-blur-xs p-0 md:p-4">\n        <div class="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[90vh] flex flex-col p-5 md:p-6 shadow-2xl safe-bottom-tab overflow-hidden animate-slide-up">\n            <div class="md:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>\n\n            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">\n                <h2 class="text-base font-bold text-slate-900">{{ templateForm.id ? \'编辑消息模板\' : \'新建消息模板\' }}</h2>\n                <button @click="showTemplateModal = false" class="text-slate-400 p-1 text-base">✕</button>\n            </div>\n\n            <div class="space-y-3 overflow-y-auto pr-0.5">\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">模板名称</label>\n                    <input v-model="templateForm.name" type="text" placeholder="例如：生日特别排版" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white">\n                </div>\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">Markdown 格式模板</label>\n                    <textarea v-model="templateForm.content" placeholder="输入 Markdown 内容模板..." class="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono h-40 resize-none bg-slate-50 focus:bg-white"></textarea>\n                </div>\n            </div>\n\n            <div class="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">\n                <button @click="previewTemplateDraft" class="ios-btn-active px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl flex items-center gap-1">\n                    <span>👁️</span> 预览模板\n                </button>\n                <div class="flex gap-2">\n                    <button @click="showTemplateModal = false" class="px-4 py-2 text-xs text-slate-600 rounded-xl">取消</button>\n                    <button @click="saveTemplate" class="ios-btn-active px-5 py-2 text-xs bg-indigo-600 text-white font-bold rounded-xl shadow-md">保存模板</button>\n                </div>\n            </div>\n        </div>\n    </div>\n\n    <!-- 弹窗 6：挂载通道抽屉 -->\n    <div v-if="showAddChannelModal" class="fixed inset-0 bg-black/60 z-40 flex items-end md:items-center justify-center backdrop-blur-xs p-0 md:p-4">\n        <div class="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl max-h-[85vh] flex flex-col p-5 md:p-6 shadow-2xl safe-bottom-tab overflow-hidden animate-slide-up">\n            <div class="md:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3"></div>\n\n            <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">\n                <h2 class="text-base font-bold text-slate-900">挂载新通知通道</h2>\n                <button @click="showAddChannelModal = false" class="text-slate-400 p-1 text-base">✕</button>\n            </div>\n\n            <div class="space-y-3 overflow-y-auto pr-0.5">\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">通道 ID (唯一)</label>\n                    <input v-model="channelForm.id" type="text" placeholder="例如 xiaoniu_wx" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white">\n                </div>\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">通道名称</label>\n                    <input v-model="channelForm.name" type="text" placeholder="例如 小牛VPS微信直通" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white">\n                </div>\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">接口 URL</label>\n                    <input v-model="channelForm.endpoint_url" type="text" placeholder="例如 http://198.200.49.120:8765/send" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white">\n                </div>\n                <div>\n                    <label class="block text-xs font-bold text-slate-700 mb-1">Token 密钥 (可选)</label>\n                    <input v-model="channelForm.auth_key" type="text" placeholder="通信鉴权密钥" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white">\n                </div>\n            </div>\n\n            <div class="flex justify-end gap-2 pt-3 mt-3 border-t border-slate-100">\n                <button @click="showAddChannelModal = false" class="px-4 py-2 text-xs text-slate-600 rounded-xl">取消</button>\n                <button @click="saveChannel" class="ios-btn-active px-5 py-2 text-xs bg-slate-900 text-white font-bold rounded-xl shadow-md">保存通道</button>\n            </div>\n        </div>\n    </div>\n\n</div>\n\n<script>\nconst { createApp, ref, computed, onMounted } = Vue;\n\ncreateApp({\n    setup() {\n        const activeTab = ref(\'reminders\');\n        const reminders = ref([]);\n        const sendHistory = ref([]);\n        const sendHistoryLoading = ref(false);\n        const channels = ref([]);\n        const templates = ref([]);\n        const loading = ref(false);\n        const showAddModal = ref(false);\n        const showScheduleModal = ref(false);\n        const showPreviewModal = ref(false);\n        const showAddChannelModal = ref(false);\n        const showDirectSendModal = ref(false);\n        const showTemplateModal = ref(false);\n        const isEditingReminder = ref(false);\n        const submitting = ref(false);\n        const sendingDirect = ref(false);\n        const previewHtml = ref(\'\');\n\n        const form = ref({\n            id: \'\',\n            title: \'\',\n            content: \'\',\n            calendar_type: \'common\',\n            repeat_type: \'daily\',\n            template_id: \'tpl_standard\',\n            channel_ids: [\'default_wx\'],\n            time: \'09:00\',\n            weekday: 5,\n            monthly_day: 10,\n            yearly_month: 10,\n            yearly_day: 27,\n            lunar_month: 9,\n            lunar_day: 18,\n            delay_minutes: 15,\n            cron_expr: \'30 9 * * 1-5\',\n            run_at: \'\'\n        });\n\n        // 调度配置子弹窗暂存状态 (三列体系: common | lunar | solar)\n        const scheduleDraft = ref({\n            calendar_type: \'common\',\n            repeat_type: \'daily\',\n            time: \'09:00\',\n            weekday: 5,\n            monthly_day: 10,\n            yearly_month: 10,\n            yearly_day: 27,\n            lunar_month: 9,\n            lunar_day: 18,\n            delay_minutes: 15,\n            cron_expr: \'30 9 * * 1-5\',\n            run_at: \'\'\n        });\n\n        const directSendForm = ref({\n            message: \'\',\n            template_id: \'tpl_direct_default\',\n            channel_ids: [\'default_wx\']\n        });\n\n        const templateForm = ref({\n            id: \'\',\n            name: \'\',\n            type: \'reminder\',\n            content: \'\'\n        });\n\n        const channelForm = ref({\n            id: \'\',\n            name: \'\',\n            endpoint_url: \'\',\n            auth_key: \'hermes-weixin-direct-key-2024\'\n        });\n\n        // 计算当前主表单的调度规则摘要\n        const scheduleSummary = computed(() => {\n            const f = form.value;\n            if (f.calendar_type === \'lunar\') {\n                if (f.repeat_type === \'yearly\') {\n                    return `农历每年 ${f.lunar_month || 1}月${f.lunar_day || 1}日 ${f.time || \'09:00\'}`;\n                } else {\n                    return `农历每月 ${f.lunar_day || 1}日 ${f.time || \'09:00\'}`;\n                }\n            } else if (f.calendar_type === \'solar\') {\n                if (f.repeat_type === \'yearly\') {\n                    return `公历每年 ${f.yearly_month || 1}月${f.yearly_day || 1}日 ${f.time || \'09:00\'}`;\n                } else {\n                    return `公历每月 ${f.monthly_day || 1}号 ${f.time || \'09:00\'}`;\n                }\n            } else {\n                if (f.repeat_type === \'daily\') {\n                    return `每日固定 ${f.time || \'09:00\'}`;\n                } else if (f.repeat_type === \'weekly\') {\n                    const wMap = [\'周日\', \'周一\', \'周二\', \'周三\', \'周四\', \'周五\', \'周六\'];\n                    return `每周${wMap[f.weekday] || \'五\'} ${f.time || \'09:00\'}`;\n                } else if (f.repeat_type === \'cron\') {\n                    return `⚙️ Cron: ${f.cron_expr || \'30 9 * * 1-5\'}`;\n                } else {\n                    return `单次延时 (${f.delay_minutes || 15}分钟后)`;\n                }\n            }\n        });\n\n        const getCategoryIcon = (cal) => {\n            if (cal === \'lunar\') return \'🏮\';\n            if (cal === \'solar\') return \'☀️\';\n            return \'⚡\';\n        };\n\n        const getCategoryBadge = (cal) => {\n            if (cal === \'lunar\') return \'🏮 农历\';\n            if (cal === \'solar\') return \'☀️ 公历\';\n            return \'⚡ 通用\';\n        };\n\n        const openAddModal = () => {\n            isEditingReminder.value = false;\n            form.value = {\n                id: \'\',\n                title: \'\',\n                content: \'\',\n                calendar_type: \'common\',\n                repeat_type: \'daily\',\n                template_id: templates.value[0]?.id || \'tpl_standard\',\n                channel_ids: channels.value.length > 0 ? [channels.value[0].id] : [\'default_wx\'],\n                time: \'09:00\',\n                weekday: 5,\n                monthly_day: 10,\n                yearly_month: 10,\n                yearly_day: 27,\n                lunar_month: 9,\n                lunar_day: 18,\n                delay_minutes: 15,\n                run_at: \'\'\n            };\n            scheduleDraft.value = { ...form.value };\n            showAddModal.value = true;\n        };\n\n        // 编辑已有提醒任务\n        const editReminder = (r) => {\n            isEditingReminder.value = true;\n            let rule = {};\n            try {\n                rule = JSON.parse(r.rule_detail || \'{}\');\n            } catch (e) {}\n\n            form.value = {\n                id: r.id,\n                title: r.title || \'\',\n                content: r.content || \'\',\n                calendar_type: r.calendar_type || \'common\',\n                repeat_type: r.repeat_type || \'daily\',\n                template_id: r.template_id || \'tpl_standard\',\n                channel_ids: r.channel_ids || [\'default_wx\'],\n                time: rule.time || \'09:00\',\n                weekday: rule.weekday !== undefined ? rule.weekday : 5,\n                monthly_day: rule.monthly_day || 10,\n                yearly_month: rule.yearly_month || 10,\n                yearly_day: rule.yearly_day || 27,\n                lunar_month: rule.lunar_month || 9,\n                lunar_day: rule.lunar_day || 18,\n                delay_minutes: rule.delay_minutes || 15,\n                cron_expr: rule.cron_expr || \'30 9 * * 1-5\',\n                run_at: rule.run_at || \'\'\n            };\n\n            scheduleDraft.value = { ...form.value };\n            showAddModal.value = true;\n        };\n\n        const openScheduleModal = () => {\n            scheduleDraft.value = { ...form.value };\n            showScheduleModal.value = true;\n        };\n\n        const applyScheduleDraft = () => {\n            Object.assign(form.value, scheduleDraft.value);\n            showScheduleModal.value = false;\n        };\n\n        const openAddTemplateModal = () => {\n            templateForm.value = { id: \'\', name: \'\', type: \'reminder\', content: \'### 🔔 {{title}}\\n\\n> **🕒 时间**：{{time}}\\n\\n---\\n\\n{{content}}\' };\n            showTemplateModal.value = true;\n        };\n\n        const editTemplate = (t) => {\n            templateForm.value = { ...t };\n            showTemplateModal.value = true;\n        };\n\n        // 渲染辅助\n        const renderMarkdown = (tplStr, vars) => {\n            let res = tplStr;\n            for (const [k, v] of Object.entries(vars)) {\n                res = res.replaceAll(`{{${k}}}`, v !== undefined && v !== null ? v : \'\');\n            }\n            return marked.parse(res);\n        };\n\n        // 预览主表单提醒卡片\n        const openFormPreview = () => {\n            const tpl = templates.value.find(t => t.id === form.value.template_id) || templates.value[0] || { content: \'{{content}}\' };\n            const vars = {\n                title: form.value.title || \'智能提醒任务\',\n                content: form.value.content || \'（这里是提醒正文示例内容）\',\n                time: new Date().toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false }),\n                type: scheduleSummary.value,\n                channel_name: (form.value.channel_ids || []).map(getChannelName).join(\' + \') || \'微信直通\'\n            };\n            previewHtml.value = renderMarkdown(tpl.content, vars);\n            showPreviewModal.value = true;\n        };\n\n        // 预览即时直发卡片\n        const openDirectPreview = () => {\n            const tpl = templates.value.find(t => t.id === directSendForm.value.template_id) || templates.value[0] || { content: \'{{content}}\' };\n            const vars = {\n                title: \'即时直发通知\',\n                content: directSendForm.value.message || \'（这里是即时直发消息示例内容）\',\n                time: new Date().toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false }),\n                type: \'即时通知\',\n                channel_name: (directSendForm.value.channel_ids || []).map(getChannelName).join(\' + \') || \'微信直通\'\n            };\n            previewHtml.value = renderMarkdown(tpl.content, vars);\n            showPreviewModal.value = true;\n        };\n\n        // 预览指定选中的模板\n        const previewSelectedTemplate = (tplId) => {\n            const t = templates.value.find(x => x.id === tplId) || templates.value[0];\n            if (t) previewTemplate(t);\n        };\n\n        // 预览现有任务\n        const previewReminder = (r) => {\n            const tpl = templates.value.find(t => t.id === r.template_id) || templates.value[0] || { content: \'{{content}}\' };\n            const vars = {\n                title: r.title || \'智能定时提醒\',\n                content: r.content,\n                time: new Date(r.next_trigger_at || Date.now()).toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false }),\n                type: getRepeatLabel(r.repeat_type, r.calendar_type),\n                channel_name: (r.channel_ids || []).map(getChannelName).join(\' + \')\n            };\n            previewHtml.value = renderMarkdown(tpl.content, vars);\n            showPreviewModal.value = true;\n        };\n\n        // 预览模板列表中的模板\n        const previewTemplate = (t) => {\n            const vars = {\n                title: \'测试提醒标题\',\n                content: \'这是一条用于演示该 Markdown 模板效果的示例文本内容。\\n- 支持列表与重点强调\\n- 支持引用与表情\',\n                time: new Date().toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false }),\n                type: \'🏮 农历 · 每年\',\n                channel_name: \'本地微信直通\'\n            };\n            previewHtml.value = renderMarkdown(t.content, vars);\n            showPreviewModal.value = true;\n        };\n\n        const previewTemplateDraft = () => {\n            const vars = {\n                title: templateForm.value.name || \'模板预览标题\',\n                content: \'这是模板草稿的内容测试。\',\n                time: new Date().toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false }),\n                type: \'⚡ 通用 · 每日\',\n                channel_name: \'微信直通通道\'\n            };\n            previewHtml.value = renderMarkdown(templateForm.value.content, vars);\n            showPreviewModal.value = true;\n        };\n\n        // 加载发送历史\n        const loadSendHistory = async () => {\n            sendHistoryLoading.value = true;\n            try {\n                const res = await fetch(\'api/send_history?limit=100\');\n                const data = await res.json();\n                sendHistory.value = data.history || [];\n            } catch (e) {\n                console.error(\'加载发送历史失败:\', e);\n            } finally {\n                sendHistoryLoading.value = false;\n            }\n        };\n\n        const previewFromHistory = (item) => {\n            if (!item.message) return;\n            previewHtml.value = marked.parse(item.message);\n            showPreviewModal.value = true;\n        };\n\n        const copyMessage = (msg) => {\n            if (!msg) return;\n            if (navigator.clipboard && navigator.clipboard.writeText) {\n                navigator.clipboard.writeText(msg).then(() => {\n                    alert(\'已复制消息内容\');\n                }).catch(() => {\n                    prompt(\'请手动复制:\', msg);\n                });\n            } else {\n                prompt(\'请手动复制:\', msg);\n            }\n        };\n\n        const formatRelativeTime = (timestamp) => {\n            if (!timestamp) return \'\';\n            const date = new Date(timestamp);\n            const now = new Date();\n            const diff = now - date;\n            const minutes = Math.floor(diff / 60000);\n            const hours = Math.floor(diff / 3600000);\n            const days = Math.floor(diff / 86400000);\n            \n            if (minutes < 1) return \'刚刚\';\n            if (minutes < 60) return `${minutes} 分钟前`;\n            if (hours < 24) return `${hours} 小时前`;\n            if (days < 7) return `${days} 天前`;\n            return date.toLocaleDateString(\'zh-CN\', { month: \'2-digit\', day: \'2-digit\' });\n        };\n\n        const loadData = async () => {\n            loading.value = true;\n            try {\n                const [rRes, cRes, tRes] = await Promise.all([\n                    fetch(\'api/reminders\').then(r => r.json()),\n                    fetch(\'api/channels\').then(r => r.json()),\n                    fetch(\'api/templates\').then(r => r.json())\n                ]);\n                reminders.value = rRes.reminders || [];\n                channels.value = cRes.channels || [];\n                templates.value = tRes.templates || [];\n                // 同时静默拉取发送历史\n                loadSendHistory();\n            } catch (e) {\n                console.error(\'加载失败:\', e);\n            } finally {\n                loading.value = false;\n            }\n        };\n\n        const saveTemplate = async () => {\n            if (!templateForm.value.name.trim() || !templateForm.value.content.trim()) return alert(\'请填写模板名称和内容\');\n            try {\n                const res = await fetch(\'api/templates\', {\n                    method: \'POST\',\n                    headers: { \'Content-Type\': \'application/json\' },\n                    body: JSON.stringify(templateForm.value)\n                });\n                const data = await res.json();\n                if (data.success) {\n                    showTemplateModal.value = false;\n                    await loadData();\n                } else {\n                    alert(\'保存模板失败: \' + (data.error || \'未知错误\'));\n                }\n            } catch (e) {\n                alert(\'请求异常: \' + e.message);\n            }\n        };\n\n        const deleteTemplate = async (id) => {\n            if (!confirm(\'确定删除该模板？\')) return;\n            try {\n                await fetch(\'api/templates/\' + id, { method: \'DELETE\' });\n                await loadData();\n            } catch (e) {\n                alert(\'删除失败: \' + e.message);\n            }\n        };\n\n        const sendDirectNow = async () => {\n            if (!directSendForm.value.message.trim()) return alert(\'请输入要直发的消息内容\');\n            if (!directSendForm.value.channel_ids || directSendForm.value.channel_ids.length === 0) return alert(\'请至少选择一个目标通道\');\n            sendingDirect.value = true;\n            try {\n                const res = await fetch(\'api/send\', {\n                    method: \'POST\',\n                    headers: { \'Content-Type\': \'application/json\' },\n                    body: JSON.stringify(directSendForm.value)\n                });\n                const data = await res.json();\n                if (data.ok) {\n                    alert(\'⚡ 消息已直发成功！\');\n                    directSendForm.value.message = \'\';\n                    showDirectSendModal.value = false;\n                } else {\n                    alert(\'发送失败: \' + (data.error || \'未知错误\'));\n                }\n            } catch (e) {\n                alert(\'请求异常: \' + e.message);\n            } finally {\n                sendingDirect.value = false;\n            }\n        };\n\n        const saveReminder = async () => {\n            if (!form.value.content.trim()) return alert(\'请填写提醒内容\');\n            if (!form.value.channel_ids || form.value.channel_ids.length === 0) return alert(\'请至少勾选一个通知通道\');\n            submitting.value = true;\n            try {\n                const isEdit = isEditingReminder.value && !!form.value.id;\n                const endpoint = isEdit ? `api/reminders/${form.value.id}` : \'api/reminders\';\n                const method = isEdit ? \'PUT\' : \'POST\';\n\n                const res = await fetch(endpoint, {\n                    method: method,\n                    headers: { \'Content-Type\': \'application/json\' },\n                    body: JSON.stringify(form.value)\n                });\n                const data = await res.json();\n                if (data.success) {\n                    showAddModal.value = false;\n                    await loadData();\n                } else {\n                    alert(\'保存失败: \' + (data.error || \'未知错误\'));\n                }\n            } catch (e) {\n                alert(\'请求异常: \' + e.message);\n            } finally {\n                submitting.value = false;\n            }\n        };\n\n        // 手动测试试发（纯测试，不消耗/推迟下一次正常定时）\n        const testSendReminder = async (r) => {\n            if (!confirm(`确定要立即向微信发送一条【${r.title || \'该提醒\'}】的测试消息吗？\\n\\n💡 提示：这仅为即时测试，原定的定时提醒计划保持不变。`)) return;\n            \n            try {\n                const res = await fetch(\'api/send\', {\n                    method: \'POST\',\n                    headers: { \'Content-Type\': \'application/json\' },\n                    body: JSON.stringify({\n                        title: r.title ? `[测试] ${r.title}` : \'[测试提醒]\',\n                        message: r.content,\n                        template_id: r.template_id || \'tpl_standard\',\n                        channel_ids: r.channel_ids || [\'default_wx\']\n                    })\n                });\n                const data = await res.json();\n                if (data.ok) {\n                    alert(\'🚀 测试消息已即时发出！原定定时计划不受任何影响。\');\n                    loadSendHistory();\n                } else {\n                    alert(\'试发失败: \' + (data.error || \'未知错误\'));\n                }\n            } catch (e) {\n                alert(\'试发异常: \' + e.message);\n            }\n        };\n\n        const deleteReminder = async (id) => {\n            if (!confirm(\'确定删除该提醒？\')) return;\n            try {\n                await fetch(\'api/reminders/\' + id, { method: \'DELETE\' });\n                await loadData();\n            } catch (e) {\n                alert(\'删除失败: \' + e.message);\n            }\n        };\n\n        const saveChannel = async () => {\n            if (!channelForm.value.id || !channelForm.value.endpoint_url) return alert(\'请填写通道 ID 和接口 URL\');\n            try {\n                await fetch(\'api/channels\', {\n                    method: \'POST\',\n                    headers: { \'Content-Type\': \'application/json\' },\n                    body: JSON.stringify(channelForm.value)\n                });\n                showAddChannelModal.value = false;\n                await loadData();\n            } catch (e) {\n                alert(\'添加通道失败: \' + e.message);\n            }\n        };\n\n        const getRepeatLabel = (t, cal) => {\n            if (cal === \'lunar\') {\n                return t === \'yearly\' ? \'农历 · 每年\' : \'农历 · 每月\';\n            }\n            if (cal === \'solar\') {\n                return t === \'yearly\' ? \'公历 · 每年\' : \'公历 · 每月\';\n            }\n            const map = { daily: \'每日重复\', weekly: \'每周重复\', once: \'单次倒计时\' };\n            return map[t] || t;\n        };\n\n        const getChannelName = (id) => {\n            const c = channels.value.find(x => x.id === id);\n            return c ? c.name : id;\n        };\n\n        const getTemplateName = (id) => {\n            const t = templates.value.find(x => x.id === id);\n            return t ? t.name : (id || \'默认模板\');\n        };\n\n        const formatTimestamp = (ts) => {\n            if (!ts) return \'N/A\';\n            const d = new Date(ts);\n            return d.toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', hour12: false });\n        };\n\n        const formatTime = (ts) => {\n            if (!ts) return \'\';\n            return new Date(ts).toLocaleString(\'zh-CN\', { timeZone: \'Asia/Shanghai\', month: \'2-digit\', day: \'2-digit\', hour: \'2-digit\', minute: \'2-digit\', hour12: false });\n        };\n\n        onMounted(() => {\n            loadData();\n        });\n\n        return {\n            activeTab, reminders, sendHistory, sendHistoryLoading, channels, templates, loading, showAddModal, showScheduleModal, showPreviewModal, showAddChannelModal, showDirectSendModal, showTemplateModal, isEditingReminder, submitting, sendingDirect,\n            form, scheduleDraft, channelForm, directSendForm, templateForm, scheduleSummary, previewHtml,\n            openAddModal, editReminder, openScheduleModal, applyScheduleDraft, openAddTemplateModal, editTemplate,\n            openFormPreview, openDirectPreview, previewReminder, previewTemplate, previewTemplateDraft, previewSelectedTemplate,\n            loadData, loadSendHistory, previewFromHistory, copyMessage, formatRelativeTime,\n            saveReminder, deleteReminder, saveChannel, saveTemplate, deleteTemplate, sendDirectNow,\n            getRepeatLabel, getChannelName, getTemplateName, getCategoryIcon, getCategoryBadge, formatTimestamp, formatTime\n        };\n    }\n}).mount(\'#app\');\n</script>\n</body>\n</html>\n';

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

function getNextCronTimestamp(cronExpr, fromTime = Date.now()) {
    if (!cronExpr || typeof cronExpr !== 'string') return null;
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length !== 5) return null;

    const [minPart, hourPart, dayPart, monthPart, weekPart] = parts;

    function parseField(field, minVal, maxVal) {
        const allowed = new Set();
        const segments = field.split(',');
        for (const seg of segments) {
            if (seg === '*') {
                for (let i = minVal; i <= maxVal; i++) allowed.add(i);
            } else if (seg.startsWith('*/')) {
                const step = parseInt(seg.slice(2), 10);
                if (step > 0) {
                    for (let i = minVal; i <= maxVal; i += step) allowed.add(i);
                }
            } else if (seg.includes('-')) {
                const [start, end] = seg.split('-').map(x => parseInt(x, 10));
                for (let i = start; i <= end; i++) allowed.add(i);
            } else {
                const val = parseInt(seg, 10);
                if (!isNaN(val)) allowed.add(val);
            }
        }
        return allowed;
    }

    const mins = parseField(minPart, 0, 59);
    const hours = parseField(hourPart, 0, 23);
    const days = parseField(dayPart, 1, 31);
    const months = parseField(monthPart, 1, 12);
    const weeks = parseField(weekPart, 0, 6);
    if (weeks.has(7)) weeks.add(0);

    let iter = new Date(fromTime + 60000);
    iter.setSeconds(0, 0);

    const maxLimit = fromTime + 5 * 365 * 86400 * 1000;
    while (iter.getTime() < maxLimit) {
        const m = iter.getMonth() + 1;
        if (!months.has(m)) {
            iter.setMonth(iter.getMonth() + 1, 1);
            iter.setHours(0, 0, 0, 0);
            continue;
        }

        const d = iter.getDate();
        const w = iter.getDay();
        const dayMatch = dayPart === '*' ? true : days.has(d);
        const weekMatch = weekPart === '*' ? true : weeks.has(w);

        let dateMatches = false;
        if (dayPart !== '*' && weekPart !== '*') {
            dateMatches = dayMatch || weekMatch;
        } else {
            dateMatches = dayMatch && weekMatch;
        }

        if (!dateMatches) {
            iter.setDate(iter.getDate() + 1);
            iter.setHours(0, 0, 0, 0);
            continue;
        }

        const h = iter.getHours();
        if (!hours.has(h)) {
            iter.setHours(iter.getHours() + 1, 0, 0, 0);
            continue;
        }

        const mi = iter.getMinutes();
        if (!mins.has(mi)) {
            iter.setMinutes(iter.getMinutes() + 1, 0, 0);
            continue;
        }

        return iter.getTime();
    }
    return null;
}

function getNextSolarTrigger(repeatType, targetDate, targetTime, cronExpr) {
    const now = new Date();
    if (repeatType === 'cron') {
        return getNextCronTimestamp(cronExpr || targetDate, now.getTime());
    }

    const [hours, minutes] = (targetTime || '09:00').split(':').map(Number);
    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

    if (repeatType === 'daily') {
        if (target <= now) {
            target.setDate(target.getDate() + 1);
        }
    } else if (repeatType === 'weekly') {
        const targetDay = parseInt(targetDate || '5');
        let diff = targetDay - now.getDay();
        if (diff < 0 || (diff === 0 && target <= now)) {
            diff += 7;
        }
        target.setDate(target.getDate() + diff);
    } else if (repeatType === 'monthly') {
        const targetDay = parseInt(targetDate || '10');
        target.setDate(targetDay);
        if (target <= now) {
            target.setMonth(target.getMonth() + 1);
        }
    } else if (repeatType === 'yearly') {
        const [m, d] = (targetDate || '10-27').split('-').map(Number);
        target = new Date(now.getFullYear(), m - 1, d, hours, minutes, 0, 0);
        if (target <= now) {
            target.setFullYear(target.getFullYear() + 1);
        }
    } else if (repeatType === 'once') {
        if (targetDate && targetDate.includes('-')) {
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

function getNextTrigger(calendarType, repeatType, targetDate, targetTime, cronExpr) {
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
        return getNextSolarTrigger(repeatType, targetDate, targetTime, cronExpr);
    }
}

function renderTemplate(templateContent, variables) {
    let rendered = templateContent || '';
    for (const [key, value] of Object.entries(variables)) {
        rendered = rendered.replace(new RegExp(`\\{{\\s*${key}\\s*\\}}`, 'g'), value || '');
    }
    return rendered;
}

function formatReminderMessage(r, templateMap, channelMap) {
    const tpl = templateMap[r.template_id] || templateMap['tpl_standard'] || {
        content: '### 🔔 {{title}}\n\n> ⏰ **触发时间**: {{time}}\n> 🏷️ **提醒分类**: {{type}}\n\n---\n\n{{content}}'
    };

    let typeStr = r.calendar_type === 'lunar' ? '农历' : (['daily', 'weekly', 'once', 'cron'].includes(r.repeat_type) ? '通用' : '公历');
    let repeatName = { yearly: '每年', monthly: '每月', weekly: '每周', daily: '每天', once: '单次', cron: 'Cron表达式' }[r.repeat_type] || r.repeat_type;
    let fullType = `${typeStr} · ${repeatName} (${r.target_date || ''} ${r.target_time || ''})`;

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

async function checkAndTriggerReminders(env) {
    const now = Date.now();
    
    const { results: dueReminders } = await env.DB.prepare(
        'SELECT * FROM reminders WHERE enabled = 1 AND next_trigger_at <= ?'
    ).bind(now).all();

    if (!dueReminders || dueReminders.length === 0) return;

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

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        if (method === 'OPTIONS') {
            return jsonResponse({ ok: true });
        }

        if (path === '/' || path === '/index.html' || path === '/reminder' || path === '/reminder/') {
            return new Response(HTML, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        if (path === '/api/health') {
            return jsonResponse({ status: 'ok', serverless: true, timestamp: Date.now() });
        }

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
            const nextTrigger = getNextTrigger(b.calendar_type, b.repeat_type, b.target_date || b.cron_expr, b.target_time, b.cron_expr);

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
                b.calendar_type, b.repeat_type, b.target_date || b.cron_expr || '', b.target_time || '',
                JSON.stringify(targetChans), nextTrigger
            ).run();

            return jsonResponse({ ok: true, id, next_trigger_at: nextTrigger });
        }

        if (path.startsWith('/api/reminders/') && method === 'DELETE') {
            const id = path.split('/')[3];
            await env.DB.prepare('DELETE FROM reminders WHERE id = ?').bind(id).run();
            return jsonResponse({ ok: true });
        }

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

    async scheduled(event, env, ctx) {
        ctx.waitUntil(checkAndTriggerReminders(env));
    }
};
