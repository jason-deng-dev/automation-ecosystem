export default {
	// Nav
	navTitle: "控制台",
	nav: {
		home: "首页",
		xhs: "小红书",
		rakuten: "乐天",
		scraper: "赛事爬虫",
	},

	// Section titles
	xhsPipeline: "小红书 · 运行状态",
	errorsByType: "错误类型统计",
	postTypes: "帖子类型",
	apiTokens: "API 用量（累计）",

	// Labels
	pipelineState: "当前状态",
	lastRun: "上次运行",
	lastStatus: "上次状态",
	nextPost: "下次发布",
	successRate30d: "成功率（30天）",
	input: "输入",
	output: "输出",

	// Status values
	success: "成功",
	failed: "失败",

	// Pipeline state values
	pipelineStateValue: {
		running: "运行中",
		failed: "失败",
		idle: "待机",
	},

	// Auth banner
	authFailed: "登录失效 — 需要重新认证",
	login: "登录",

	// Post type labels
	postType: {
		race: "赛事",
		training: "训练",
		nutritionSupplement: "营养补剂",
		wearable: "装备",
	},

	// Error stage labels
	errorStage: {
		auth: "认证",
		generate: "生成",
		publish: "发布",
	},

	// Day names
	days: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],

	// Scraper card
	scraperPipeline: "赛事爬虫 · 运行状态",
	totalRaces: "赛事总数",
	lastScraped: "本次爬取",
	nextScrape: "下次爬取",
	dataFreshness: "数据新鲜度",
	belowThreshold: "低于阈值",

	// Scraper detail page
	runHistory: "运行历史",
	racesViewer: "赛事列表",
	failedUrls: "失败链接",
	timestamp: "时间",
	outcome: "结果",
	racesScraped: "已爬取",
	failures: "失败数",
	errorMsg: "错误",
	raceName: "赛事",
	raceDate: "日期",
	raceLocation: "地点",
	entryStatus: "报名状态",
	entryOpen: "报名中",
	entryClosed: "已截止",

	// Trigger buttons
	runScraper: "立即运行爬虫",
	runSync: "立即同步",
	triggering: "触发中...",
	triggered: "已触发",
	triggerFailed: "失败 — 请重试",

	// XHS detail page
	xhsSchedule: "发布计划",
	addSlot: "添加时段",
	postArchive: "发布存档",
	postTitle: "标题",
	tokens: "用量",
	runNow: "立即发布",
	stage: "阶段",
	hook: "钩子",
	hashtags: "标签",
	comments: "评论",
	sections: "正文",

	// Rakuten detail page
	runLog: "运行日志",
	importLog: "导入日志",
	operation: "操作",
	priceUpdates: "价格更新",
	removedStale: "清除过期",
	itemName: "商品",
	itemStatus: "状态",
	noErrors: "无错误",

	// Rakuten config editor
	pricingConfig: "定价配置",
	yenToYuan: "日元 → 人民币汇率",
	markupPercent: "加价比例 %",
	searchFillThreshold: "搜索补充阈值",
	productsPerCategory: "每分类商品数",
	productsPerCategoryNote: "每个顶级分类的目标数量 — 均分给各子分类",
	subcategories: "子分类",
	lastUpdated: "最后更新",
	save: "保存",
	saving: "保存中...",
	saved: "已保存",
	saveFailed: "失败 — 请重试",

	// Rakuten card
	rakutenPipeline: "乐天 · 商品聚合",
	catalogSize: "商品总数",
	wcLive: "已上架 WooCommerce",
	lastSync: "上次同步",
	lastOperation: "上次操作",
	newPushed: "新增上架",
	recentErrors: "近期错误",
	byCategory: "分类统计",
	categoryName: {
		"Running Gear": "跑步装备",
		"Training": "训练器材",
		"Nutrition & Supplements": "营养补剂",
		"Recovery & Care": "恢复护理",
		"Sportswear": "运动服装",
	},
};
