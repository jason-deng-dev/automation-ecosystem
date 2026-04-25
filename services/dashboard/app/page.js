export const dynamic = 'force-dynamic';
import XhsMetric from "./ui/xhsMetrics";
import ScraperMetric from "./ui/scraperMetrics";
import RakutenMetric from "./ui/rakutenMetrics";
import { getDict } from "./lib/dict";

export default async function Home() {
	const { dict } = await getDict();

	return (
		<div className="flex flex-row h-full gap-4">
			<XhsMetric dict={dict} />
			<RakutenMetric dict={dict} />
			<ScraperMetric dict={dict} />
		</div>
	);
}
