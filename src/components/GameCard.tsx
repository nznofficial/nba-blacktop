import type { CSSProperties } from 'react'
import type { Game, TeamSide } from '../api'
import { tipTime } from '../lib/date'
import type { Pick } from '../lib/picks'
import { Star, Tv } from './Icons'

interface Props {
  game: Game
  favTeams: string[]
  onToggleFav: (teamId: string) => void
  pick?: Pick
  onPick: (game: Game, team: TeamSide) => void
}

function Status({ game }: { game: Game }) {
  if (game.state === 'in') {
    return <span className="status live"><span className="dot" />{game.shortDetail}</span>
  }
  if (game.state === 'post') return <span className="status final">{game.shortDetail || 'Final'}</span>
  if (/postponed|canceled|delayed/i.test(game.detail)) return <span className="status final">{game.detail}</span>
  return <span className="status">{tipTime(game.date)}</span>
}

export function GameCard({ game, favTeams, onToggleFav, pick, onPick }: Props) {
  const { odds, state } = game
  const showScore = state !== 'pre'
  const isFavGame = favTeams.includes(game.home.id) || favTeams.includes(game.away.id)
  const style = { '--away': game.away.color, '--home': game.home.color } as CSSProperties

  const row = (t: TeamSide, side: 'home' | 'away') => {
    const o = odds?.[side]
    const isFav = favTeams.includes(t.id)
    const lost = state === 'post' && !t.winner
    return (
      <div className={`team-row${lost ? ' lost' : ''}`}>
        <button
          className={`star${isFav ? ' on' : ''}`}
          onClick={() => onToggleFav(t.id)}
          aria-label={isFav ? `Unfollow ${t.name}` : `Follow ${t.name}`}
          aria-pressed={isFav}
        >
          <Star filled={isFav} />
        </button>
        <img className="logo" src={t.logo} alt="" loading="lazy" width={40} height={40} />
        <div className="team-name">
          <span className="name">
            <span className="full">{t.name}</span>
            <span className="abbr">{t.short}</span>
            {odds?.favoriteId === t.id && <span className="fav-badge" title={`Betting favorite (${odds.provider})`}>FAV</span>}
          </span>
          <span className="record">{t.record}{side === 'home' ? ' · Home' : ' · Away'}</span>
        </div>
        {showScore && <span className={`score${t.winner ? ' won' : ''}`}>{t.score ?? '-'}</span>}
        {odds && (
          <>
            <span className="odd" title="Moneyline">{o?.moneyline ?? '–'}</span>
            <span className="odd" title={o?.spreadOdds ? `Spread (${o.spreadOdds})` : 'Spread'}>{o?.spread ?? '–'}</span>
          </>
        )}
      </div>
    )
  }

  const pickable = state === 'pre'
  return (
    <article className={`game glass${isFavGame ? ' fav-game' : ''}${state === 'in' ? ' is-live' : ''}`} style={style}>
      <header className="game-top">
        <Status game={game} />
        <div className="tv">
          {game.broadcasts.map((b) => (
            <span key={b.name} className={`chip ${b.scope.toLowerCase()}`} title={`${b.scope} ${b.kind}`}>
              {b.scope === 'National' && <Tv />}
              {b.name}
              {b.scope !== 'National' && <small>{b.scope === 'Home' ? game.home.abbr : game.away.abbr}</small>}
            </span>
          ))}
          {game.broadcasts.length === 0 && state === 'pre' && <span className="chip muted">TV TBD</span>}
        </div>
      </header>

      <div className={`matchup${showScore ? ' with-score' : ''}${odds ? ' with-odds' : ''}`}>
        {odds && (
          <div className="col-heads" aria-hidden="true">
            <span>ML</span>
            <span>Spread</span>
          </div>
        )}
        {row(game.away, 'away')}
        {row(game.home, 'home')}
      </div>

      <footer className="game-foot">
        <div className="meta">
          {odds?.overUnder != null && <span>O/U <b>{odds.overUnder}</b></span>}
          {odds && <span className="provider">via {odds.provider}</span>}
          {!odds && state === 'pre' && <span>Lines not posted yet</span>}
          {game.venue && <span className="venue">{game.venue}</span>}
        </div>
        {(pickable || pick) && (
        <div className="pickem" role="group" aria-label="Pick'em">
          <span className="pick-label">
            {pick?.result === 'W' ? '🌊 Nailed it' : pick?.result === 'L' ? '🪨 Wiped out' : pickable ? 'Your pick' : 'Locked'}
          </span>
          {[game.away, game.home].map((t) => (
            <button
              key={t.id}
              className={`pick-btn${pick?.teamId === t.id ? ' picked' : ''}`}
              disabled={!pickable}
              onClick={() => onPick(game, t)}
              aria-pressed={pick?.teamId === t.id}
            >
              {t.abbr}
            </button>
          ))}
        </div>
        )}
      </footer>
    </article>
  )
}
