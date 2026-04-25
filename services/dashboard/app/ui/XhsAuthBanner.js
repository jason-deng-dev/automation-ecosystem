'use client';
import { useState } from 'react';
import XhsReAuthPanel from './XhsReAuthPanel';

export default function XhsAuthBanner({ dict, initialVisible }) {
	const [visible, setVisible] = useState(initialVisible);
	if (!visible) return null;
	return (
		<div className="flex flex-col gap-2 border border-accent px-3 py-3" style={{ backgroundColor: 'rgba(200,16,46,0.08)' }}>
			<span className="text-sm font-medium" style={{ color: '#C8102E' }}>{dict.authFailed}</span>
			<XhsReAuthPanel dict={dict} onDone={() => setVisible(false)} />
		</div>
	);
}
