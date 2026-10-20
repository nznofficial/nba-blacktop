const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const Sun = () => (
  <svg {...base} aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)
export const Moon = () => (
  <svg {...base} aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
)
export const Auto = () => (
  <svg {...base} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>
)
export const Star = ({ filled }: { filled: boolean }) => (
  <svg {...base} width={16} height={16} fill={filled ? 'currentColor' : 'none'} aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>
)
export const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg {...base} aria-hidden="true"><path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} /></svg>
)
export const Refresh = () => (
  <svg {...base} width={15} height={15} aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
)
export const Tv = () => (
  <svg {...base} width={13} height={13} aria-hidden="true"><rect x="2" y="7" width="20" height="13" rx="2" /><path d="M17 2l-5 5-5-5" /></svg>
)
export const Calendar = () => (
  <svg {...base} aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
)
