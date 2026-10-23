import { dayLabel, shortDate } from './date'
import { dayPicks, pickStats, type Picks } from './picks'

// The share image is always drawn in the After Hours palette so it reads the same wherever it's posted.
const C = {
  paper: '#0d0d0e',
  card: '#161618',
  ink: '#f2f0ea',
  ink2: '#a5a39d',
  ink3: '#66645f',
  rule: 'rgba(242, 240, 234, 0.11)',
  dot: 'rgba(242, 240, 234, 0.07)',
  accent: '#ff6a2b',
  win: '#4fdc84',
  live: '#ff3b3b',
}
const DISPLAY = '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif'
const SANS = 'Archivo, -apple-system, "Segoe UI", sans-serif'
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace'

export const SHARE_SIZE = 1080
const PAD = 72

let fontsReady: Promise<unknown> | null = null
const loadFonts = () =>
  (fontsReady ??= Promise.all(
    [`900 64px ${DISPLAY}`, `800 24px ${SANS}`, `600 24px ${SANS}`, `700 24px ${MONO}`, `500 24px ${MONO}`].map((f) =>
      document.fonts.load(f).catch(() => {}),
    ),
  ))

/** Sets the font, shrinking the size until `text` fits in `max` px. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, px: number, max: number) {
  ctx.font = font(px)
  while (px > 10 && ctx.measureText(text).width > max) ctx.font = font(--px)
  return px
}

/** Letter-spaced text (canvas letterSpacing isn't everywhere yet). Returns the drawn width. */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, track: number, align: 'left' | 'right' = 'left') {
  const w = [...text].reduce((s, ch) => s + ctx.measureText(ch).width + track, -track)
  let cx = align === 'right' ? x - w : x
  const prev = ctx.textAlign
  ctx.textAlign = 'left'
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + track
  }
  ctx.textAlign = prev
  return w
}

const verdictOf = (r?: 'W' | 'L') => (r === 'W' ? { text: 'CORRECT', bg: C.win } : r === 'L' ? { text: 'MISSED', bg: C.live } : null)

