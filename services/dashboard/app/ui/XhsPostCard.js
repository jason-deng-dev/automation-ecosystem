'use client';
import { useState } from 'react';

function CopyField({ label, sublabel, value }) {
	const [copied, setCopied] = useState(false);
	function handleCopy() {
		navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}
	return (
		<div style={{ border: '1px solid #2A2A2A', padding: '10px 14px' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#888888' }}>{label}</span>
					{sublabel && <span style={{ fontSize: '11px', color: '#444444' }}>{sublabel}</span>}
				</div>
				<button onClick={handleCopy} style={{
					fontSize: '11px', padding: '2px 10px', border: '1px solid',
					borderColor: copied ? '#3ECF8E' : '#333333',
					color: copied ? '#3ECF8E' : '#666666',
					background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
				}}>
					{copied ? '✓ Copied' : 'Copy'}
				</button>
			</div>
			<div style={{ fontSize: '13px', color: '#EDEDED', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
				{value}
			</div>
		</div>
	);
}

function MarkPostedButton({ id }) {
	const [status, setStatus] = useState('idle');
	async function handleClick() {
		setStatus('loading');
		try {
			await fetch('/api/xhs/mark-posted', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id }),
			});
			setStatus('done');
			window.location.reload();
		} catch {
			setStatus('error');
		}
	}
	return (
		<button
			onClick={handleClick}
			disabled={status === 'loading' || status === 'done'}
			style={{
				width: '100%', padding: '10px', marginTop: '12px',
				border: '1px solid #3ECF8E', color: '#3ECF8E',
				background: 'transparent', cursor: status === 'idle' ? 'pointer' : 'default',
				fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
				opacity: status === 'loading' ? 0.5 : 1,
			}}
		>
			{status === 'loading' ? 'Saving...' : status === 'done' ? 'Marked' : '✓ Mark as Posted'}
		</button>
	);
}

export default function XhsPostCard({ post, pending = false }) {
	const descriptionFull = [post.description, ...(post.hashtags || [])].filter(Boolean).join('\n');

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px', backgroundColor: '#0D0D0D' }}>
			{post.race_name && (
				<div style={{ fontSize: '11px', color: '#555555', marginBottom: '4px' }}>{post.race_name}</div>
			)}

			<CopyField label="标题 Title" sublabel="→ XHS title field" value={post.title} />
			<CopyField label="Page 1 — Hook" sublabel="→ 第一页" value={post.hook} />

			{Array.isArray(post.contents) && post.contents.map((page, i) => (
				<CopyField
					key={i}
					label={`Page ${i + 2}`}
					sublabel={page.subtitle ? `→ ${page.subtitle}` : undefined}
					value={page.subtitle ? `${page.subtitle}\n\n${page.body}` : page.body}
				/>
			))}

			<CopyField label="Last Page — CTA" sublabel="→ 最后一页" value={post.cta} />
			<CopyField label="描述 Description" sublabel="→ caption field (includes hashtags)" value={descriptionFull} />

			<div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #2A2A2A' }}>
				<div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#666666', marginBottom: '8px' }}>
					Comments — paste immediately after publishing
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
					{Array.isArray(post.comments) && post.comments.map((comment, i) => (
						<CopyField key={i} label={`Comment ${i + 1}`} value={comment} />
					))}
				</div>
			</div>

			{pending && <MarkPostedButton id={post.id} />}
		</div>
	);
}
