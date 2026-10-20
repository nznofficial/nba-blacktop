import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchStandings, type Conference, type Game, type TeamSide } from './api'
import { Background } from './components/Background'
import { GameDrawer } from './components/GameDrawer'
import { GamesView } from './components/GamesView'
import { Auto, Moon, Star, Sun } from './components/Icons'
import { PickemView } from './components/PickemView'
import { StandingsView } from './components/StandingsView'
import { TeamPicker } from './components/TeamPicker'
import { todayYMD } from './lib/date'
import { gradePicks, pickStats, type Picks } from './lib/picks'
import { useLocalStorage } from './lib/storage'

type Tab = 'games' | 'standings' | 'pickem'
type ThemeMode = 'auto' | 'light' | 'dark'

const TABS: [Tab, string][] = [
  ['games', 'Scores & Odds'],
  ['standings', 'Standings'],
  ['pickem', 'Pick’em'],
]
const THEME_NEXT: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' }
const THEME_LABEL: Record<ThemeMode, string> = { auto: 'Auto', light: 'Concrete', dark: 'After hours' }
const STANDINGS_TTL = 5 * 60_000

// Supports shareable links like ?date=20261225 and #game=401909088
const initialDate = () => {
  const d = new URLSearchParams(location.search).get('date')
  return d && /^\d{8}$/.test(d) ? d : todayYMD()
}
const gameFromHash = () => location.hash.match(/^#game=(\d+)$/)?.[1] ?? null

function useTheme() {
  const [mode, setMode] = useLocalStorage<ThemeMode>('ct.theme', 'auto')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'auto' && mq.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0d0d0e' : '#e9e7e2')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [mode])
  return [mode, () => setMode(THEME_NEXT[mode])] as const
}

export default function App() {
  const [tab, setTab] = useLocalStorage<Tab>('ct.tab', 'games')
  const [ymd, setYmd] = useState(initialDate)
  const [favTeams, setFavTeams] = useLocalStorage<string[]>('ct.favTeams', [])
  const [picks, setPicks] = useLocalStorage<Picks>('ct.picks', {})
  const [themeMode, cycleTheme] = useTheme()
  const [showPicker, setShowPicker] = useState(false)
  const [openGameId, setOpenGameId] = useState<string | null>(gameFromHash)
  const knownGames = useRef(new Map<string, Game>())
  const [, bump] = useState(0)

  const [standings, setStandings] = useState<Conference[] | null>(null)
  const [standingsError, setStandingsError] = useState<string | null>(null)
  const [standingsAt, setStandingsAt] = useState(0)

  const loadStandings = useCallback(() => {
    setStandingsError(null)
    fetchStandings()
      .then((s) => {
        setStandings(s)
        setStandingsAt(Date.now())
      })
      .catch((e) => setStandingsError(e instanceof Error ? e.message : 'Unknown error'))
  }, [])

  useEffect(() => {
    if (!standingsAt || (tab === 'standings' && Date.now() - standingsAt > STANDINGS_TTL)) loadStandings()
  }, [tab, standingsAt, loadStandings])

  useEffect(() => {
    const onPop = () => setOpenGameId(gameFromHash())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openGame = useCallback((g: Game) => {
    history.pushState({ drawer: true }, '', `#game=${g.id}`)
    setOpenGameId(g.id)
  }, [])

  const closeGame = useCallback(() => {
    if (history.state?.drawer) history.back()
    else history.replaceState(null, '', location.pathname + location.search)
    setOpenGameId(null)
  }, [])

  const toggleFav = useCallback(
    (id: string) => setFavTeams((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    [setFavTeams],
  )

  const onGames = useCallback(
    (games: Game[]) => {
      for (const g of games) knownGames.current.set(g.id, g)
      bump((n) => n + 1)
      setPicks((p) => gradePicks(p, games))
    },
    [setPicks],
  )

  const onPick = useCallback(
    (game: Game, team: TeamSide) =>
      setPicks((p) => {
        const next = { ...p }
        if (p[game.id]?.teamId === team.id) delete next[game.id]
        else
          next[game.id] = {
            gameId: game.id,
            ymd,
            tip: game.date,
            teamId: team.id,
            teamAbbr: team.abbr,
            matchup: `${game.away.abbr} @ ${game.home.abbr}`,
          }
        return next
      }),
    [setPicks, ymd],
  )

  const switchTab = (t: Tab) => {
    setTab(t)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const streak = pickStats(picks).current
  const ThemeIcon = themeMode === 'auto' ? Auto : themeMode === 'light' ? Sun : Moon

  return (
    <>
      <Background />
      <nav className="nav">
        <div className="nav-inner">
          <button className="wordmark" onClick={() => { setYmd(todayYMD()); switchTab('games') }} aria-label="Blacktop, go to today">
            <span className="wm-box">Blacktop</span>
            <span className="wm-tag">NBA 26–27</span>
          </button>
          <div className="nav-tabs" role="tablist">
            {TABS.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'on' : ''} onClick={() => switchTab(key)}>
                {label}
                {key === 'pickem' && streak >= 2 && <span className="tab-badge num">{streak}</span>}
              </button>
            ))}
          </div>
          <div className="nav-actions">
            <button className="nav-btn" onClick={() => setShowPicker(true)} title="Follow teams">
              <Star filled={favTeams.length > 0} size={15} />
              <span className="nav-btn-label">{favTeams.length ? `Following ${favTeams.length}` : 'Follow teams'}</span>
            </button>
            <button className="nav-btn icon" onClick={cycleTheme} title={`Theme: ${THEME_LABEL[themeMode]}`} aria-label={`Theme: ${THEME_LABEL[themeMode]}. Change theme`}>
              <ThemeIcon />
            </button>
          </div>
        </div>
      </nav>

      <main key={tab} className="main">
        {tab === 'games' && (
          <GamesView
            ymd={ymd}
            setYmd={setYmd}
            favTeams={favTeams}
            onToggleFav={toggleFav}
            picks={picks}
            onPick={onPick}
            onGames={onGames}
            onOpen={openGame}
          />
        )}
        {tab === 'standings' && (
          <StandingsView conferences={standings} error={standingsError} favTeams={favTeams} onToggleFav={toggleFav} onRetry={loadStandings} />
        )}
        {tab === 'pickem' && (
          <PickemView picks={picks} onGames={onGames} goToGames={() => { setYmd(todayYMD()); switchTab('games') }} />
        )}
      </main>

      <footer className="colophon">
        <div className="colo-mark" aria-hidden="true">Blacktop</div>
        <p>
          Data from ESPN · Not affiliated with the NBA.
          <br />
          Odds for entertainment only. If you gamble, please do so responsibly: 1-800-GAMBLER.
        </p>
      </footer>

      {openGameId && (
        <GameDrawer
          key={openGameId}
          gameId={openGameId}
          initial={knownGames.current.get(openGameId) ?? null}
          pick={picks[openGameId]}
          onPick={onPick}
          onClose={closeGame}
        />
      )}
      {showPicker && (
        <TeamPicker conferences={standings} favTeams={favTeams} onToggle={toggleFav} onClose={() => setShowPicker(false)} />
      )}
    </>
  )
}
