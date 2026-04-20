'use client';
import { useState, useRef } from 'react';

const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon first, Sun last
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const POST_TYPES = ['race', 'training', 'nutritionSupplement', 'wearable'];
const POST_TYPE_COLORS = {
	race: '#C8102E',
	training: '#3ECF8E',
	nutritionSupplement: '#F5A623',
	wearable: '#6B8AF4',
};

export default function XhsScheduleEditor({ slots: initial, dict }) {
	const [slots, setSlots] = useState(initial);
	const [status, setStatus] = useState('idle');
	const [saveHovered, setSaveHovered] = useState(false);
	const dragIdx = useRef(null);
	const dragDay = useRef(null);

	function slotsForDay(day) {
		return slots
			.map((s, i) => ({ ...s, _idx: i }))
			.filter(s => s.day === day);
	}

	function addSlot(day) {
		setSlots(s => [...s, { day, time: '21:00', post_type: 'race' }]);
	}

	function removeSlot(idx) {
		setSlots(s => s.filter((_, i) => i !== idx));
	}

	function updateSlot(idx, key, val) {
		setSlots(s => s.map((slot, i) => i === idx ? { ...slot, [key]: val } : slot));
	}

	function onDragStart(idx, day) {
		dragIdx.current = idx;
		dragDay.current = day;
	}

	function onDragOver(e, overIdx) {
		e.preventDefault();
		if (dragIdx.current === overIdx) return;
		setSlots(s => {
			const next = [...s];
			const [moved] = next.splice(dragIdx.current, 1);
			next.splice(overIdx, 0, moved);
			dragIdx.current = overIdx;
			return next;
		});
	}

	async function handleSave() {
		setStatus('saving');
		try {
			const res = await fetch('/api/xhs/schedule', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(slots.map(({ day, time, post_type }) => ({ day, time, post_type }))),
			});
			if (!res.ok) throw new Error();
			setStatus('saved');
		} catch {
			setStatus('error');
		}
		setTimeout(() => setStatus('idle'), 4000);
	}

	const saveColor = { idle: '#EDEDED', saving: '#F5A623', saved: '#3ECF8E', error: '#C8102E' }[status];
	const saveLabel = { idle: dict.save, saving: dict.saving, saved: dict.saved, error: dict.saveFailed }[status];

	return (
		<div className="flex flex-col gap-4 p-6" style={{ backgroundColor: '#111111', border: '1px solid #2A2A2A' }}>
			<h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
				{dict.xhsSchedule}
			</h2>

			<div className="flex flex-col gap-4">
				{DAYS.map(day => {
					const daySlots = slotsForDay(day);
					return (
						<div key={day} className="flex flex-col gap-1">
							<div className="flex items-center justify-between">
								<span className="text-sm font-semibold tracking-wide uppercase" style={{ color: '#EDEDED' }}>
									{dict.days[day]}
								</span>
								<button
									onClick={() => addSlot(day)}
									className="text-xs font-medium transition-colors"
									style={{ color: '#888888' }}
									onMouseEnter={e => (e.target.style.color = '#EDEDED')}
									onMouseLeave={e => (e.target.style.color = '#888888')}
								>
									+ {dict.addSlot}
								</button>
							</div>

							{daySlots.length === 0 ? (
								<div className="text-xs py-1" style={{ color: '#333333' }}>—</div>
							) : (
								daySlots.map(({ _idx, time, post_type }) => (
									<div
										key={_idx}
										draggable
										onDragStart={() => onDragStart(_idx, day)}
										onDragOver={e => onDragOver(e, _idx)}
										className="flex items-center gap-2 px-2 py-1 cursor-grab active:cursor-grabbing"
										style={{ border: '1px solid #1A1A1A' }}
									>
										<span style={{ color: '#555555', fontSize: '14px', cursor: 'grab', letterSpacing: '1px' }}>⠿</span>
										<select
											value={time.split(':')[0]}
											onChange={e => updateSlot(_idx, 'time', `${e.target.value}:${time.split(':')[1]}`)}
											className="flex-none text-sm bg-transparent outline-none px-1"
											style={{ color: '#EDEDED', border: '1px solid #2A2A2A', width: '52px' }}
										>
											{HOURS.map(h => <option key={h} value={h} style={{ backgroundColor: '#111111' }}>{h}</option>)}
										</select>
										<span style={{ color: '#444444', fontSize: '12px' }}>:</span>
										<select
											value={time.split(':')[1]}
											onChange={e => updateSlot(_idx, 'time', `${time.split(':')[0]}:${e.target.value}`)}
											className="flex-none text-sm bg-transparent outline-none px-1"
											style={{ color: '#EDEDED', border: '1px solid #2A2A2A', width: '52px' }}
										>
											{MINUTES.map(m => <option key={m} value={m} style={{ backgroundColor: '#111111' }}>{m}</option>)}
										</select>
										<span style={{
											width: '8px', height: '8px', borderRadius: '50%',
											backgroundColor: POST_TYPE_COLORS[post_type] ?? '#888888',
											flexShrink: 0, display: 'inline-block',
										}} />
										<select
											value={post_type}
											onChange={e => updateSlot(_idx, 'post_type', e.target.value)}
											className="flex-1 text-sm outline-none min-w-0 transition-colors"
											style={{ color: POST_TYPE_COLORS[post_type] ?? '#888888', backgroundColor: 'transparent', cursor: 'pointer' }}
											onMouseEnter={e => (e.target.style.backgroundColor = 'rgba(237,237,237,0.06)')}
											onMouseLeave={e => (e.target.style.backgroundColor = 'transparent')}
										>
											{POST_TYPES.map(t => (
												<option key={t} value={t} style={{ backgroundColor: '#111111', color: POST_TYPE_COLORS[t] }}>
													{dict.postType[t]}
												</option>
											))}
										</select>
										<button
											onClick={() => removeSlot(_idx)}
											className="flex-none leading-none transition-colors"
											style={{ color: '#555555', fontSize: '18px' }}
											onMouseEnter={e => (e.target.style.color = '#C8102E')}
											onMouseLeave={e => (e.target.style.color = '#555555')}
										>
											×
										</button>
									</div>
								))
							)}
						</div>
					);
				})}
			</div>

			<button
				onClick={handleSave}
				disabled={status === 'saving'}
				onMouseEnter={() => setSaveHovered(true)}
				onMouseLeave={() => setSaveHovered(false)}
				className="w-full text-sm font-medium tracking-wide uppercase px-4 py-2 border transition-colors disabled:opacity-50"
				style={{
					borderColor: saveColor,
					color: saveColor,
					backgroundColor: saveHovered && status === 'idle' ? 'rgba(237,237,237,0.08)' : 'transparent',
				}}
			>
				{saveLabel}
			</button>
		</div>
	);
}
