import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchScoreboard, type Game } from '../api'
import { dayLabel, shortDate, todayYMD } from '../lib/date'
import { APP_URL, pickStats, type Picks } from '../lib/picks'
import { canvasBlob, renderDayCard, renderSeasonCard } from '../lib/shareCard'
import { Share } from './Icons'

interface Props {
  picks: Picks
  onGames: (games: Game[]) => void
  goToGames: () => void
}

export function PickemView({ picks, onGames, goToGames }: Props) {
  const stats = useMemo(() => pickStats(picks), [picks])
  const [status, setStatus] = useState<{ key: string; label: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  // Card images rendered ahead of time (key: 'card' or a day's ymd), so tapping Share can open the sheet without
  // an async gap (iOS Safari drops the tap's user activation if we render first).
  const cards = useRef(new Map<string, Blob>())

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

  // Re-render every card in the background whenever a pick or result changes.
  const cardsKey = useMemo(
    () => JSON.stringify([todayYMD(), Object.values(picks).map((p) => [p.gameId, p.teamId, p.result])]),
    [picks],
  )
  useEffect(() => {
    let live = true
    cards.current.clear()
    ;(async () => {
      const jobs: [string, () => Promise<HTMLCanvasElement>][] = [
        ['card', () => renderSeasonCard(picks)],
        ...days.map(({ ymd }) => [ymd, () => renderDayCard(picks, ymd)] as [string, () => Promise<HTMLCanvasElement>]),
      ]
      for (const [key, render] of jobs) {
        const blob = await canvasBlob(await render()).catch(() => null)
        if (!live) return
        if (blob) cards.current.set(key, blob)
      }
    })()
    return () => {
      live = false
    }
  }, [cardsKey])

  // Share sheet with the card image and the link under it; on desktop, copy (or download) the image and copy the link.
  const share = async (key: string, render: () => Promise<HTMLCanvasElement>) => {
    if (busy) return
    setBusy(key)
    let label: string | null = null
    try {
      const blob = cards.current.get(key) ?? (await canvasBlob(await render()))
      const file = new File([blob], `blacktop-pickem-${key}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        // iOS Messages puts shared text above the photo; passing the link as `url` keeps the photo first there.
        await navigator.share(isIOS() ? { files: [file], url: APP_URL } : { files: [file], text: APP_URL })
      } else if (navigator.share) {
        await navigator.share({ url: APP_URL })
      } else {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob, 'text/plain': new Blob([APP_URL], { type: 'text/plain' }) }),
          ])
          label = 'Copied'
        } catch {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = file.name
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 1000)
          await navigator.clipboard.writeText(APP_URL).catch(() => {})
          label = 'Saved'
        }
      }
    } catch {
      /* user dismissed share sheet */
    } finally {
      setBusy(null)
    }
    if (label) {
      setStatus({ key, label })
      setTimeout(() => setStatus(null), 2000)
    }
  }
  const shareLabel = (key: string) => (busy === key ? 'Making…' : status?.key === key ? status.label : 'Share')

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
      <div className="card-foot">
        <p className="footnote left">
          {stats.pending > 0 && `${stats.pending} pick${stats.pending === 1 ? '' : 's'} awaiting a final whistle.`}
        </p>
        {days.length > 0 && (
          <button className="ghost-btn" onClick={() => share('card', () => renderSeasonCard(picks))} disabled={busy === 'card'}>
            <Share /> {shareLabel('card')}
          </button>
        )}
      </div>

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
                <button className="ghost-btn" onClick={() => share(ymd, () => renderDayCard(picks, ymd))} disabled={busy === ymd}>
                  <Share /> {shareLabel(ymd)}
                </button>
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

// iPadOS reports itself as a Mac, so also check for touch.
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
