import type { Game } from '../api'

export interface Pick {
  gameId: string
  ymd: string
  tip: string // ISO tip-off time, used for ordering
  teamId: string
  teamAbbr: string
  matchup: string // "BOS @ DET"
  result?: 'W' | 'L'
}

export type Picks = Record<string, Pick>

/** Returns a new Picks object if any pick was graded, otherwise the same reference. */
export function gradePicks(picks: Picks, games: Game[]): Picks {
  let next: Picks | null = null
  for (const g of games) {
    const p = picks[g.id]
    if (!p || p.result || !g.completed) continue
    const winner = g.home.winner ? g.home.id : g.away.winner ? g.away.id : null
    if (!winner) continue
    next ??= { ...picks }
    next[g.id] = { ...p, result: p.teamId === winner ? 'W' : 'L' }
  }
  return next ?? picks
}

export interface PickStats {
  wins: number
  losses: number
  pending: number
  current: number
  best: number
  perfectDays: number
}

export function pickStats(picks: Picks): PickStats {
  const all = Object.values(picks).sort((a, b) => +new Date(a.tip) - +new Date(b.tip))
  const graded = all.filter((p) => p.result)
  let run = 0
  let best = 0
  for (const p of graded) {
    run = p.result === 'W' ? run + 1 : 0
    best = Math.max(best, run)
  }
  const byDay = new Map<string, Pick[]>()
  for (const p of all) byDay.set(p.ymd, [...(byDay.get(p.ymd) ?? []), p])
  let perfectDays = 0
  for (const day of byDay.values()) {
    if (day.length >= 2 && day.every((p) => p.result === 'W')) perfectDays++
  }
  return {
    wins: graded.filter((p) => p.result === 'W').length,
    losses: graded.filter((p) => p.result === 'L').length,
    pending: all.length - graded.length,
    current: run,
    best,
    perfectDays,
  }
}

export const APP_URL = 'https://nznofficial.github.io/nba-blacktop/'

/** One day's picks in tip-off order. */
export const dayPicks = (picks: Picks, ymd: string) =>
  Object.values(picks)
    .filter((p) => p.ymd === ymd)
    .sort((a, b) => +new Date(a.tip) - +new Date(b.tip))

export function shareText(picks: Picks, ymd: string, dateLabel: string) {
  const day = dayPicks(picks, ymd)
  const w = day.filter((p) => p.result === 'W').length
  const graded = day.filter((p) => p.result).length
  const grid = day.map((p) => (p.result === 'W' ? '🔥' : p.result === 'L' ? '🧱' : '⏳')).join('')
  const { current } = pickStats(picks)
  return `🏀 BLACKTOP Pick'em — ${dateLabel}\n${w}/${graded || day.length} ${grid}${current >= 2 ? `\n🔥 ${current}-pick streak` : ''}`
}
