import Link from 'next/link';

const links = [
  { href: '/',        label: 'HOME' },
  { href: '/xhs',     label: 'XHS' },
  { href: '/rakuten', label: 'RAKUTEN' },
  { href: '/scraper', label: 'SCRAPER' },
];

export default function SideNav() {
  return (
    <nav className="w-48 h-full flex flex-col bg-text-primary text-bg border-r border-border shrink-0">
      <div className="px-6 py-6 border-b border-white/10">
        <span className="text-xs font-medium tracking-wide text-text-disabled uppercase">
          Dashboard
        </span>
      </div>
      <div className="flex flex-col gap-1 p-3 flex-1">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-2 text-xs font-medium tracking-wide text-bg/70 hover:text-bg hover:bg-white/10 transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
