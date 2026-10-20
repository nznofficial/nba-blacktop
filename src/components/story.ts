import type { Game } from '../api'
import { tipClock, tzAbbr } from '../lib/date'

const national = (g: Game) => g.broadcasts.filter((b) => b.scope === 'National').map((b) => b.name)

/** One-sentence editorial dek describing the state of a game. */
export function dek(g: Game): string {
  const { home, away, odds } = g
  if (g.state === 'post' && home.score != null && away.score != null) {
    const [w, l] = home.score > away.score ? [home, away] : [away, home]
    const ot = /OT/.test(g.shortDetail) ? ` in ${g.shortDetail.split('/')[1] ?? 'OT'}` : ''
    return `${w.location || w.short} beat ${l.location || l.short}, ${w.score}–${l.score}${ot}.`
  }
  if (g.state === 'in' && home.score != null && away.score != null) {
    if (home.score === away.score) return `All square at ${home.score} — ${g.shortDetail}.`
    const [a, b] = home.score > away.score ? [home, away] : [away, home]
    return `${a.short} lead the ${b.short} ${a.score}–${b.score} — ${g.shortDetail}.`
  }
  const tv = national(g)
  const tip = `Tip-off ${tipClock(g.date)} ${tzAbbr(g.date)}${tv.length ? ` on ${tv.join(' and ')}` : ''}.`
  if (odds?.favoriteId) {
    const fav = odds.favoriteId === home.id ? home : away
    const side = odds.favoriteId === home.id ? odds.home : odds.away
    const pts = side.spread.current?.replace(/^[-+]/, '')
    if (pts && pts !== '0' && !/pk|even/i.test(pts)) {
      return fav === away
        ? `${away.location} opens as a ${pts}-point road favorite in ${home.location}. ${tip}`
        : `${home.location} is a ${pts}-point favorite at home against ${away.location}. ${tip}`
    }
    return `Oddsmakers can’t separate ${away.location} and ${home.location}. ${tip}`
  }
  return `${away.location} visits ${home.location}. ${tip}`
}

const absSpread = (g: Game) => Math.abs(parseFloat(g.odds?.home.spread.current ?? '99') || 99)
const margin = (g: Game) => Math.abs((g.home.score ?? 0) - (g.away.score ?? 0))

/** Pick the day's marquee game: your team > closest live game > tightest national TV game. */
export function featured(games: Game[], favTeams: string[]): { game: Game; kicker: string } | null {
  if (!games.length) return null
  const mine = games.filter((g) => favTeams.includes(g.home.id) || favTeams.includes(g.away.id))
  const liveMine = mine.find((g) => g.state === 'in')
  if (liveMine) return { game: liveMine, kicker: 'Your team · Live' }
  const nextMine = mine.find((g) => g.state === 'pre') ?? mine[0]
  if (nextMine) return { game: nextMine, kicker: nextMine.state === 'post' ? 'Your team · Final' : 'Your team' }
  const live = games.filter((g) => g.state === 'in').sort((a, b) => margin(a) - margin(b))[0]
  if (live) return { game: live, kicker: 'Closest game · Live' }
  const pre = games.filter((g) => g.state === 'pre')
  if (pre.length) {
    const pool = pre.some((g) => national(g).length) ? pre.filter((g) => national(g).length) : pre
    return { game: [...pool].sort((a, b) => absSpread(a) - absSpread(b))[0], kicker: 'Game of the night' }
  }
  const best = [...games].sort((a, b) => margin(a) - margin(b))[0]
  return { game: best, kicker: 'Game of the night · Final' }
}
