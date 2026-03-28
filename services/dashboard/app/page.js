import XhsMetric from "./ui/xhsMetrics";
import ScraperMetric from "./ui/scraperMetrics";
import en from "./lib/locales/en";
import zh from "./lib/locales/zh";

export default function Home() {
	const lang = process.env.NEXT_PUBLIC_LANG || "en";

	const dict = lang === "en" ? en : zh;

	return (
		<div className="flex flex-row h-full gap-4">
			<XhsMetric dict={dict} />
			<div
				className="p-6 text-sm flex-1"
				style={{ backgroundColor: "#111111", border: "1px solid #2A2A2A", color: "#888888" }}
			>
				Rakuten — coming soon
			</div>
			<ScraperMetric dict={dict} />
		</div>
	);
}
