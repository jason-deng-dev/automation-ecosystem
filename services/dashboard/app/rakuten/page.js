import { rakutenPool } from '@/app/lib/db/pool';
import RakutenConfigEditor from '@/app/ui/RakutenConfigEditor';
import en from '@/app/lib/locales/en';
import zh from '@/app/lib/locales/zh';

export default async function RakutenPage() {
	const lang = process.env.NEXT_PUBLIC_LANG || 'en';
	const dict = lang === 'en' ? en : zh;

	const res = await rakutenPool.query(`SELECT * FROM config WHERE id = 1`);
	const config = res.rows[0] ?? null;

	return (
		<div className="p-8 flex flex-col gap-6 max-w-lg">
			<RakutenConfigEditor config={config} dict={dict} />
		</div>
	);
}
