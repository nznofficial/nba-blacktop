// Thin client over ESPN's public (unofficial, keyless, CORS-enabled) NBA endpoints.
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings'

export type GameState = 'pre' | 'in' | 'post'

export interface TeamSide {
  id: string
  abbr: string
  name: string
  short: string
  location: string
  logo: string
  color: string
  record: string
  score: number | null
  winner: boolean
  linescores: number[]
}

export interface Broadcast {
  name: string
  scope: 'National' | 'Home' | 'Away'
  kind: string // TV, Streaming
}

export interface Price {
  open: string | null
  current: string | null
}

export interface SideOdds {
  moneyline: Price
  spread: Price
  spreadOdds: string | null
}

export interface Odds {
  provider: string
  details: string | null
  total: Price
  overOdds: string | null
  underOdds: string | null
  favoriteId: string | null
  home: SideOdds
  away: SideOdds
}

export interface Game {
  id: string
  date: string
  state: GameState
  completed: boolean
  detail: string
  shortDetail: string
  venue: string | null
  city: string | null
  broadcasts: Broadcast[]
  home: TeamSide
  away: TeamSide
  odds: Odds | null
}

export interface StandingRow {
  id: string
  abbr: string
  name: string
  logo: string
  wins: number
  losses: number
  pct: string
  gb: string
  seed: number
  l10: string
  streak: string
  home: string
  road: string
  diff: string
}

