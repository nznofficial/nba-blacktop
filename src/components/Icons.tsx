const base = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
} as const

export const Sun = () => (
  <svg {...base} aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" /></svg>
)
export const Moon = () => (
  <svg {...base} aria-hidden="true"><path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z" /></svg>
)
export const Star = ({ filled = false, size = 16 }: { filled?: boolean; size?: number }) => (
  <svg {...base} width={size} height={size} fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
    <path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
  </svg>
)
export const Chevron = ({ dir = 'right', size = 18 }: { dir?: 'left' | 'right' | 'down'; size?: number }) => (
  <svg {...base} width={size} height={size} aria-hidden="true">
    <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : dir === 'down' ? 'M6 9l6 6 6-6' : 'M9 18l6-6-6-6'} />
  </svg>
)
export const Calendar = () => (
  <svg {...base} aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>
)
export const Close = () => (
  <svg {...base} width={20} height={20} aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const Refresh = () => (
  <svg {...base} width={14} height={14} aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" /></svg>
)
export const Arrow = ({ dir }: { dir: 'up' | 'down' }) => (
  <svg {...base} width={12} height={12} strokeWidth={2.2} aria-hidden="true"><path d={dir === 'up' ? 'M12 19V5M6 11l6-6 6 6' : 'M12 5v14M6 13l6 6 6-6'} /></svg>
)
export const Share = () => (
  <svg {...base} width={14} height={14} aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6.5h14V13" /></svg>
)
