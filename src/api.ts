// Thin client over ESPN's public (unofficial, keyless, CORS-enabled) NBA endpoints.
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings'

export type GameState = 'pre' | 'in' | 'post'

export interface TeamSide {
  id: string
  abbr: string
  name: string
  short: string
  logo: string
  color: string
  record: string
  score: number | null
  winner: boolean
}

export interface Broadcast {
  name: string
  scope: 'National' | 'Home' | 'Away'
  kind: string // TV, Streaming
}

export interface SideOdds {
  moneyline: string | null
  spread: string | null
  spreadOdds: string | null
}

export interface Odds {
  provider: string
  details: string | null
  overUnder: number | null
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
  const overall = (c.records ?? []).find((r: any) => r.type === 'total' || r.name === 'overall')
  return {
    id: String(t.id),
    abbr: t.abbreviation ?? '',
    name: t.displayName ?? '',
    short: t.shortDisplayName ?? t.name ?? '',
    logo: t.logo ?? '',
    color: t.color ? `#${t.color}` : '#1b8fb0',
    record: overall?.summary ?? '',
    score: c.score != null && c.score !== '' ? Number(c.score) : null,
    winner: Boolean(c.winner),
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

const line = (side: any) => side?.close ?? side?.open ?? null

function parseOdds(comp: any, homeId: string, awayId: string): Odds | null {
  const o = comp.odds?.[0]
  if (!o) return null
  const side = (s: 'home' | 'away'): SideOdds => ({
    moneyline: line(o.moneyline?.[s])?.odds ?? null,
    spread: line(o.pointSpread?.[s])?.line ?? null,
    spreadOdds: line(o.pointSpread?.[s])?.odds ?? null,
  })
  const home = side('home')
  const away = side('away')

  let favoriteId: string | null = null
  if (o.homeTeamOdds?.favorite) favoriteId = homeId
  else if (o.awayTeamOdds?.favorite) favoriteId = awayId
  else if (home.moneyline && away.moneyline) {
    const h = Number(home.moneyline.replace('EVEN', '100'))
    const a = Number(away.moneyline.replace('EVEN', '100'))
    if (h !== a) favoriteId = h < a ? homeId : awayId
  }

  return {
    provider: o.provider?.displayName ?? o.provider?.name ?? 'Sportsbook',
    details: o.details ?? null,
    overUnder: typeof o.overUnder === 'number' ? o.overUnder : null,
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
  return {
    id: String(e.id),
    date: e.date,
    state: (st.state ?? 'pre') as GameState,
    completed: Boolean(st.completed),
    detail: st.detail ?? '',
    shortDetail: st.shortDetail ?? '',
    venue: comp.venue?.fullName ?? null,
    broadcasts: parseBroadcasts(comp),
    home,
    away,
    odds: parseOdds(comp, home.id, away.id),
  }
}

/** ymd: YYYYMMDD */
export async function fetchScoreboard(ymd: string): Promise<Game[]> {
  const data = await getJSON(`${SITE}/scoreboard?dates=${ymd}`)
  return (data.events ?? []).map(parseGame).sort(
    (a: Game, b: Game) => +new Date(a.date) - +new Date(b.date),
  )
}

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