export interface Conference {
  name: string
  short: 'East' | 'West'
  rows: StandingRow[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function getJSON(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ESPN responded ${res.status}`)
  return res.json()
}

function parseTeam(c: any): TeamSide {
  const t = c.team ?? {}
  const overall = (c.records ?? c.record ?? []).find((r: any) => r.type === 'total' || r.name === 'overall')
  return {
    id: String(t.id),
    abbr: t.abbreviation ?? '',
    name: t.displayName ?? '',
    short: t.shortDisplayName ?? t.name ?? '',
    location: t.location ?? '',
    logo: t.logo ?? t.logos?.[0]?.href ?? '',
    color: t.color ? `#${t.color}` : '#1e6f78',
    record: overall?.summary ?? '',
    score: c.score != null && c.score !== '' ? Number(c.score) : null,
    winner: Boolean(c.winner),
    linescores: (c.linescores ?? []).map((l: any) => Number(l.value ?? l.displayValue ?? 0)),
  }
}

function parseBroadcasts(comp: any): Broadcast[] {
  const seen = new Set<string>()
  const out: Broadcast[] = []
  for (const g of comp.geoBroadcasts ?? []) {
    const kind = g.type?.shortName ?? 'TV'
    const name = g.media?.shortName
    if (!name || kind === 'Radio' || seen.has(name)) continue
    seen.add(name)
    out.push({ name, scope: g.market?.type ?? 'National', kind })
  }
  if (out.length === 0) {
    for (const b of comp.broadcasts ?? []) {
      for (const name of b.names ?? []) {
        if (seen.has(name)) continue
        seen.add(name)
        const m = String(b.market ?? 'national').toLowerCase()
        out.push({ name, scope: m === 'home' ? 'Home' : m === 'away' ? 'Away' : 'National', kind: 'TV' })
      }
    }
  }
  const rank = { National: 0, Home: 1, Away: 2 }
  return out.sort((a, b) => rank[a.scope] - rank[b.scope])
}

const price = (side: any, key: 'odds' | 'line'): Price => ({
  open: side?.open?.[key] ?? null,
  current: side?.close?.[key] ?? side?.open?.[key] ?? null,
})

const americanToNumber = (s: string) => Number(s.replace('EVEN', '+100'))

/** Implied win probability from an American price, e.g. "-120" → 0.545. */
export function impliedProb(s: string | null): number | null {
  if (!s) return null
  const n = americanToNumber(s)
  if (!Number.isFinite(n) || n === 0) return null
  return n < 0 ? -n / (-n + 100) : 100 / (n + 100)
}

function parseOdds(o: any, homeId: string, awayId: string): Odds | null {
  if (!o) return null
  const side = (s: 'home' | 'away'): SideOdds => ({
    moneyline: price(o.moneyline?.[s], 'odds'),
    spread: price(o.pointSpread?.[s], 'line'),
    spreadOdds: o.pointSpread?.[s]?.close?.odds ?? o.pointSpread?.[s]?.open?.odds ?? null,
  })
  const home = side('home')
  const away = side('away')

  // Summary "pickcenter" entries carry plain numbers instead of the open/close blocks.
  const fmt = (n: any) => (typeof n === 'number' ? (n > 0 ? `+${n}` : String(n)) : null)
  if (!home.moneyline.current && o.homeTeamOdds?.moneyLine != null) home.moneyline.current = fmt(o.homeTeamOdds.moneyLine)
  if (!away.moneyline.current && o.awayTeamOdds?.moneyLine != null) away.moneyline.current = fmt(o.awayTeamOdds.moneyLine)

  let favoriteId: string | null = null
  if (o.homeTeamOdds?.favorite) favoriteId = homeId
  else if (o.awayTeamOdds?.favorite) favoriteId = awayId
  else if (home.moneyline.current && away.moneyline.current) {
    const h = americanToNumber(home.moneyline.current)
    const a = americanToNumber(away.moneyline.current)
    if (h !== a) favoriteId = h < a ? homeId : awayId
  }

  const totalLine = (l: string | null) => (l ? l.replace(/^[ou]/, '') : null)
  const total = {
    open: totalLine(o.total?.over?.open?.line ?? null),
    current: totalLine(o.total?.over?.close?.line ?? null) ?? (typeof o.overUnder === 'number' ? String(o.overUnder) : null),
  }

  return {
    provider: o.provider?.displayName ?? o.provider?.name ?? 'Sportsbook',
    details: o.details ?? null,
    total,
    overOdds: o.total?.over?.close?.odds ?? fmt(o.overOdds),
    underOdds: o.total?.under?.close?.odds ?? fmt(o.underOdds),
    favoriteId,
    home,
    away,
  }
}

function parseGame(e: any): Game {
  const comp = e.competitions?.[0] ?? {}
  const cs = comp.competitors ?? []
  const home = parseTeam(cs.find((c: any) => c.homeAway === 'home') ?? cs[0])
  const away = parseTeam(cs.find((c: any) => c.homeAway === 'away') ?? cs[1])
  const st = e.status?.type ?? comp.status?.type ?? {}
  const addr = comp.venue?.address
  return {
    id: String(e.id),
    date: e.date,
    state: (st.state ?? 'pre') as GameState,
    completed: Boolean(st.completed),
    detail: st.detail ?? '',
    shortDetail: st.shortDetail ?? '',
    venue: comp.venue?.fullName ?? null,
    city: addr?.city ? [addr.city, addr.state].filter(Boolean).join(', ') : null,
    broadcasts: parseBroadcasts(comp),
    home,
    away,
    odds: parseOdds(comp.odds?.[0], home.id, away.id),
  }
}

/** ymd: YYYYMMDD */
export async function fetchScoreboard(ymd: string): Promise<Game[]> {
  const data = await getJSON(`${SITE}/scoreboard?dates=${ymd}`)
  return (data.events ?? []).map(parseGame).sort(
    (a: Game, b: Game) => +new Date(a.date) - +new Date(b.date),
  )
}

/* ---------- Game summary (detail view) ---------- */

export interface Leader {
  category: string
  value: string
  name: string
  headshot: string | null
  position: string
  summary: string
}

export interface TeamLeaders {
  teamId: string
  leaders: Leader[]
}

export interface StatCompare {
  label: string
  away: string
  home: string
  awayN: number
  homeN: number
  lowerIsBetter?: boolean
}

export interface PlayerLine {
  name: string
  short: string
  position: string
  starter: boolean
  dnp: string | null
  stats: string[]
}

export interface TeamBox {
  teamId: string
  labels: string[]
  players: PlayerLine[]
}

export interface Injury {
  name: string
  position: string
  status: string
  detail: string
}

export interface FormGame {
  result: string
  opponent: string
  atVs: string
  score: string
}

export interface GameDetail {
  game: Game | null
  predictor: { home: number; away: number } | null
  winProb: number[] // home win % over the course of the game
  leaders: TeamLeaders[]
  teamStats: StatCompare[]
  box: TeamBox[]
  injuries: Record<string, Injury[]>
  form: Record<string, FormGame[]>
  series: string | null
  story: { kind: string; headline: string; description: string } | null
  attendance: number | null
  odds: Odds | null
}

const TEAM_STATS: { key: string; label: string; lowerIsBetter?: boolean }[] = [
  { key: 'fieldGoalPct', label: 'Field goal %' },
  { key: 'threePointFieldGoalPct', label: '3-point %' },
  { key: 'freeThrowPct', label: 'Free throw %' },
  { key: 'totalRebounds', label: 'Rebounds' },
  { key: 'assists', label: 'Assists' },
  { key: 'steals', label: 'Steals' },
  { key: 'blocks', label: 'Blocks' },
  { key: 'totalTurnovers', label: 'Turnovers', lowerIsBetter: true },
  { key: 'pointsInPaint', label: 'Points in paint' },
  { key: 'fastBreakPoints', label: 'Fast break pts' },
  { key: 'largestLead', label: 'Largest lead' },
]

export async function fetchSummary(id: string): Promise<GameDetail> {
  const d = await getJSON(`${SITE}/summary?event=${id}`)
  const hc = d.header?.competitions?.[0]
  let game: Game | null = null
  if (hc) {
    game = parseGame({ id, date: hc.date, status: hc.status, competitions: [{ ...hc, venue: d.gameInfo?.venue }] })
  }
  const homeId = game?.home.id ?? ''
  const awayId = game?.away.id ?? ''

  const predictor = d.predictor?.homeTeam?.gameProjection
    ? { home: Number(d.predictor.homeTeam.gameProjection), away: Number(d.predictor.awayTeam?.gameProjection ?? 0) }
    : null

  const leaders: TeamLeaders[] = (d.leaders ?? []).map((t: any) => ({
    teamId: String(t.team?.id),
    leaders: (t.leaders ?? [])
      .filter((c: any) => ['points', 'rebounds', 'assists'].includes(c.name) && c.leaders?.[0])
      .map((c: any) => {
        const l = c.leaders[0]
        return {
          category: c.displayName,
          value: l.displayValue,
          name: l.athlete?.displayName ?? '',
          headshot: l.athlete?.headshot?.href ?? null,
          position: l.athlete?.position?.abbreviation ?? '',
          summary: l.summary ?? '',
        }
      }),
  }))

  const teams = d.boxscore?.teams ?? []
  const statMap = (t: any) => Object.fromEntries((t?.statistics ?? []).map((s: any) => [s.name, s.displayValue]))
  const awayStats = statMap(teams.find((t: any) => String(t.team?.id) === awayId))
  const homeStats = statMap(teams.find((t: any) => String(t.team?.id) === homeId))
  const teamStats: StatCompare[] =
    game && game.state !== 'pre'
      ? TEAM_STATS.filter((s) => awayStats[s.key] != null && homeStats[s.key] != null).map((s) => ({
          label: s.label,
          away: awayStats[s.key],
          home: homeStats[s.key],
          awayN: parseFloat(awayStats[s.key]) || 0,
          homeN: parseFloat(homeStats[s.key]) || 0,
          lowerIsBetter: s.lowerIsBetter,
        }))
      : []

  const box: TeamBox[] = (d.boxscore?.players ?? []).map((p: any) => {
    const st = p.statistics?.[0] ?? {}
    return {
      teamId: String(p.team?.id),
      labels: st.labels ?? [],
      players: (st.athletes ?? []).map((a: any) => ({
        name: a.athlete?.displayName ?? '',
        short: a.athlete?.shortName ?? a.athlete?.displayName ?? '',
        position: a.athlete?.position?.abbreviation ?? '',
        starter: Boolean(a.starter),
        dnp: a.didNotPlay ? a.reason || 'DNP' : null,
        stats: a.stats ?? [],
      })),
    }
  })

  const injuries: Record<string, Injury[]> = {}
  for (const t of d.injuries ?? []) {
    injuries[String(t.team?.id)] = (t.injuries ?? []).map((i: any) => ({
      name: i.athlete?.displayName ?? '',
      position: i.athlete?.position?.abbreviation ?? '',
      status: i.status ?? '',
      detail: [i.details?.type, i.details?.detail].filter(Boolean).join(' · ') || i.type?.description || '',
    }))
  }

  const form: Record<string, FormGame[]> = {}
  for (const t of d.lastFiveGames ?? []) {
    form[String(t.team?.id)] = (t.events ?? []).map((e: any) => ({
      result: e.gameResult ?? '',
      opponent: e.opponent?.abbreviation ?? '',
      atVs: e.atVs ?? '',
      score: e.score ?? '',
    }))
  }

  const ss = d.seasonseries?.[0]
  const art = d.article
  const recap = d.news?.articles?.find((a: any) => a.type === 'Recap')
  const storySrc = art?.headline ? art : recap
  const pc = d.pickcenter?.[0]

  return {
    game,
    predictor,
    winProb: (d.winprobability ?? []).map((w: any) => Number(w.homeWinPercentage)),
    leaders,
    teamStats,
    box,
    injuries,
    form,
    series: ss ? `${ss.title ?? 'Season series'}: ${ss.summary ?? ss.seriesScore ?? ''}` : null,
    story: storySrc?.headline
      ? { kind: storySrc.type ?? 'Story', headline: storySrc.headline, description: storySrc.description ?? '' }
      : null,
    attendance: d.gameInfo?.attendance ?? null,
    odds: pc ? parseOdds(pc, homeId, awayId) : null,
  }
}

/* ---------- Standings ---------- */

export async function fetchStandings(): Promise<Conference[]> {
  const data = await getJSON(`${STANDINGS}?seasontype=2`)
  return (data.children ?? []).map((conf: any) => {
    const rows: StandingRow[] = (conf.standings?.entries ?? []).map((e: any) => {
      const s: Record<string, any> = {}
      for (const x of e.stats ?? []) s[x.name] = x
      const v = (k: string) => s[k]?.displayValue ?? '-'
      return {
        id: String(e.team.id),
        abbr: e.team.abbreviation,
        name: e.team.displayName,
        logo: e.team.logos?.[0]?.href ?? '',
        wins: Number(s.wins?.value ?? 0),
        losses: Number(s.losses?.value ?? 0),
        pct: v('winPercent'),
        gb: v('gamesBehind'),
        seed: Number(s.playoffSeed?.value ?? 0),
        l10: v('Last Ten Games'),
        streak: v('streak'),
        home: v('Home'),
        road: v('Road'),
        diff: v('differential'),
      }
    })
    rows.sort((a, b) => {
      if (a.seed && b.seed) return a.seed - b.seed
      const pa = a.wins / Math.max(1, a.wins + a.losses)
      const pb = b.wins / Math.max(1, b.wins + b.losses)
      return pb - pa || b.wins - a.wins || a.name.localeCompare(b.name)
    })
    const name: string = conf.name ?? ''
    return { name, short: name.startsWith('West') ? 'West' : 'East', rows }
  })
}
