import { useCallback, useEffect, useState } from 'react'
import { fetchStandings, type Conference, type Game, type TeamSide } from './api'
import { Background } from './components/Background'
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

const THEME_NEXT: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' }
const STANDINGS_TTL = 5 * 60_000

// Supports shareable links like ?date=20261225
const initialDate = () => {
  const d = new URLSearchParams(location.search).get('date')
  return d && /^\d{8}$/.test(d) ? d : todayYMD()
}

function useTheme() {
  const [mode, setMode] = useLocalStorage<ThemeMode>('ct.theme', 'auto')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'auto' && mq.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1d3a' : '#8fdcf5')
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

  const toggleFav = useCallback(
    (id: string) => setFavTeams((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    [setFavTeams],
  )

  const onGames = useCallback((games: Game[]) => setPicks((p) => gradePicks(p, games)), [setPicks])

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

  const streak = pickStats(picks).current
  const ThemeIcon = themeMode === 'auto' ? Auto : themeMode === 'light' ? Sun : Moon

  return (
    <>
      <Background />
      <div className="app">
        <header className="topbar glass">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">🏀</span>
            <div>
              <h1>Courtside Tides</h1>
              <span className="tagline">NBA · 2026–27</span>
            </div>
          </div>
          <div className="top-actions">
            {streak >= 2 && <span className="streak-chip" title="Pick'em streak">🔥 {streak}</span>}
            <button className="icon-btn" onClick={() => setShowPicker(true)} aria-label="Choose my teams" title="My teams">
              <Star filled={favTeams.length > 0} />
            </button>
            <button className="icon-btn" onClick={cycleTheme} aria-label={`Theme: ${themeMode}`} title={`Theme: ${themeMode}`}>
              <ThemeIcon />
            </button>
          </div>
        </header>

        <nav className="seg tabs" role="tablist">
          {([
            ['games', '🏖️ Games'],
            ['standings', '🌊 Standings'],
            ['pickem', "🐚 Pick'em"],
          ] as const).map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>

        <main>
          {tab === 'games' && (
            <GamesView
              ymd={ymd}
              setYmd={setYmd}
              favTeams={favTeams}
              onToggleFav={toggleFav}
              picks={picks}
              onPick={onPick}
              onGames={onGames}
            />
          )}
          {tab === 'standings' && (
            <StandingsView conferences={standings} error={standingsError} favTeams={favTeams} onRetry={loadStandings} />
          )}
          {tab === 'pickem' && <PickemView picks={picks} onGames={onGames} goToGames={() => { setYmd(todayYMD()); setTab('games') }} />}
        </main>

        <footer className="site-foot">
          Data from ESPN · Not affiliated with the NBA · Please gamble responsibly (1-800-GAMBLER)
        </footer>
      </div>

      {showPicker && (
        <TeamPicker conferences={standings} favTeams={favTeams} onToggle={toggleFav} onClose={() => setShowPicker(false)} />
      )}
    </>
  )
}
