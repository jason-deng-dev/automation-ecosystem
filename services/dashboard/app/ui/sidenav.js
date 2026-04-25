"use client";
import Link from 'next/link';
import LangToggle from './LangToggle';

export default function SideNav({ dict, lang }) {
  const links = [
    { href: '/',        label: dict.nav.home },
    { href: '/xhs',     label: dict.nav.xhs },
    { href: '/rakuten', label: dict.nav.rakuten },
    { href: '/scraper', label: dict.nav.scraper },
  ];

  return (
    <nav className="w-48 h-full flex flex-col shrink-0" style={{backgroundColor: '#111111', borderRight: '1px solid #2A2A2A'}}>
      <div className="px-6 py-6" style={{borderBottom: '1px solid #2A2A2A'}}>
        <span className="text-xs font-medium tracking-wide uppercase" style={{color: '#888888'}}>
          {dict.navTitle}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-3 flex-1">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-3 text-sm font-medium tracking-wide transition-colors"
            style={{color: '#888888'}}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#222222'; e.currentTarget.style.color = '#EDEDED'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#888888'; }}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="p-3" style={{borderTop: '1px solid #2A2A2A'}}>
        <LangToggle lang={lang} />
      </div>
    </nav>
  );
}
