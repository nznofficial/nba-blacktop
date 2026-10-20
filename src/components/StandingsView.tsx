import { useState, type CSSProperties } from 'react'
import type { Conference } from '../api'
import { Star } from './Icons'

interface Props {
  conferences: Conference[] | null
  error: string | null
  favTeams: string[]
  onToggleFav: (id: string) => void
  onRetry: () => void
}

function Table({ conf, favTeams, onToggleFav }: { conf: Conference; favTeams: string[]; onToggleFav: (id: string) => void }) {
  return (
    <div className="conf-block">
      <h2 className="conf-name">
        <em>{conf.short === 'East' ? 'Eastern' : 'Western'}</em> Conference
      </h2>
      <table className="standings">
        <thead>
          <tr>
            <th className="s-seed">#</th>
            <th className="s-team">Team</th>
            <th>W</th>
            <th>L</th>
            <th>Pct</th>
            <th>GB</th>
            <th className="opt">Home</th>
            <th className="opt">Away</th>
            <th className="opt">Diff</th>
            <th className="opt-sm">L10</th>
            <th>Strk</th>
          </tr>
        </thead>
        <tbody>
          {conf.rows.map((r, i) => {
            const seed = i + 1
            const mine = favTeams.includes(r.id)
            return (
              <tr key={r.id} className={`${seed > 10 ? 'out' : ''}${mine ? ' mine' : ''}${seed === 6 || seed === 10 ? ' cut' : ''}`} style={{ '--i': i } as CSSProperties}>
                <td className="s-seed"><span className={`seed ${seed <= 6 ? 'po' : seed <= 10 ? 'pi' : ''}`}>{seed}</span></td>
                <td className="s-team">
                  <img src={r.logo} alt="" width={22} height={22} loading="lazy" />
                  <span className="s-full">{r.name}</span>
                  <span className="s-abbr">{r.abbr}</span>
                  <button className={`fav-star${mine ? ' on' : ''}`} onClick={() => onToggleFav(r.id)} aria-label={mine ? `Unfollow ${r.name}` : `Follow ${r.name}`} aria-pressed={mine}>
                    <Star filled={mine} size={13} />
                  </button>
                </td>
                <td className="num">{r.wins}</td>
                <td className="num">{r.losses}</td>
                <td className="num">{r.pct}</td>
                <td className="num">{r.gb}</td>
                <td className="num opt">{r.home}</td>
                <td className="num opt">{r.road}</td>
                <td className={`num opt ${parseFloat(r.diff) < 0 ? 'neg' : parseFloat(r.diff) > 0 ? 'pos' : ''}`}>{r.diff}</td>
                <td className="num opt-sm">{r.l10}</td>
                <td className={`num ${r.streak.startsWith('W') ? 'pos' : r.streak.startsWith('L') ? 'neg' : ''}`}>{r.streak}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function StandingsView({ conferences, error, favTeams, onToggleFav, onRetry }: Props) {
  const [conf, setConf] = useState<'East' | 'West'>('East')
  return (
    <div className="page">
      <header className="masthead">
        <div className="dateline"><span>2026–27 Regular season</span></div>
        <h1 className="page-title"><em>The</em> Standings</h1>
        <p className="standfirst">Seeds 1–6 go straight to the playoffs. Seeds 7–10 go to the play-in tournament. Starred teams are highlighted.</p>
      </header>

      {error && (
        <div className="notice">
          <p>We couldn’t load the standings ({error}).</p>
          <button className="btn" onClick={onRetry}>Try again</button>
        </div>
      )}
      {!conferences && !error && <div className="skeleton block tall" />}
      {conferences && (
        <>
          <div className="seg conf-seg" role="tablist">
            {(['East', 'West'] as const).map((c) => (
              <button key={c} role="tab" aria-selected={conf === c} className={conf === c ? 'on' : ''} onClick={() => setConf(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="conf-grid" data-show={conf}>
            {conferences.map((c) => (
              <div key={c.short} className={`conf conf-${c.short}`}>
                <Table conf={c} favTeams={favTeams} onToggleFav={onToggleFav} />
              </div>
            ))}
          </div>
          <div className="key">
            <span><i className="seed po" /> Playoff</span>
            <span><i className="seed pi" /> Play-in</span>
            <span><i className="key-mine" /> Your teams</span>
          </div>
        </>
      )}
    </div>
  )
}
