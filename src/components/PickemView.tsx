import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchScoreboard, type Game } from '../api'
import { dayLabel, shortDate, todayYMD } from '../lib/date'
import { APP_URL, dayPicks, pickStats, shareText, type Picks } from '../lib/picks'
import { canvasBlob, renderShareCard } from '../lib/shareCard'
import { Share } from './Icons'

interface Props {
  picks: Picks
  onGames: (games: Game[]) => void
  goToGames: () => void
}

export function PickemView({ picks, onGames, goToGames }: Props) {
  const stats = useMemo(() => pickStats(picks), [picks])
  const [status, setStatus] = useState<{ ymd: string; label: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  // Card images pre-rendered by the thumbnails, so tapping Share can open the sheet without an async gap
  // (iOS Safari drops the tap's user activation if we render first).
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

  // Share sheet with the card image where supported; otherwise copy (or download) the image and copy the text + link.
  const share = async (ymd: string) => {
    if (busy) return
    setBusy(ymd)
    const text = shareText(picks, ymd, shortDate(ymd))
    const withLink = `${text}\n${APP_URL}`
    let label: string | null = null
    try {
      const blob = cards.current.get(ymd) ?? (await canvasBlob(await renderShareCard(picks, ymd)))
      const file = new File([blob], `blacktop-pickem-${ymd}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: withLink })
      } else if (navigator.share) {
        await navigator.share({ text, url: APP_URL })
      } else {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob, 'text/plain': new Blob([withLink], { type: 'text/plain' }) }),
          ])
          label = 'Copied'
        } catch {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = file.name
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 1000)
          await navigator.clipboard.writeText(withLink).catch(() => {})
          label = 'Saved'
        }
      }
    } catch {
      /* user dismissed share sheet */
    } finally {
      setBusy(null)
    }
    if (label) {
      setStatus({ ymd, label })
      setTimeout(() => setStatus(null), 2000)
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
                <button className="ghost-btn" onClick={() => share(ymd)} disabled={busy === ymd}>
                  <Share /> {busy === ymd ? 'Making…' : status?.ymd === ymd ? status.label : 'Share'}
                </button>
              </span>
            </h3>
            <div className="ledger-body">
              <ShareThumb
                picks={picks}
                ymd={ymd}
                onBlob={(b) => cards.current.set(ymd, b)}
                onClick={() => share(ymd)}
              />
              <ul className="ledger-list">
                {list.map((p) => (
                  <li key={p.gameId} className={p.result === 'W' ? 'hit' : p.result === 'L' ? 'miss' : ''}>
                    <span className="num">{p.matchup}</span>
                    <span>Picked <b>{p.teamAbbr}</b></span>
                    <span className="verdict">{p.result === 'W' ? 'Correct' : p.result === 'L' ? 'Missed' : 'Pending'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** Small preview of the day's share image; tapping it shares. */
function ShareThumb({ picks, ymd, onBlob, onClick }: { picks: Picks; ymd: string; onBlob: (b: Blob) => void; onClick: () => void }) {
  const [src, setSrc] = useState<string | null>(null)
  // Redraw only when something on the card changes: this day's picks/results or the season figures.
  const key = useMemo(() => {
    const s = pickStats(picks)
    return JSON.stringify([dayPicks(picks, ymd).map((p) => [p.matchup, p.teamAbbr, p.result]), s, todayYMD()])
  }, [picks, ymd])

  useEffect(() => {
    let url: string | null = null
    let live = true
    renderShareCard(picks, ymd)
      .then(canvasBlob)
      .then((blob) => {
        if (!live) return
        onBlob(blob)
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => {})
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [key])

  return (
    <button className="share-thumb" onClick={onClick} aria-label={`Share your ${shortDate(ymd)} card`}>
      {src ? <img src={src} alt="" width={1080} height={1080} /> : <span aria-hidden="true" />}
    </button>
  )
}
