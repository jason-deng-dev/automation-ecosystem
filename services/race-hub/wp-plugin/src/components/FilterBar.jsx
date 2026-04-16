import { useState, useContext } from 'react';
import { LangContext } from '../App';
import enText from '../locales/en';
import zhText from '../locales/zh';

const REGIONS = [
	'Hokkaido / Tohoku',
	'Kanto / Fuji',
	'Chubu / Hokuriku',
	'Kansai',
	'Chugoku / Shikoku',
	'Kyushu / Okinawa',
];

const selectCls = 'w-full bg-transparent py-2.5 pl-3 pr-8 font-body text-[13px] text-ink focus:outline-none appearance-none';
const wrapperCls = 'relative border border-border bg-surface focus-within:border-ink transition-colors';

export default function FilterBar({
	search,
	onSearchChange,
	statusFilter,
	onStatusChange,
	regionFilter,
	onRegionChange,
	distanceCategory,
	onDistanceCategoryChange,
	distanceExact,
	onDistanceExactChange,
	distanceMin,
	onDistanceMinChange,
	distanceMax,
	onDistanceMaxChange,
	dateFrom,
	onDateFromChange,
	dateTo,
	onDateToChange,
	count,
	activeFilters,
	onRemoveFilter,
	onClearAll,
}) {
	const [lang, toggleLang] = useContext(LangContext);
	const [expanded, setExpanded] = useState(false);
	const text = lang === 'en' ? enText : zhText;

	return (
		<div className="w-full">
			<div className="max-w-7xl mx-auto px-4 md:px-6">
				{/* Mobile title */}
				<div className="pt-4 md:hidden text-center">
					<span className="font-headline font-black text-[18px] uppercase tracking-tight text-ink leading-none">
						{text.site_title}
					</span>
				</div>

				{/* Primary row */}
				<div className="flex items-center gap-4 py-4">
					{/* Brand — desktop only */}
					<div className="shrink-0 w-55 pr-4 border-r border-border max-md:hidden">
						<span className="font-headline font-black text-[18px] uppercase tracking-tight text-ink leading-none">
							{text.site_title}
						</span>
					</div>

					{/* Search */}
					<div className="flex items-center border border-border bg-surface grow max-w-md focus-within:border-ink transition-colors">
						<span className="material-symbols-outlined pl-3 text-muted text-[18px] shrink-0">search</span>
						<input
							type="text"
							value={search}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder={text.search_placeholder}
							className="w-full bg-transparent py-2.5 pl-2 pr-4 font-body text-[13px] text-ink placeholder:text-disabled focus:outline-none"
						/>
					</div>

					{/* Status — always visible */}
					<div className={`${wrapperCls} w-37.5 max-md:hidden`}>
						<select
							value={statusFilter}
							onChange={(e) => onStatusChange(e.target.value)}
							className={selectCls}
						>
							<option value="all">{text.status_all}</option>
							<option value="open">{text.status_open}</option>
							<option value="closing-soon">{text.status_closing_soon}</option>
							<option value="closed">{text.status_closed}</option>
						</select>
					</div>

					{/* More filters toggle */}
					<div
						role="button" tabIndex={0}
						onClick={() => setExpanded((v) => !v)}
						className={`flex items-center gap-1.5 border px-3 py-2.5 transition-colors cursor-pointer ${expanded ? 'border-ink text-ink' : 'border-border text-muted hover:border-muted hover:text-ink'}`}
					>
						<span className="material-symbols-outlined text-[16px]">tune</span>
						{activeFilters.filter((f) => f.id !== 'search' && f.id !== 'status').length > 0 && (
							<span className="w-1.5 h-1.5 bg-accent rounded-full" />
						)}
					</div>

					{/* Count */}
					<span className="font-body text-[13px] font-semibold uppercase tracking-[0.05em] text-muted ml-auto shrink-0 min-w-22.5 text-right">
						{count} {count === 1 ? text.race_singular : text.race_plural}
					</span>
				</div>

				{/* Expanded filters — animated accordion */}
				<div
					className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
				>
					<div className="overflow-hidden">
						<div className="border-t border-border py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
							{/* Status — visible here on mobile too */}
							<div className="md:hidden">
								<label className="block font-headline text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-1">
									{text.status_label}
								</label>
								<div className={wrapperCls}>
									<select
										value={statusFilter}
										onChange={(e) => onStatusChange(e.target.value)}
										className={selectCls}
									>
										<option value="all">{text.status_all}</option>
										<option value="open">{text.status_open}</option>
										<option value="closing-soon">{text.status_closing_soon}</option>
										<option value="closed">{text.status_closed}</option>
									</select>
								</div>
							</div>

							{/* Region */}
							<div>
								<label className="block font-headline text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-1">
									{text.region_label}
								</label>
								<div className={wrapperCls}>
									<select
										value={regionFilter}
										onChange={(e) => onRegionChange(e.target.value)}
										className={selectCls}
									>
										<option value="all">{text.region_all}</option>
										{REGIONS.map((r) => (
											<option key={r} value={r}>
												{r}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Distance category */}
							<div className="relative">
								<label className="block font-headline text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-1">
									{text.distance_label}
								</label>
								<div className={wrapperCls}>
									<select
										value={distanceCategory}
										onChange={(e) => onDistanceCategoryChange(e.target.value)}
										className={selectCls}
									>
										<option value="all">{text.distance_all}</option>
										<option value="10k">{text.distance_10k}</option>
										<option value="half">{text.distance_half}</option>
										<option value="full">{text.distance_full}</option>
										<option value="ultra">{text.distance_ultra}</option>
										<option value="specify-distance">{text.distance_specify}</option>
										<option value="specify-range">{text.distance_specify_range}</option>
									</select>
								</div>

								{distanceCategory === 'specify-distance' && (
									<div className="popover-animate absolute top-full left-0 right-0 z-20 mt-1 border border-border bg-surface p-3">
										<label className="block font-headline text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-2">
											{text.distance_exact_label}
										</label>
										<div className="border border-border bg-surface focus-within:border-ink transition-colors">
											<input
												type="number"
												min="0"
												step="0.1"
												value={distanceExact}
												onChange={(e) => onDistanceExactChange(e.target.value)}
												placeholder="e.g. 42.195"
												className="w-full bg-transparent py-2 px-3 font-body text-[13px] text-ink focus:outline-none"
											/>
										</div>
									</div>
								)}

								{distanceCategory === 'specify-range' && (
									<div className="popover-animate absolute top-full left-0 right-0 z-20 mt-1 border border-border bg-surface p-3 flex gap-2">
										<div className="flex-1">
											<label className="block font-headline text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-2">
												{text.distance_min_label}
											</label>
											<div className="border border-border bg-surface focus-within:border-ink transition-colors">
												<input
													type="number"
													min="0"
													step="0.1"
													value={distanceMin}
													onChange={(e) => onDistanceMinChange(e.target.value)}
													placeholder="0"
													className="w-full bg-transparent py-2 px-3 font-body text-[13px] text-ink focus:outline-none"
												/>
											</div>
										</div>
										<div className="flex-1">
											<label className="block font-headline text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-2">
												{text.distance_max_label}
											</label>
											<div className="border border-border bg-surface focus-within:border-ink transition-colors">
												<input
													type="number"
													min="0"
													step="0.1"
													value={distanceMax}
													onChange={(e) => onDistanceMaxChange(e.target.value)}
													placeholder="∞"
													className="w-full bg-transparent py-2 px-3 font-body text-[13px] text-ink focus:outline-none"
												/>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Date from */}
							<div>
								<label className="block font-headline text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-1">
									{text.date_from_label}
								</label>
								<div className="border border-border bg-surface focus-within:border-ink transition-colors">
									<input
										type="date"
										value={dateFrom}
										onChange={(e) => onDateFromChange(e.target.value)}
										className="w-full bg-transparent py-2.5 px-3 font-body text-[13px] text-ink focus:outline-none"
									/>
								</div>
							</div>

							{/* Date to */}
							<div>
								<label className="block font-headline text-[11px] font-bold uppercase tracking-[0.15em] text-muted mb-1">
									{text.date_to_label}
								</label>
								<div className="border border-border bg-surface focus-within:border-ink transition-colors">
									<input
										type="date"
										value={dateTo}
										onChange={(e) => onDateToChange(e.target.value)}
										className="w-full bg-transparent py-2.5 px-3 font-body text-[13px] text-ink focus:outline-none"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Active filter chips */}
				{activeFilters.length > 0 && (
					<div className="pb-3 flex flex-wrap items-center gap-2">
						<span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
							{text.active_filters_label}
						</span>
						{activeFilters.map((f) => (
							<div
								key={f.id}
								className="chip-animate flex items-center border border-border bg-bg px-2 py-1 hover:border-muted transition-colors"
							>
								<span className="font-body text-[11px] font-medium uppercase tracking-[0.08em] text-ink">
									{f.label}
								</span>
								<div
									role="button" tabIndex={0}
									onClick={() => onRemoveFilter(f.id)}
									className="ml-2 text-muted hover:text-ink transition-colors leading-none cursor-pointer"
								>
									<span className="material-symbols-outlined text-[14px]">close</span>
								</div>
							</div>
						))}
						<div
							role="button" tabIndex={0}
							onClick={onClearAll}
							className="ml-1 font-body text-[10px] font-bold uppercase tracking-widest text-muted underline underline-offset-4 hover:text-ink transition-colors cursor-pointer"
						>
							{text.clear_all}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
