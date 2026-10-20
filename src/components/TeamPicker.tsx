import { useEffect } from 'react'
import type { Conference } from '../api'
import { Close, Star } from './Icons'

interface Props {
  conferences: Conference[] | null
  favTeams: string[]
  onToggle: (id: string) => void
  onClose: () => void
}

export function TeamPicker({ conferences, favTeams, onToggle, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-root">
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Follow teams">
        <header className="sheet-head">
          <div>
            <div className="kicker">Personalize</div>
            <h2 className="sheet-title"><em>Follow</em> your teams</h2>
            <p className="standfirst">Their games lead each day’s slate and stand out in the standings.</p>
          </div>
          <button className="drawer-close static" onClick={onClose} aria-label="Close"><Close /></button>
        </header>
        {!conferences && <div className="skeleton block" />}
        {conferences?.map((c) => (
          <div key={c.short} className="sheet-group">
            <h3 className="rule-head"><span>{c.name}</span></h3>
            <div className="team-grid">
              {[...c.rows].sort((a, b) => a.name.localeCompare(b.name)).map((t) => {
                const on = favTeams.includes(t.id)
                return (
                  <button key={t.id} className={`team-opt${on ? ' on' : ''}`} onClick={() => onToggle(t.id)} aria-pressed={on}>
                    <img src={t.logo} alt="" width={28} height={28} loading="lazy" />
                    <span>{t.name}</span>
                    <Star filled={on} size={15} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
