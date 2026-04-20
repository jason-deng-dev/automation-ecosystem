'use client';

import { useState } from 'react';

export default function RakutenConfigEditor({ config, dict }) {
	const [values, setValues] = useState({
		yen_to_yuan: config?.yen_to_yuan ?? '',
		markup_percent: config?.markup_percent ?? '',
		search_fill_threshold: config?.search_fill_threshold ?? '',
		products_per_category: config?.products_per_category ?? '',
	});
	const [status, setStatus] = useState('idle');

	function handleChange(key, val) {
		setValues(v => ({ ...v, [key]: val }));
	}

	async function handleSave() {
		setStatus('saving');
		try {
			const res = await fetch('/api/rakuten/config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					yen_to_yuan: Number(values.yen_to_yuan),
					markup_percent: Number(values.markup_percent),
					search_fill_threshold: Number(values.search_fill_threshold),
					products_per_category: Number(values.products_per_category),
				}),
			});
			if (!res.ok) throw new Error();
			setStatus('saved');
		} catch {
			setStatus('error');
		}
		setTimeout(() => setStatus('idle'), 4000);
	}

	const fields = [
		{ key: 'yen_to_yuan', label: dict.yenToYuan, step: '0.0001' },
		{ key: 'markup_percent', label: dict.markupPercent, step: '1' },
		{ key: 'search_fill_threshold', label: dict.searchFillThreshold, step: '1' },
		{ key: 'products_per_category', label: dict.productsPerCategory, step: '1' },
	];

	const saveColor = { idle: '#EDEDED', saving: '#F5A623', saved: '#3ECF8E', error: '#C8102E' }[status];
	const saveLabel = { idle: dict.save, saving: dict.saving, saved: dict.saved, error: dict.saveFailed }[status];

	return (
		<div className="p-8 flex flex-col gap-6" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
			<div className="flex justify-between items-center">
				<h2 className="text-base font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
					{dict.pricingConfig}
				</h2>
				{config?.updated_at && (
					<span className="text-xs text-text-secondary">
						{dict.lastUpdated}: {new Date(config.updated_at).toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', hour12: false })}
					</span>
				)}
			</div>

			<div className="flex flex-col gap-4">
				{fields.map(({ key, label, step }) => (
					<div key={key} className="flex justify-between items-center gap-4">
						<span className="text-base text-text-secondary">{label}</span>
						<input
							type="number"
							step={step}
							value={values[key]}
							onChange={e => handleChange(key, e.target.value)}
							className="w-32 text-right text-base font-medium bg-transparent border-b px-1 py-0.5 outline-none transition-colors"
							style={{ borderColor: '#2A2A2A', color: '#EDEDED' }}
							onFocus={e => (e.target.style.borderColor = '#EDEDED')}
							onBlur={e => (e.target.style.borderColor = '#2A2A2A')}
						/>
					</div>
				))}
			</div>

			<button
				onClick={handleSave}
				disabled={status === 'saving'}
				className="w-full text-sm font-medium tracking-wide uppercase px-4 py-2 border transition-colors disabled:opacity-50"
				style={{ borderColor: saveColor, color: saveColor }}
			>
				{saveLabel}
			</button>
		</div>
	);
}
