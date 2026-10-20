import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import type { Game, TeamSide } from '../api'
import { tipClock, tzAbbr } from '../lib/date'
import type { Pick } from '../lib/picks'
import { Chevron, Star } from './Icons'
import { Score } from './Score'
import { TeamMark } from './TeamMark'

interface Props {
  game: Game
  index: number
  showScores: boolean
  favTeams: string[]
  pick?: Pick
  onToggleFav: (id: string) => void
  onPick: (game: Game, team: TeamSide) => void
  onOpen: (game: Game) => void
}

export function GameStatus({ game }: { game: Game }) {
  if (game.state === 'in') {
    return (
      <span className="status live">
        <span className="pulse" />
        <span>{game.shortDetail}</span>
      </span>
    )
  }
  if (game.state === 'post') return <span className="status final">{game.shortDetail || 'Final'}</span>
  if (/postponed|canceled|delayed|suspended/i.test(game.detail)) return <span className="status final">{game.detail}</span>
  return (
    <span className="status">
      <span className="num clock">{tipClock(game.date).replace(/\s?[AP]M/i, '')}</span>
      <span className="ampm">{tipClock(game.date).match(/[AP]M/i)?.[0]} {tzAbbr(game.date)}</span>
    </span>
  )
}

const stop = (e: MouseEvent) => e.stopPropagation()

export function GameRow({ game, index, showScores, favTeams, pick, onToggleFav, onPick, onOpen }: Props) {
  const { odds, state } = game
  const pickable = state === 'pre'
  const mine = favTeams.includes(game.home.id) || favTeams.includes(game.away.id)

  const line = (t: TeamSide, side: 'away' | 'home') => {
    const o = odds?.[side]
    const isFav = favTeams.includes(t.id)
    const picked = pick?.teamId === t.id
    const lost = state === 'post' && !t.winner
    return (
      <div className={`line${lost ? ' lost' : ''}${t.winner ? ' won' : ''}`}>
        <div className="c-team">
          <button
            className={`fav-star${isFav ? ' on' : ''}`}
            onClick={(e) => { stop(e); onToggleFav(t.id) }}
            aria-label={isFav ? `Unfollow ${t.name}` : `Follow ${t.name}`}
            aria-pressed={isFav}
          >
            <Star filled={isFav} size={14} />
          </button>
          <TeamMark logo={t.logo} color={t.color} size={30} />
          <span className="t-name">
            <span className="t-short">{t.short}</span>
            <span className="t-sub">
              <span className="t-abbr">{t.abbr}</span> {t.record}
            </span>
          </span>
          {odds?.favoriteId === t.id && <span className="fav-tag" title={`Betting favorite · ${odds.provider}`}>Fav</span>}
        </div>
        {showScores && <div className="c-score">{state !== 'pre' && <Score value={t.score} />}</div>}
        <div className="c-odds num">
          {o?.spread.current ?? <span className="dash">—</span>}
          {o?.spreadOdds && <small>{o.spreadOdds}</small>}
        </div>
        <div className={`c-odds num${odds?.favoriteId === t.id ? ' strong' : ''}`}>
          {o?.moneyline.current ?? <span className="dash">—</span>}
        </div>
        <div className="c-odds num c-total">
          {odds?.total.current ? (
            <>
              <span className="ou">{side === 'away' ? 'O' : 'U'}</span>
              {odds.total.current}
            </>
          ) : (
            <span className="dash">—</span>
          )}
        </div>
        <div className="c-pick">
          {(pickable || picked) && (
            <button
              className={`pick${picked ? ' on' : ''}${pick?.result && picked ? ` ${pick.result === 'W' ? 'hit' : 'miss'}` : ''}`}
              disabled={!pickable}
              onClick={(e) => { stop(e); onPick(game, t) }}
              aria-pressed={picked}
              aria-label={`Pick ${t.name} to win`}
            >
              {picked && pick?.result === 'W' ? '✓' : picked && pick?.result === 'L' ? '✕' : ''}
            </button>
          )}
        </div>
      </div>
    )
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onOpen(game)
    }
  }

  const tv = game.broadcasts
  return (
    <article
      className={`row${state === 'in' ? ' is-live' : ''}${mine ? ' is-mine' : ''}`}
      style={{ '--i': index } as CSSProperties}
      onClick={() => onOpen(game)}
      onKeyDown={onKey}
      role="button"
      tabIndex={0}
      aria-label={`${game.away.name} at ${game.home.name}, open details`}
    >
      <div className="row-meta">
        <GameStatus game={game} />
        <div className="tv">
          {tv.length === 0 && state === 'pre' && <span className="net muted">TV TBA</span>}
          {tv.map((b) => (
            <span key={b.name} className={`net${b.scope === 'National' ? ' national' : ''}`} title={`${b.scope} ${b.kind}`}>
              {b.name}
              {b.scope !== 'National' && <i>{b.scope === 'Home' ? game.home.abbr : game.away.abbr}</i>}
            </span>
          ))}
        </div>
        {odds?.total.current && <span className="meta-total num">O/U {odds.total.current}</span>}
      </div>
      <div className="row-lines">
        {line(game.away, 'away')}
        {line(game.home, 'home')}
      </div>
      <span className="row-go"><Chevron size={16} /></span>
    </article>
  )
}