/** Draws the 1080×1080 Pick'em card for one day: header, day score, picks, and the overall "Your Card" strip. */
export async function renderShareCard(picks: Picks, ymd: string): Promise<HTMLCanvasElement> {
  await loadFonts()
  const S = SHARE_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!
  ctx.textBaseline = 'alphabetic'

  const list = dayPicks(picks, ymd)
  const w = list.filter((p) => p.result === 'W').length
  const graded = list.filter((p) => p.result).length
  const perfect = list.length >= 2 && w === list.length
  const stats = pickStats(picks)

  // Asphalt + dot grid
  ctx.fillStyle = C.paper
  ctx.fillRect(0, 0, S, S)
  ctx.fillStyle = C.dot
  for (let y = 18; y < S; y += 36) for (let x = 18; x < S; x += 36) ctx.fillRect(x - 1.5, y - 1.5, 3, 3)
  ctx.strokeStyle = C.ink
  ctx.lineWidth = 4
  ctx.strokeRect(24, 24, S - 48, S - 48)

  // Header: wordmark, tape label, dateline
  ctx.fillStyle = C.ink
  ctx.font = `900 76px ${DISPLAY}`
  spaced(ctx, 'BLACKTOP', PAD, PAD + 64, 3)

  ctx.save()
  ctx.translate(S - PAD, PAD + 30)
  ctx.rotate(-0.035)
  ctx.font = `700 22px ${MONO}`
  const tape = "DAILY PICK'EM"
  const tw = [...tape].reduce((s, ch) => s + ctx.measureText(ch).width + 3, -3)
  ctx.fillStyle = C.accent
  ctx.fillRect(-tw - 36, -26, tw + 36, 46)
  ctx.fillStyle = C.paper
  spaced(ctx, tape, -18, 6, 3, 'right')
  ctx.restore()

  ctx.fillStyle = C.ink2
  ctx.font = `500 26px ${MONO}`
  spaced(ctx, `${dayLabel(ymd)} · ${shortDate(ymd)}`.toUpperCase(), PAD, PAD + 118, 2)

  ctx.fillStyle = C.rule
  ctx.fillRect(PAD, PAD + 146, S - PAD * 2, 2)

  // Hero: day score + marks
  const heroBase = 404
  ctx.fillStyle = graded ? C.ink : C.ink3
  const score = graded ? `${w}/${graded}` : 'PENDING'
  const scorePx = fit(ctx, score, (px) => `900 ${px}px ${DISPLAY}`, graded ? 230 : 170, 520)
  ctx.fillText(score, PAD - 4, heroBase)
  const scoreW = ctx.measureText(score).width

  const hx = PAD + scoreW + 40
  ctx.font = `700 22px ${MONO}`
  ctx.fillStyle = perfect ? C.accent : C.ink3
  const sub = perfect ? 'PERFECT DAY' : graded < list.length ? `${list.length - graded} PENDING` : 'CORRECT'
  spaced(ctx, sub, hx, heroBase - scorePx * 0.52, 3)

  const sq = list.length > 10 ? 22 : 28
  const gap = 8
  const perRow = Math.max(1, Math.floor((S - PAD - hx + gap) / (sq + gap)))
  list.forEach((p, i) => {
    const x = hx + (i % perRow) * (sq + gap)
    const y = heroBase - scorePx * 0.42 + Math.floor(i / perRow) * (sq + gap)
    if (p.result) {
      ctx.fillStyle = p.result === 'W' ? C.win : C.live
      ctx.fillRect(x, y, sq, sq)
    } else {
      ctx.strokeStyle = C.ink3
      ctx.lineWidth = 4
      ctx.strokeRect(x + 2, y + 2, sq - 4, sq - 4)
    }
  })

  // Pick list: one column for small slates, two for big ones
  const top = heroBase + 66
  const bottom = 806
  const cols = list.length > 7 ? 2 : 1
  const rows = Math.max(1, Math.ceil(list.length / cols))
  const colGap = 36
  const colW = (S - PAD * 2 - colGap * (cols - 1)) / cols
  const rowH = Math.min(cols === 1 ? 64 : 58, (bottom - top) / rows)
  const fs = Math.round(Math.min(cols === 1 ? 28 : 24, rowH * 0.48))
  list.forEach((p, i) => {
    const col = cols === 1 ? 0 : Math.floor(i / rows)
    const row = cols === 1 ? i : i % rows
    const x = PAD + col * (colW + colGap)
    const y = top + row * rowH
    const mid = y + rowH / 2

    ctx.fillStyle = C.rule
    ctx.fillRect(x, y + rowH - 2, colW, 2)

    ctx.textBaseline = 'middle'
    ctx.fillStyle = C.ink
    ctx.font = `600 ${fs}px ${MONO}`
    ctx.fillText(p.matchup, x, mid)
    const mw = ctx.measureText(cols === 1 ? 'MMM @ MMM' : p.matchup).width

    const v = verdictOf(p.result)
    ctx.font = `700 ${Math.round(fs * 0.68)}px ${MONO}`
    const chipText = v?.text ?? 'PENDING'
    const chipW = [...chipText].reduce((s, ch) => s + ctx.measureText(ch).width + 2, -2) + fs * 0.7
    const chipH = Math.round(fs * 1.25)
    const chipX = x + colW - chipW
    if (v) {
      ctx.fillStyle = v.bg
      ctx.fillRect(chipX, mid - chipH / 2, chipW, chipH)
      ctx.fillStyle = C.paper
    } else {
      ctx.strokeStyle = C.ink3
      ctx.lineWidth = 2.5
      ctx.strokeRect(chipX + 1.25, mid - chipH / 2 + 1.25, chipW - 2.5, chipH - 2.5)
      ctx.fillStyle = C.ink3
    }
    spaced(ctx, chipText, chipX + fs * 0.35, mid + 1, 2)

    const px = x + mw + fs * (cols === 1 ? 1.4 : 0.8)
    ctx.fillStyle = C.ink2
    ctx.font = `600 ${fs}px ${SANS}`
    const label = cols === 1 ? 'Picked ' : '→ '
    ctx.fillText(label, px, mid)
    ctx.fillStyle = C.ink
    ctx.font = `800 ${fs}px ${SANS}`
    ctx.fillText(p.teamAbbr, px + ctx.measureText(label).width, mid)
    ctx.textBaseline = 'alphabetic'
  })

  // "Your Card" strip with the season-long figures
  const total = stats.wins + stats.losses
  const figures = [
    { label: 'RECORD', value: `${stats.wins}–${stats.losses}` },
    { label: 'HIT RATE', value: total ? `${Math.round((stats.wins / total) * 100)}%` : '—' },
    { label: 'STREAK', value: String(stats.current), hot: stats.current >= 3 },
    { label: 'BEST RUN', value: String(stats.best) },
    { label: 'PERFECT', value: String(stats.perfectDays) },
  ]
  const stripY = 846
  const stripH = 120
  const stripW = S - PAD * 2
  const cellW = stripW / figures.length

  ctx.font = `700 18px ${MONO}`
  ctx.fillStyle = C.paper
  ctx.fillRect(PAD + 18, stripY - 12, 150, 24)
  ctx.fillStyle = C.ink2
  spaced(ctx, 'YOUR CARD', PAD + 28, stripY + 6, 3)

  ctx.fillStyle = C.card
  ctx.fillRect(PAD, stripY + 14, stripW, stripH)
  figures.forEach((f, i) => {
    const x = PAD + i * cellW
    if (f.hot) {
      ctx.fillStyle = C.accent
      ctx.fillRect(x, stripY + 14, cellW, stripH)
    }
    if (i) {
      ctx.fillStyle = C.ink
      ctx.fillRect(x - 1.5, stripY + 14, 3, stripH)
    }
    ctx.fillStyle = f.hot ? C.paper : C.ink
    fit(ctx, f.value, (px) => `900 ${px}px ${DISPLAY}`, 64, cellW - 36)
    ctx.fillText(f.value, x + 20, stripY + 14 + 68)
    ctx.fillStyle = f.hot ? C.paper : C.ink3
    ctx.font = `600 15px ${MONO}`
    spaced(ctx, f.label, x + 20, stripY + 14 + 100, 2)
  })
  ctx.strokeStyle = C.ink
  ctx.lineWidth = 3
  ctx.strokeRect(PAD, stripY + 14, stripW, stripH)

  // Footer
  ctx.font = `500 22px ${MONO}`
  ctx.fillStyle = C.ink3
  spaced(ctx, 'NZNOFFICIAL.GITHUB.IO/NBA-BLACKTOP', PAD, S - 46, 1.5)
  ctx.font = `800 22px ${SANS}`
  ctx.fillStyle = C.accent
  spaced(ctx, 'MAKE YOUR PICKS →', S - PAD, S - 46, 2, 'right')

  return canvas
}

export const canvasBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'))
