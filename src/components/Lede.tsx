import type { CSSProperties } from 'react'
import type { Game } from '../api'
import { dek } from './story'
import { GameStatus } from './GameRow'
import { Score } from './Score'
import { TeamMark } from './TeamMark'

interface Props {
  game: Game
  kicker: string
  onOpen: (game: Game) => void
}

export function Lede({ game, kicker, onOpen }: Props) {
  const { home, away, odds, state } = game
  const fav = odds?.favoriteId === home.id ? home : odds?.favoriteId === away.id ? away : null
  const favSide = fav === home ? odds?.home : odds?.away
  const style = { '--away': away.color, '--home': home.color } as CSSProperties
  const tv = game.broadcasts.filter((b) => b.scope === 'National').map((b) => b.name)

  return (
    <section className="lede" style={style}>
      <button className="lede-hit" onClick={() => onOpen(game)} aria-label={`Open ${away.name} at ${home.name}`} />
      <div className="lede-copy">
        <div className="kicker">
          {state === 'in' && <span className="pulse" />}
          {kicker}
          {tv.length > 0 && <span className="kicker-tv">{tv.join(' · ')}</span>}
        </div>
        <h2 className="lede-head">
          {away.short} <em>at</em> {home.short}
        </h2>
        <p className="dek">{dek(game)}</p>
        {odds && (
          <dl className="lede-line">
            <div>
              <dt>Spread</dt>
              <dd className="num">{fav ? `${fav.abbr} ${favSide?.spread.current ?? ''}` : odds.details ?? 'PK'}</dd>
            </div>
            <div>
              <dt>Moneyline</dt>
              <dd className="num">{away.abbr} {odds.away.moneyline.current ?? '—'} · {home.abbr} {odds.home.moneyline.current ?? '—'}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd className="num">{odds.total.current ?? '—'}</dd>
            </div>
          </dl>
        )}
        <span className="lede-more">Open matchup <span aria-hidden="true">→</span></span>
      </div>
      <div className="lede-art" aria-hidden="true">
        <div className="lede-team">
          <TeamMark logo={away.logo} color={away.color} size={88} glow />
          <span className="lede-abbr">{away.abbr}</span>
          <span className="lede-rec">{away.record}</span>
        </div>
        <div className="lede-mid">
          {state === 'pre' ? (
            <GameStatus game={game} />
          ) : (
            <>
              <span className="lede-score"><Score value={away.score} /><span className="sep">–</span><Score value={home.score} /></span>
              <GameStatus game={game} />
            </>
          )}
        </div>
        <div className="lede-team">
          <TeamMark logo={home.logo} color={home.color} size={88} glow />
          <span className="lede-abbr">{home.abbr}</span>
          <span className="lede-rec">{home.record}</span>
        </div>
      </div>
    </section>
  )
}
