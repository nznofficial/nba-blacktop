import { useEffect } from 'react'
import type { Game, TeamSide } from '../api'
import { useScoreboard } from '../lib/useScoreboard'
import type { Picks } from '../lib/picks'
import { DateStrip } from './DateStrip'
import { GameCard } from './GameCard'
import { Refresh } from './Icons'

interface Props {
  ymd: string
  setYmd: (ymd: string) => void
  favTeams: string[]
  onToggleFav: (id: string) => void
  picks: Picks
  onPick: (game: Game, team: TeamSide) => void
  onGames: (games: Game[]) => void
}

export function GamesView({ ymd, setYmd, favTeams, onToggleFav, picks, onPick, onGames }: Props) {
  const { games, error, updated, loading, live, reload } = useScoreboard(ymd)

  useEffect(() => {
    if (games) onGames(games)
  }, [games, onGames])

  const mine = games?.filter((g) => favTeams.includes(g.home.id) || favTeams.includes(g.away.id)) ?? []
  const rest = games?.filter((g) => !mine.includes(g)) ?? []
  const card = (g: Game) => (
    <GameCard key={g.id} game={g} favTeams={favTeams} onToggleFav={onToggleFav} pick={picks[g.id]} onPick={onPick} />
  )

  return (
    <section>
      <DateStrip ymd={ymd} onChange={setYmd} />

      <div className="toolbar">
        <span className="count">
          {games ? `${games.length} game${games.length === 1 ? '' : 's'}` : loading ? 'Checking the tide…' : ''}
          {live && <span className="live-tag"><span className="dot" />Live · auto-updating</span>}
        </span>
        <button className="pill ghost" onClick={reload} disabled={loading}>
          <Refresh /> {updated ? updated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="glass notice">
          <p>🌧️ Couldn't reach the scoreboard: {error}</p>
          <button className="pill" onClick={reload}>Try again</button>
        </div>
      )}

      {!games && !error && (
        <div className="grid">
          {[0, 1, 2, 3].map((i) => <div key={i} className="glass game skeleton" />)}
        </div>
      )}

      {games && games.length === 0 && (
        <div className="glass notice empty">
          <div className="big">🏝️</div>
          <p>No games on this day. Kick back on the beach.</p>
        </div>
      )}

      {mine.length > 0 && (
        <>
          <h3 className="section-title">⭐ Your teams</h3>
          <div className="grid">{mine.map(card)}</div>
          {rest.length > 0 && <h3 className="section-title">All games</h3>}
        </>
      )}
      {rest.length > 0 && <div className="grid">{rest.map(card)}</div>}

      {games && games.length > 0 && (
        <p className="fine">
          Odds are for entertainment and may lag sportsbooks. FAV marks the betting favorite. Times shown in your local time zone.
        </p>
      )}
    </section>
  )
}
