import { useEffect, useMemo } from 'react'
import type { Game, TeamSide } from '../api'
import { longDate, slateHeadline, tipClock, tzAbbr } from '../lib/date'
import type { Picks } from '../lib/picks'
import { useScoreboard } from '../lib/useScoreboard'
import { DateRail } from './DateRail'
import { GameRow } from './GameRow'
import { Refresh } from './Icons'
import { Lede } from './Lede'
import { featured } from './story'

interface Props {
  ymd: string
  setYmd: (ymd: string) => void
  favTeams: string[]
  onToggleFav: (id: string) => void
  picks: Picks
  onPick: (game: Game, team: TeamSide) => void
  onGames: (games: Game[]) => void
  onOpen: (game: Game) => void
}

export function GamesView({ ymd, setYmd, favTeams, onToggleFav, picks, onPick, onGames, onOpen }: Props) {
  const { games, error, updated, loading, live, reload } = useScoreboard(ymd)

  useEffect(() => {
    if (games) onGames(games)
  }, [games, onGames])

  const lede = useMemo(() => (games ? featured(games, favTeams) : null), [games, favTeams])
  const mine = games?.filter((g) => favTeams.includes(g.home.id) || favTeams.includes(g.away.id)) ?? []
  const rest = games?.filter((g) => !mine.includes(g)) ?? []
  const showScores = games?.some((g) => g.state !== 'pre') ?? false
  const hasOdds = games?.some((g) => g.odds) ?? false
  const head = slateHeadline(ymd)
  const pickable = games?.filter((g) => g.state === 'pre').length ?? 0
  const picked = games?.filter((g) => g.state === 'pre' && picks[g.id]).length ?? 0
  const liveCount = games?.filter((g) => g.state === 'in').length ?? 0

  const board = (list: Game[], offset = 0) => (
    <div className={`board${showScores ? ' has-scores' : ''}${hasOdds ? '' : ' no-odds'}`}>
      <div className="board-head" aria-hidden="true">
        <span className="h-meta">Tip · TV</span>
        <div className="h-lines">
          <span className="h-team">Matchup</span>
          {showScores && <span>Score</span>}
          <span className="h-odds">Spread</span>
          <span className="h-odds">Money</span>
          <span className="h-odds c-total">Total</span>
          <span>Pick</span>
        </div>
        <span />
      </div>
      {list.map((g, i) => (
        <GameRow
          key={g.id}
          game={g}
          index={i + offset}
          showScores={showScores}
          favTeams={favTeams}
          pick={picks[g.id]}
          onToggleFav={onToggleFav}
          onPick={onPick}
          onOpen={onOpen}
        />
      ))}
    </div>
  )

  return (
    <div className="page">
      <header className="masthead">
        <div className="dateline">
          <span>{longDate(ymd)}</span>
          {live && (
            <span className="live-chip">
              <span className="pulse" /> {liveCount} live
            </span>
          )}
        </div>
        <h1 className="page-title">
          <em>{head.lead}</em> {head.tail}
        </h1>
        <p className="standfirst">
          {games == null
            ? 'Checking the tide charts…'
            : games.length === 0
              ? 'No games on the schedule. A quiet day on the boardwalk.'
              : `${games.length} game${games.length === 1 ? '' : 's'} · first tip ${tipClock(games[0].date)} ${tzAbbr(games[0].date)}${
                  pickable ? ` · ${picked}/${pickable} picks made` : ''
                }`}
        </p>
      </header>

      <DateRail ymd={ymd} onChange={setYmd} />

      {error && (
        <div className="notice">
          <p>We couldn’t reach the scoreboard ({error}).</p>
          <button className="btn" onClick={reload}>Try again</button>
        </div>
      )}

      {!games && !error && (
        <div className="board">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="row skeleton" style={{ animationDelay: `${i * 90}ms` }} />)}
        </div>
      )}

      {games && games.length === 0 && (
        <div className="empty">
          <svg viewBox="0 0 120 40" aria-hidden="true"><path d="M2 26c10-8 20-8 30 0s20 8 30 0 20-8 30 0 20 8 26 2" /></svg>
          <p>Nothing on the slate. Try another day.</p>
        </div>
      )}

      {games && games.length > 0 && (
        <div key={ymd} className="slate">
          {lede && <Lede game={lede.game} kicker={lede.kicker} onOpen={onOpen} />}

          {mine.length > 0 && (
            <>
              <h3 className="rule-head"><span>Your teams</span></h3>
              {board(mine)}
            </>
          )}
          {rest.length > 0 && (
            <>
              <h3 className="rule-head">
                <span>{mine.length ? 'Around the league' : 'The full slate'}</span>
                <button className="ghost-btn" onClick={reload} disabled={loading} title="Refresh">
                  <Refresh /> {updated ? `Updated ${updated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : 'Refresh'}
                </button>
              </h3>
              {board(rest, mine.length)}
            </>
          )}
          <p className="footnote">
            Lines via {games.find((g) => g.odds)?.odds?.provider ?? 'ESPN'}, for entertainment. “Fav” marks the betting favorite. Times in your
            local zone. Tap any game for the full matchup.
          </p>
        </div>
      )}
    </div>
  )
}
