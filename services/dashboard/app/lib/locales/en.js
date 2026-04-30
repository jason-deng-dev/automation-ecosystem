export default {
	// Nav
	navTitle: "Dashboard",
	nav: {
		home: "HOME",
		xhs: "XHS",
		rakuten: "RAKUTEN",
		scraper: "SCRAPER",
	},

	// Section titles
	xhsPipeline: "XHS Pipeline",
	errorsByType: "Errors by Type",
	postTypes: "Post Types",
	apiTokens: "API Tokens (Lifetime)",

	// Labels
	pipelineState: "Pipeline State",
	lastRun: "Last Run",
	lastStatus: "Last Status",
	nextPost: "Next Post",
	successRate30d: "Success Rate (30d)",
	input: "Input",
	output: "Output",

	// Status values
	success: "success",
	failed: "failed",

	// Pipeline state values
	pipelineStateValue: {
		running: "running",
		failed: "failed",
		idle: "idle",
	},

	// Auth banner
	authFailed: "Auth failed — re-authentication required",
	login: "Login to XHS",
	streaming: "Waiting for QR scan...",
	loginDone: "Login successful",
	loginFailed: "Login failed — try again",

	// Post type labels
	postType: {
		race: "Race",
		training: "Training",
		nutritionSupplement: "Nutrition & Supplement",
		wearable: "Wearable",
	},

	// Error stage labels
	errorStage: {
		auth: "Authentication",
		generate: "Generate",
		publish: "Publishing",
	},

	// Day names
	days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],

	// Scraper card
	scraperPipeline: "Race Scraper",
	totalRaces: "Total Races",
	lastScraped: "Last Scraped",
	nextScrape: "Next Scrape",
	dataFreshness: "Data Freshness",
	belowThreshold: "below threshold",

	// Scraper detail page
	runHistory: "Run History",
	racesViewer: "Races",
	failedUrls: "Failed URLs",
	timestamp: "Timestamp",
	outcome: "Outcome",
	racesScraped: "Scraped",
	failures: "Failures",
	errorMsg: "Error",
	raceName: "Race",
	raceDate: "Date",
	raceLocation: "Location",
	entryStatus: "Entry",
	entryOpen: "Open",
	entryClosed: "Closed",

	// Trigger buttons
	runScraper: "Run Scraper Now",
	runSync: "Run Sync Now",
	triggering: "Triggering...",
	triggered: "Triggered",
	triggerFailed: "Failed — try again",

	// Rakuten config editor
	pricingConfig: "Pricing Config",
	yenToYuan: "JPY → CNY Rate",
	markupPercent: "Markup %",
	searchFillThreshold: "Search Fill Threshold",
	productsPerCategory: "Products per Category",
	productsPerCategoryNote: "target per top-level category — split evenly across its subcategories",
	subcategories: "subcats",
	lastUpdated: "Last updated",
	save: "Save",
	saving: "Saving...",
	saved: "Saved",
	saveFailed: "Failed — try again",

	// XHS detail page
	xhsSchedule: "Schedule",
	addSlot: "Add Slot",
	postArchive: "Post Archive",
	postTitle: "Title",
	tokens: "Tokens",
	runNow: "Run Now",
	generatePost: "Generate Post",
	generating: "Generating...",
	generateDone: "Generated",
	generateFailed: "Failed — try again",
	stage: "Stage",
	hook: "Hook",
	hashtags: "Hashtags",
	comments: "Comments",
	sections: "Sections",

	// Rakuten detail page
	runLog: "Run Log",
	importLog: "Import Log",
	operation: "Operation",
	priceUpdates: "Price Updates",
	removedStale: "Removed Stale",
	itemName: "Product",
	itemStatus: "Status",
	noErrors: "No errors",

	// Rakuten card
	rakutenPipeline: "Rakuten Aggregator",
	catalogSize: "Catalog Size",
	wcLive: "WooCommerce Live",
	lastSync: "Last Sync",
	lastOperation: "Last Operation",
	newPushed: "New Products Pushed",
	recentErrors: "Recent Errors",
	byCategory: "By Category",
	categoryName: {
		"Running Gear": "Running Gear",
		"Training": "Training",
		"Nutrition & Supplements": "Nutrition & Supplements",
		"Recovery & Care": "Recovery & Care",
		"Sportswear": "Sportswear",
	},
};
