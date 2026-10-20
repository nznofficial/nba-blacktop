import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { fetchSummary, impliedProb, type Game, type GameDetail, type Price, type TeamSide } from '../api'
import type { Pick } from '../lib/picks'
import { Arrow, Close } from './Icons'
import { GameStatus } from './GameRow'
import { Score } from './Score'
import { TeamMark } from './TeamMark'
import { dek } from './story'

interface Props {
  gameId: string
  initial: Game | null
  pick?: Pick
  onPick: (game: Game, team: TeamSide) => void
  onClose: () => void
}

function useSummary(id: string, live: boolean) {
  const [detail, setDetail] = useState<GameDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    fetchSummary(id)
      .then((d) => { setDetail(d); setError(null) })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load game'))
  }, [id])
  useEffect(() => {
    setDetail(null)
    load()
  }, [load])
  useEffect(() => {
    if (!live) return
    const t = window.setInterval(() => !document.hidden && load(), 25_000)
    return () => clearInterval(t)
  }, [live, load])
  return { detail, error }
}

function Move({ p }: { p: Price }) {
  if (!p.open || !p.current || p.open === p.current) return <span className="num">{p.current ?? '—'}</span>
  const up = parseFloat(p.current.replace(/^[ou]/, '')) > parseFloat(p.open.replace(/^[ou]/, ''))
  return (
    <span className="move">
      <span className="num was">{p.open}</span>
      <span className={`arrow ${up ? 'up' : 'down'}`}><Arrow dir={up ? 'up' : 'down'} /></span>
      <span className="num">{p.current}</span>
    </span>
  )
}

function WinProb({ data: raw, home, away }: { data: number[]; home: TeamSide; away: TeamSide }) {
  let data = raw
  if (data.length < 2) return null
  // Smooth play-by-play noise into ~120 buckets, keeping the final value exact.
  const step = Math.max(1, Math.ceil(data.length / 120))
  const pts0: number[] = []
  for (let i = 0; i < data.length; i += step) {
    const chunk = data.slice(i, i + step)
    pts0.push(chunk.reduce((a, b) => a + b, 0) / chunk.length)
  }
  pts0.push(data[data.length - 1])
  data = pts0
  const W = 600
  const H = 140
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * W).toFixed(1)},${((1 - v) * H).toFixed(1)}`)
  const area = `M0,${H / 2} L${pts.join(' L')} L${W},${H / 2} Z`
  const last = data[data.length - 1]
  return (
    <figure className="winprob">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Win probability, ${home.abbr} ${Math.round(last * 100)}% at the end`}>
        <defs>
          <clipPath id="wp-top"><rect x="0" y="0" width={W} height={H / 2} /></clipPath>
          <clipPath id="wp-bot"><rect x="0" y={H / 2} width={W} height={H / 2} /></clipPath>
        </defs>
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="wp-mid" />
        <path d={area} clipPath="url(#wp-top)" style={{ fill: home.color }} className="wp-area" />
        <path d={area} clipPath="url(#wp-bot)" style={{ fill: away.color }} className="wp-area" />
        <polyline points={pts.join(' ')} className="wp-line" pathLength={1} />
      </svg>
      <figcaption>
        <span><b>{home.abbr}</b> above the line</span>
        <span><b>{away.abbr}</b> below</span>
      </figcaption>
    </figure>
  )
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="d-sec">
      <h4 className="d-kicker"><span>{title}</span>{aside}</h4>
      {children}
    </section>
  )
}

