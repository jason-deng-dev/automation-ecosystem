import { useState, useEffect, useMemo, createContext } from 'react';
import FilterBar from './components/FilterBar';
import RaceCard from './components/RaceCard';
import SkeletonCard from './components/SkeletonCard';
import Drawer from './components/Drawer';
import { getEntryStatus } from './utils/status';
import extractDistance from './utils/extractDistance';
import extractRegion from './utils/extractRegion';
import extractDate from './utils/extractDate';
import useLang from './hooks/useLang';
import enText from './locales/en';
import zhText from './locales/zh';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const LangContext = createContext(null);

export default function App() {
	const [races, setRaces] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [regionFilter, setRegionFilter] = useState('all');
	const [distanceCategory, setDistanceCategory] = useState('all');
	const [distanceExact, setDistanceExact] = useState('');
	const [distanceMin, setDistanceMin] = useState('');
	const [distanceMax, setDistanceMax] = useState('');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [selectedRace, setSelectedRace] = useState(null);

	const [lang, toggleLang] = useLang();
	const text = lang === 'en' ? enText : zhText;

	useEffect(() => {
		fetch(`${API_URL}/api/races`)
			.then((r) => {
				if (!r.ok) throw new Error(`Server error: ${r.status}`);
				return r.json();
			})
			.then((data) => {
				setRaces(extractDate(extractRegion(extractDistance(data.races))) || []);
				setLoading(false);
			})
			.catch((err) => {
				setError(err.message);
				setLoading(false);
			});
	}, []);

	const DISTANCE_RANGES = {
		'10k': [5, 15],
		half: [15, 28],
		full: [28, 55],
		ultra: [55, Infinity],
	};

	const filtered = useMemo(() => {
		return races.filter((race) => {
			const q = search.toLowerCase();
			if (q && !race.name.toLowerCase().includes(q) && !race.location?.toLowerCase().includes(q)) return false;
			if (statusFilter !== 'all' && getEntryStatus(race.entryEnd) !== statusFilter) return false;
			if (regionFilter !== 'all' && race.region !== regionFilter) return false;

			if (distanceCategory !== 'all') {
				if (distanceCategory === 'specify-distance') {
					const exact = parseFloat(distanceExact);
					if (!isNaN(exact) && exact > 0) {
						if (!race.distances.some((d) => Math.abs(d - exact) <= 1)) return false;
					}
				} else if (distanceCategory === 'specify-range') {
					const min = parseFloat(distanceMin) || 0;
					const max = parseFloat(distanceMax) || Infinity;
					if (!race.distances.some((d) => d >= min && d <= max)) return false;
				} else {
					const [lo, hi] = DISTANCE_RANGES[distanceCategory];
					if (!race.distances.some((d) => d >= lo && d < hi)) return false;
				}
			}

			if (dateFrom && race.dateObj && race.dateObj < new Date(dateFrom)) return false;
			if (dateTo && race.dateObj && race.dateObj > new Date(dateTo)) return false;

			return true;
		});
	}, [
		races,
		search,
		statusFilter,
		regionFilter,
		distanceCategory,
		distanceExact,
		distanceMin,
		distanceMax,
		dateFrom,
		dateTo,
	]);

	const activeFilters = useMemo(() => {
		const statusLabel = { open: text.status_open, 'closing-soon': text.status_closing_soon, closed: text.status_closed };
		const filters = [];
		if (search) filters.push({ id: 'search', label: `"${search}"` });
		if (statusFilter !== 'all') filters.push({ id: 'status', label: `${text.chip_status}: ${statusLabel[statusFilter]}` });
		if (regionFilter !== 'all') filters.push({ id: 'region', label: `${text.chip_region}: ${regionFilter}` });
		if (distanceCategory !== 'all') {
			const label =
				distanceCategory === 'specify-distance'
					? `~${distanceExact}km`
					: distanceCategory === 'specify-range'
						? `${distanceMin || 0}–${distanceMax || '∞'}km`
						: distanceCategory.toUpperCase();
			filters.push({ id: 'distance', label: `${text.chip_distance}: ${label}` });
		}
		if (dateFrom) filters.push({ id: 'dateFrom', label: `${text.chip_from}: ${dateFrom}` });
		if (dateTo) filters.push({ id: 'dateTo', label: `${text.chip_to}: ${dateTo}` });
		return filters;
	}, [search, statusFilter, regionFilter, distanceCategory, distanceExact, distanceMin, distanceMax, dateFrom, dateTo, lang]);

	function removeFilter(id) {
		if (id === 'search') setSearch('');
		if (id === 'status') setStatusFilter('all');
		if (id === 'region') setRegionFilter('all');
		if (id === 'distance') {
			setDistanceCategory('all');
			setDistanceExact('');
			setDistanceMin('');
			setDistanceMax('');
		}
		if (id === 'dateFrom') setDateFrom('');
		if (id === 'dateTo') setDateTo('');
	}

	return (
		<LangContext value={[lang, toggleLang]}>
			<div className="race-hub-root min-h-screen bg-bg font-body">
				<header className="bg-surface border-b border-border">
					<FilterBar
						search={search}
						onSearchChange={setSearch}
						statusFilter={statusFilter}
						onStatusChange={setStatusFilter}
						regionFilter={regionFilter}
						onRegionChange={setRegionFilter}
						distanceCategory={distanceCategory}
						onDistanceCategoryChange={setDistanceCategory}
						distanceExact={distanceExact}
						onDistanceExactChange={setDistanceExact}
						distanceMin={distanceMin}
						onDistanceMinChange={setDistanceMin}
						distanceMax={distanceMax}
						onDistanceMaxChange={setDistanceMax}
						dateFrom={dateFrom}
						onDateFromChange={setDateFrom}
						dateTo={dateTo}
						onDateToChange={setDateTo}
						count={filtered.length}
						activeFilters={activeFilters}
						onRemoveFilter={removeFilter}
						onClearAll={() => {
							setSearch('');
							setStatusFilter('all');
							setRegionFilter('all');
							setDistanceCategory('all');
							setDistanceExact('');
							setDistanceMin('');
							setDistanceMax('');
							setDateFrom('');
							setDateTo('');
						}}
					/>
				</header>

				<main className="max-w-7xl mx-auto px-4 py-8 md:px-6">
					{error ? (
						<div className="py-24 text-center space-y-2">
							<p className="font-headline text-[13px] uppercase tracking-widest text-muted">{text.error_loading}</p>
							<p className="text-[13px] text-disabled">{error}</p>
						</div>
					) : loading ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{Array.from({ length: 6 }).map((_, i) => (
								<SkeletonCard key={i} />
							))}
						</div>
					) : filtered.length === 0 ? (
						<div className="py-24 text-center">
							<p className="font-headline text-[13px] uppercase tracking-widest text-muted">
								{text.no_results}
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{filtered.map((race, i) => (
								<RaceCard key={race.url} race={race} index={i} onClick={() => setSelectedRace(race)} />
							))}
						</div>
					)}
				</main>

				<footer className="max-w-7xl mx-auto px-4 pb-8 md:px-6 flex justify-center">
					<div className="flex border border-border">
						<button
							onClick={() => lang !== 'en' && toggleLang()}
							className={`px-2.5 py-1.5 font-headline font-bold text-[10px] uppercase tracking-widest transition-colors ${lang === 'en' ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}
						>
							EN
						</button>
						<button
							onClick={() => lang !== 'zh' && toggleLang()}
							className={`px-2.5 py-1.5 font-headline font-bold text-[10px] uppercase tracking-widest border-l border-border transition-colors ${lang === 'zh' ? 'bg-ink text-surface' : 'text-muted hover:text-ink'}`}
						>
							中文
						</button>
					</div>
				</footer>

				<Drawer race={selectedRace} onClose={() => setSelectedRace(null)} />
			</div>
		</LangContext>
	);
}
