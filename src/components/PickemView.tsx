import { useEffect, useMemo, useState } from 'react'
import { fetchScoreboard, type Game } from '../api'
import { dayLabel, shortDate, todayYMD } from '../lib/date'
import { pickStats, shareText, type Picks } from '../lib/picks'
import { Share } from './Icons'

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
  const figures = [
    { label: 'Record', value: `${stats.wins}–${stats.losses}` },
    { label: 'Hit rate', value: total ? `${Math.round((stats.wins / total) * 100)}%` : '—' },
    { label: 'Streak', value: String(stats.current), hot: stats.current >= 3 },
    { label: 'Best run', value: String(stats.best) },
    { label: 'Perfect days', value: String(stats.perfectDays) },
  ]

  return (
    <div className="page">
      <header className="masthead">
        <div className="dateline"><span>Daily pick’em</span></div>
        <h1 className="page-title"><em>Your</em> Card</h1>
        <p className="standfirst">
          Pick a winner in every game before tip-off. Picks are graded automatically when games go final. Build a streak, and
          chase the perfect day.
        </p>
      </header>

      <div className="figures">
        {figures.map((f) => (
          <div key={f.label} className={`figure${f.hot ? ' hot' : ''}`}>
            <span className="fig-val num">{f.value}</span>
            <span className="fig-label">{f.label}</span>
          </div>
        ))}
      </div>
      {stats.pending > 0 && <p className="footnote left">{stats.pending} pick{stats.pending === 1 ? '' : 's'} awaiting a final whistle.</p>}

      {days.length === 0 && (
        <div className="empty">
          <span className="empty-mark" aria-hidden="true">Blank card</span>
          <p>Your card is blank. Make your first picks on today’s slate.</p>
          <button className="btn" onClick={goToGames}>Go to today’s games</button>
        </div>
      )}

      {days.map(({ ymd, list }) => {
        const w = list.filter((p) => p.result === 'W').length
        const graded = list.filter((p) => p.result).length
        return (
          <section key={ymd} className="ledger">
            <h3 className="rule-head">
              <span>{ymd === todayYMD() ? 'Today' : dayLabel(ymd)} · {shortDate(ymd)}</span>
              <span className="ledger-actions">
                <span className="marks" aria-label={`${w} of ${graded} correct`}>
                  {list.map((p) => <i key={p.gameId} className={p.result === 'W' ? 'hit' : p.result === 'L' ? 'miss' : ''} />)}
                </span>
                <span className="num ledger-score">{graded ? `${w}/${graded}` : 'Pending'}</span>
                <button className="ghost-btn" onClick={() => share(ymd)}><Share /> {copied === ymd ? 'Copied' : 'Share'}</button>
              </span>
            </h3>
            <ul className="ledger-list">
              {list.map((p) => (
                <li key={p.gameId} className={p.result === 'W' ? 'hit' : p.result === 'L' ? 'miss' : ''}>
                  <span className="num">{p.matchup}</span>
                  <span>Picked <b>{p.teamAbbr}</b></span>
                  <span className="verdict">{p.result === 'W' ? 'Correct' : p.result === 'L' ? 'Missed' : 'Pending'}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
