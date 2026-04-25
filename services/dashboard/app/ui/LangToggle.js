'use client';

export default function LangToggle({ lang }) {
  function toggle() {
    const next = lang === 'zh' ? 'en' : 'zh';
    document.cookie = `lang=${next};path=/;max-age=31536000`;
    window.location.reload();
  }

  return (
    <button
      onClick={toggle}
      className="px-3 py-2 text-xs font-medium tracking-wide w-full text-left transition-colors"
      style={{ color: '#555555' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#EDEDED'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#555555'; }}
    >
      {lang === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
