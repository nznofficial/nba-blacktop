import { useState } from 'react'
import type { Conference } from '../api'

interface Props {
  conferences: Conference[] | null
  error: string | null
  favTeams: string[]
  onRetry: () => void
}

function Table({ conf, favTeams }: { conf: Conference; favTeams: string[] }) {
  return (
    <div className="glass standings">
      <h3 className="conf-title">{conf.name}</h3>
      <table>
        <thead>
          <tr>
            <th className="num">#</th>
            <th className="team-col">Team</th>
            <th>W</th>
            <th>L</th>
            <th>PCT</th>
            <th>GB</th>
            <th className="wide">Home</th>
            <th className="wide">Away</th>
            <th className="wide">Diff</th>
            <th>L10</th>
            <th>Strk</th>
          </tr>
        </thead>
        <tbody>
          {conf.rows.map((r, i) => {
            const seed = i + 1
            const zone = seed <= 6 ? 'playoff' : seed <= 10 ? 'playin' : 'out'
            return (
              <tr
                key={r.id}
                className={`${zone}${favTeams.includes(r.id) ? ' fav-row' : ''}${seed === 6 || seed === 10 ? ' cutline' : ''}`}
              >
                <td className="num"><span className={`seed ${zone}`}>{seed}</span></td>
                <td className="team-col">
                  <img src={r.logo} alt="" width={24} height={24} loading="lazy" />
                  <span className="full">{r.name}</span>
                  <span className="abbr">{r.abbr}</span>
                </td>
                <td>{r.wins}</td>
                <td>{r.losses}</td>
                <td>{r.pct}</td>
                <td>{r.gb}</td>
                <td className="wide">{r.home}</td>
                <td className="wide">{r.road}</td>
                <td className="wide">{r.diff}</td>
                <td>{r.l10}</td>
                <td className={r.streak.startsWith('W') ? 'hot' : r.streak.startsWith('L') ? 'cold' : ''}>{r.streak}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function StandingsView({ conferences, error, favTeams, onRetry }: Props) {
  const [conf, setConf] = useState<'East' | 'West'>('East')
  if (error) {
    return (
      <div className="glass notice">
        <p>🌧️ Couldn't load standings: {error}</p>
        <button className="pill" onClick={onRetry}>Try again</button>
      </div>
    )
  }
  if (!conferences) return <div className="glass standings skeleton tall" />
  return (
    <section>
      <div className="seg conf-switch" role="tablist">
        {(['East', 'West'] as const).map((c) => (
          <button key={c} role="tab" aria-selected={conf === c} className={conf === c ? 'active' : ''} onClick={() => setConf(c)}>
            {c === 'East' ? '🌅 East' : '🌇 West'}
          </button>
        ))}
      </div>
      <div className="standings-grid" data-show={conf}>
        {conferences.map((c) => (
          <div key={c.short} className={`conf conf-${c.short}`}>
            <Table conf={c} favTeams={favTeams} />
          </div>
        ))}
      </div>
      <div className="legend">
        <span><i className="seed playoff" /> Playoffs (1–6)</span>
        <span><i className="seed playin" /> Play-in (7–10)</span>
        <span><i className="seed fav" /> Your teams</span>
      </div>
    </section>
  )
}