export function GameDrawer({ gameId, initial, pick, onPick, onClose }: Props) {
  const [closing, setClosing] = useState(false)
  const { detail, error } = useSummary(gameId, initial?.state === 'in')
  const [boxTeam, setBoxTeam] = useState<'away' | 'home'>('away')

  // Prefer live scoreboard data (richer broadcasts); fall back to the summary header for deep links.
  const game = initial ?? detail?.game ?? null
  const odds = detail?.odds ?? game?.odds ?? null

  const close = useCallback(() => {
    setClosing(true)
    window.setTimeout(onClose, 240)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [close])

  const style = game ? ({ '--away': game.away.color, '--home': game.home.color } as CSSProperties) : undefined
  const sides = game ? ([['away', game.away], ['home', game.home]] as const) : []
  const periods = game ? Math.max(game.away.linescores.length, game.home.linescores.length) : 0
  const box = detail?.box.find((b) => b.teamId === (boxTeam === 'away' ? game?.away.id : game?.home.id))

  return (
    <div className={`drawer-root${closing ? ' closing' : ''}`}>
      <div className="drawer-backdrop" onClick={close} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Game details" style={style}>
        <button className="drawer-close" onClick={close} aria-label="Close"><Close /></button>

        {!game && !error && <div className="drawer-loading"><div className="skeleton block" /><div className="skeleton block short" /></div>}
        {!game && error && <div className="notice"><p>Couldn’t load this game ({error}).</p></div>}

        {game && (
          <>
            <header className="d-hero">
              <div className="d-hero-wash" />
              <div className="d-when">
                <GameStatus game={game} />
                <span>{new Date(game.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="d-teams">
                {sides.map(([side, t]) => (
                  <div key={side} className={`d-team ${side}${game.state === 'post' && !t.winner ? ' lost' : ''}`}>
                    <TeamMark logo={t.logo} color={t.color} size={72} glow />
                    <div className="d-team-name">
                      <span className="d-loc">{t.location}</span>
                      <span className="d-nick">{t.short}</span>
                      <span className="d-rec">{t.record} · {side === 'home' ? 'Home' : 'Away'}</span>
                    </div>
                    {game.state !== 'pre' && <Score value={t.score} className="d-score" />}
                  </div>
                ))}
              </div>
              <p className="d-dek">{dek(game)}</p>
              <div className="d-facts">
                {game.broadcasts.length > 0 && <span><b>TV</b> {game.broadcasts.map((b) => b.name).join(', ')}</span>}
                {game.venue && <span><b>Venue</b> {game.venue}{game.city ? `, ${game.city}` : ''}</span>}
                {detail?.attendance ? <span><b>Att.</b> {detail.attendance.toLocaleString()}</span> : null}
              </div>
              {game.state === 'pre' && (
                <div className="d-pick">
                  <span>Your pick</span>
                  {sides.map(([side, t]) => (
                    <button key={side} className={`chip-btn${pick?.teamId === t.id ? ' on' : ''}`} onClick={() => onPick(game, t)} aria-pressed={pick?.teamId === t.id}>
                      {t.short}
                    </button>
                  ))}
                </div>
              )}
            </header>

            <div className="d-body">
              {detail?.story && (
                <Section title={detail.story.kind}>
                  <h3 className="d-story-head">{detail.story.headline}</h3>
                  {detail.story.description && <p className="d-story">{detail.story.description}</p>}
                </Section>
              )}

              {periods > 0 && (
                <Section title="Line score">
                  <table className="d-table linescore">
                    <thead>
                      <tr>
                        <th />
                        {Array.from({ length: periods }, (_, i) => <th key={i}>{i < 4 ? i + 1 : `OT${i > 4 ? i - 3 : ''}`}</th>)}
                        <th>T</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sides.map(([side, t]) => (
                        <tr key={side} className={t.winner ? 'won' : ''}>
                          <th><TeamMark logo={t.logo} color={t.color} size={20} /> {t.abbr}</th>
                          {Array.from({ length: periods }, (_, i) => <td key={i} className="num">{t.linescores[i] ?? '–'}</td>)}
                          <td className="num total">{t.score ?? '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              )}

              {game.state === 'pre' && detail?.predictor && (
                <Section title="Matchup predictor" aside={<span className="d-aside">ESPN BPI</span>}>
                  <div className="predictor">
                    <div className="pred-labels">
                      <span><b className="num">{detail.predictor.away.toFixed(1)}%</b> {game.away.abbr}</span>
                      <span>{game.home.abbr} <b className="num">{detail.predictor.home.toFixed(1)}%</b></span>
                    </div>
                    <div className="pred-bar">
                      <span style={{ width: `${detail.predictor.away}%`, background: game.away.color }} />
                      <span style={{ width: `${detail.predictor.home}%`, background: game.home.color }} />
                    </div>
                  </div>
                </Section>
              )}

              {game.state !== 'pre' && detail && detail.winProb.length > 1 && (
                <Section title="Win probability">
                  <WinProb data={detail.winProb} home={game.home} away={game.away} />
                </Section>
              )}

              {odds && (
                <Section title="The line" aside={<span className="d-aside">{odds.provider} · open → now</span>}>
                  <table className="d-table line-table">
                    <thead>
                      <tr><th /><th>Spread</th><th>Moneyline</th><th>Implied</th></tr>
                    </thead>
                    <tbody>
                      {sides.map(([side, t]) => {
                        const o = odds[side]
                        const p = impliedProb(o.moneyline.current)
                        return (
                          <tr key={side}>
                            <th>
                              <TeamMark logo={t.logo} color={t.color} size={20} /> {t.abbr}
                              {odds.favoriteId === t.id && <span className="fav-tag">Fav</span>}
                            </th>
                            <td><Move p={o.spread} /></td>
                            <td><Move p={o.moneyline} /></td>
                            <td className="num">{p ? `${Math.round(p * 100)}%` : '—'}</td>
                          </tr>
                        )
                      })}
                      <tr>
                        <th>Total</th>
                        <td colSpan={2}><Move p={odds.total} /></td>
                        <td className="num muted">{odds.overOdds ? `O ${odds.overOdds} / U ${odds.underOdds}` : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </Section>
              )}

              {detail && detail.leaders.some((l) => l.leaders.length) && (
                <Section title={game.state === 'pre' ? 'Season leaders' : 'Game leaders'}>
                  <div className="leaders">
                    {sides.map(([side, t]) => {
                      const tl = detail.leaders.find((l) => l.teamId === t.id)
                      return (
                        <div key={side} className="leader-col">
                          <div className="leader-team">{t.short}</div>
                          {tl?.leaders.map((l) => (
                            <div key={l.category} className="leader">
                              {l.headshot ? <img src={l.headshot} alt="" loading="lazy" /> : <span className="hs-blank" />}
                              <div className="leader-who">
                                <span className="leader-cat">{l.category}</span>
                                <span className="leader-name">{l.name} <i>{l.position}</i></span>
                                {l.summary && <span className="leader-sum">{l.summary}</span>}
                              </div>
                              <span className="leader-val num">{l.value}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </Section>
              )}

              {detail && detail.teamStats.length > 0 && (
                <Section title="Team stats" aside={<span className="d-aside">{game.away.abbr} · {game.home.abbr}</span>}>
                  <div className="compare">
                    {detail.teamStats.map((s) => {
                      const total = s.awayN + s.homeN || 1
                      const awayBetter = s.lowerIsBetter ? s.awayN < s.homeN : s.awayN > s.homeN
                      const homeBetter = s.lowerIsBetter ? s.homeN < s.awayN : s.homeN > s.awayN
                      return (
                        <div key={s.label} className="cmp">
                          <span className={`num cmp-v${awayBetter ? ' best' : ''}`}>{s.away}</span>
                          <div className="cmp-mid">
                            <span className="cmp-label">{s.label}</span>
                            <div className="cmp-bar">
                              <span style={{ width: `${(s.awayN / total) * 100}%`, background: game.away.color }} />
                              <span style={{ width: `${(s.homeN / total) * 100}%`, background: game.home.color }} />
                            </div>
                          </div>
                          <span className={`num cmp-v${homeBetter ? ' best' : ''}`}>{s.home}</span>
                        </div>
                      )
                    })}
                  </div>
                </Section>
              )}

              {box && box.players.length > 0 && (
                <Section
                  title="Box score"
                  aside={
                    <span className="mini-seg">
                      {sides.map(([side, t]) => (
                        <button key={side} className={boxTeam === side ? 'on' : ''} onClick={() => setBoxTeam(side)}>{t.abbr}</button>
                      ))}
                    </span>
                  }
                >
                  <div className="box-scroll">
                    <table className="d-table boxscore">
                      <thead>
                        <tr><th>Player</th>{box.labels.map((l) => <th key={l}>{l}</th>)}</tr>
                      </thead>
                      <tbody>
                        {box.players.map((p, i) => (
                          <tr key={p.name} className={i > 0 && !p.starter && box.players[i - 1].starter ? 'bench-start' : ''}>
                            <th><span className="pl-name">{p.short}</span> <i>{p.position}</i></th>
                            {p.dnp ? (
                              <td colSpan={box.labels.length} className="dnp">{p.dnp}</td>
                            ) : (
                              p.stats.map((v, j) => <td key={j} className="num">{v}</td>)
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {detail && Object.keys(detail.form).length > 0 && (
                <Section title="Recent form">
                  <div className="form">
                    {sides.map(([side, t]) => (
                      <div key={side} className="form-row">
                        <span className="form-team">{t.abbr}</span>
                        <div className="form-games">
                          {(detail.form[t.id] ?? []).map((f, i) => (
                            <span key={i} className={`form-g ${f.result === 'W' ? 'w' : f.result === 'L' ? 'l' : ''}`} title={`${f.atVs} ${f.opponent} ${f.score}`}>
                              <b>{f.result}</b>
                              <i>{f.atVs === '@' ? '@' : 'v'} {f.opponent}</i>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {detail && Object.values(detail.injuries).some((l) => l.length) && (
                <Section title="Injury report">
                  <div className="injuries">
                    {sides.map(([side, t]) => (
                      <div key={side}>
                        <div className="leader-team">{t.short}</div>
                        {(detail.injuries[t.id] ?? []).length === 0 && <p className="muted small">No reported injuries.</p>}
                        {(detail.injuries[t.id] ?? []).map((inj) => (
                          <div key={inj.name} className="inj">
                            <span className="inj-name">{inj.name} <i>{inj.position}</i></span>
                            <span className={`inj-status ${/out/i.test(inj.status) ? 'out' : ''}`}>{inj.status}</span>
                            {inj.detail && <span className="inj-detail">{inj.detail}</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {detail?.series && <p className="d-series">{detail.series}</p>}
              {!detail && !error && <div className="skeleton block" />}
              {error && <p className="muted small">Some details are unavailable right now ({error}).</p>}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
