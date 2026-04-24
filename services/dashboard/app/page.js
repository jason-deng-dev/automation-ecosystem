export const dynamic = 'force-dynamic';
import XhsMetric from "./ui/xhsMetrics";
import ScraperMetric from "./ui/scraperMetrics";
import RakutenMetric from "./ui/rakutenMetrics";
import en from "./lib/locales/en";
import zh from "./lib/locales/zh";

export default function Home() {
	const lang = process.env.NEXT_PUBLIC_LANG || "en";

	const dict = lang === "en" ? en : zh;

	return (
		<div className="flex flex-row h-full gap-4">
			<XhsMetric dict={dict} />
			<RakutenMetric dict={dict} />
			<ScraperMetric dict={dict} />
		</div>
	);
}
