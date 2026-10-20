import { useEffect, useMemo, useState } from 'react'
import { fetchScoreboard, type Game } from '../api'
import { dayLabel, shortDate, todayYMD } from '../lib/date'
import { pickStats, shareText, type Picks } from '../lib/picks'

interface Props {
  picks: Picks
  onGames: (games: Game[]) => void
  goToGames: () => void
}

export function PickemView({ picks, onGames, goToGames }: Props) {
  const stats = useMemo(() => pickStats(picks), [picks])
  const [copied, setCopied] = useState<string | null>(null)

  const days = useMemo(() => {
    const map = new Map<string, Picks[string][]>()
    for (const p of Object.values(picks)) map.set(p.ymd, [...(map.get(p.ymd) ?? []), p])
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([ymd, list]) => ({ ymd, list: list.sort((a, b) => +new Date(a.tip) - +new Date(b.tip)) }))
  }, [picks])

  // Grade picks from days that haven't been viewed since their games ended.
  const ungradedDays = useMemo(
    () => [...new Set(Object.values(picks).filter((p) => !p.result && new Date(p.tip) < new Date()).map((p) => p.ymd))].sort().join(','),
    [picks],
  )
  useEffect(() => {
    if (!ungradedDays) return
    for (const ymd of ungradedDays.split(',')) fetchScoreboard(ymd).then(onGames).catch(() => {})
  }, [ungradedDays, onGames])

  const share = async (ymd: string) => {
    const text = shareText(picks, ymd, shortDate(ymd))
    try {
      if (navigator.share) await navigator.share({ text })
      else await navigator.clipboard.writeText(text)
      setCopied(ymd)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      /* user dismissed share sheet */
    }
  }

  const total = stats.wins + stats.losses
  const tiles = [
    { label: 'Record', value: `${stats.wins}-${stats.losses}` },
    { label: 'Hit rate', value: total ? `${Math.round((stats.wins / total) * 100)}%` : '—' },
    { label: 'Streak', value: stats.current ? `🔥 ${stats.current}` : '0' },
    { label: 'Best streak', value: String(stats.best) },
    { label: 'Perfect days', value: stats.perfectDays ? `🐚 ${stats.perfectDays}` : '0' },
    { label: 'Pending', value: String(stats.pending) },
  ]

  return (
    <section>
      <div className="glass pickem-hero">
        <div>
          <div className="eyebrow">Daily Pick'em</div>
          <h2>Ride the wave 🏄</h2>
          <p className="sub">
            Pick the winner of each game before tip-off from the Games tab. Picks are graded automatically,
            so come back daily to build your streak. A day with every pick right counts as a perfect day.
          </p>
        </div>
        <button className="pill" onClick={goToGames}>Make picks</button>
      </div>

      <div className="tiles">
        {tiles.map((t) => (
          <div key={t.label} className="glass tile">
            <div className="tile-value">{t.value}</div>
            <div className="tile-label">{t.label}</div>
          </div>
        ))}
      </div>

      {days.length === 0 && (
        <div className="glass notice empty">
          <div className="big">🐚</div>
          <p>No picks yet. Head to today's games and tap a team under “Your pick”.</p>
        </div>
      )}

      {days.map(({ ymd, list }) => {
        const w = list.filter((p) => p.result === 'W').length
        const graded = list.filter((p) => p.result).length
        return (
          <div key={ymd} className="glass pick-day">
            <div className="pick-day-head">
              <div>
                <strong>{ymd === todayYMD() ? 'Today' : dayLabel(ymd)}</strong> <span className="sub">{shortDate(ymd)}</span>
              </div>
              <div className="pick-day-actions">
                <span className="grid-emoji">{list.map((p) => (p.result === 'W' ? '🌊' : p.result === 'L' ? '🪨' : '🐚')).join('')}</span>
                <span className="sub">{graded ? `${w}/${graded}` : 'pending'}</span>
                <button className="pill ghost small" onClick={() => share(ymd)}>{copied === ymd ? 'Copied!' : 'Share'}</button>
              </div>
            </div>
            <ul className="pick-list">
              {list.map((p) => (
                <li key={p.gameId} className={p.result ? p.result.toLowerCase() : 'pending'}>
                  <span>{p.matchup}</span>
                  <span>
                    picked <b>{p.teamAbbr}</b> {p.result === 'W' ? '✅' : p.result === 'L' ? '❌' : '⏳'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
