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
	login: "Login",

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
	dataFreshness: "Data Freshness",
	belowThreshold: "below threshold",
};
