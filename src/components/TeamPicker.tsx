import { useEffect } from 'react'
import type { Conference } from '../api'
import { Star } from './Icons'

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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal glass" role="dialog" aria-modal="true" aria-label="My teams" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>My teams</h2>
            <p className="sub">Starred teams are pinned to the top of each day and highlighted in the standings.</p>
          </div>
          <button className="pill" onClick={onClose}>Done</button>
        </div>
        {!conferences && <p className="sub">Loading teams…</p>}
        {conferences?.map((c) => (
          <div key={c.short}>
            <h3 className="section-title">{c.name}</h3>
            <div className="team-grid">
              {[...c.rows].sort((a, b) => a.name.localeCompare(b.name)).map((t) => {
                const on = favTeams.includes(t.id)
                return (
                  <button key={t.id} className={`team-tile${on ? ' on' : ''}`} onClick={() => onToggle(t.id)} aria-pressed={on}>
                    <img src={t.logo} alt="" width={32} height={32} loading="lazy" />
                    <span>{t.name}</span>
                    <span className="tile-star"><Star filled={on} /></span>
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
