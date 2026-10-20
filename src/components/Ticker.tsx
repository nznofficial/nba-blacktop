import type { Game } from '../api'
import { tipClock } from '../lib/date'

interface Props {
  games: Game[]
  onOpen: (game: Game) => void
}

function label(g: Game) {
  const { home, away, odds } = g
  if (g.state === 'pre') {
    const fav = odds?.favoriteId === home.id ? home : odds?.favoriteId === away.id ? away : null
    const line = fav ? `${fav.abbr} ${(fav === home ? odds?.home : odds?.away)?.spread.current ?? ''}` : null
    const tv = g.broadcasts.find((b) => b.scope === 'National')?.name
    return [`${away.abbr} @ ${home.abbr}`, tipClock(g.date), tv, line].filter(Boolean).join(' · ')
  }
  const score = `${away.abbr} ${away.score ?? 0} – ${home.abbr} ${home.score ?? 0}`
  return `${score} · ${g.state === 'in' ? g.shortDetail : 'Final'}`
}

/** Announcement-bar style marquee of the day's slate. Items are rendered twice for a seamless loop. */
export function Ticker({ games, onOpen }: Props) {
  const items = [...games, ...games]
  return (
    <div className="ticker" aria-label="Today's games ticker">
      <div className="ticker-track" style={{ animationDuration: `${Math.max(24, games.length * 7)}s` }}>
        {items.map((g, i) => (
          <button key={`${g.id}-${i}`} className={`tick${g.state === 'in' ? ' live' : ''}`} onClick={() => onOpen(g)} tabIndex={i < games.length ? 0 : -1} aria-hidden={i >= games.length}>
            {g.state === 'in' && <span className="pulse" />}
            {label(g)}
            <span className="tick-sep" aria-hidden="true">✦</span>
          </button>
        ))}
      </div>
    </div>
  )
}
