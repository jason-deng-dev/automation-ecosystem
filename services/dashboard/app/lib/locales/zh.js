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
