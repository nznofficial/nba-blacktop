import { addDays, dayLabel, fromYMD, longDate, toInputValue, todayYMD } from '../lib/date'
import { Calendar, Chevron } from './Icons'

interface Props {
  ymd: string
  onChange: (ymd: string) => void
}

export function DateStrip({ ymd, onChange }: Props) {
  const days = [-3, -2, -1, 0, 1, 2, 3].map((n) => addDays(ymd, n))
  const today = todayYMD()
  return (
    <div className="datestrip glass">
      <div className="datestrip-head">
        <div>
          <div className="eyebrow">{dayLabel(ymd)}</div>
          <h2 className="date-title">{longDate(ymd)}</h2>
        </div>
        <div className="datestrip-actions">
          {ymd !== today && (
            <button className="pill" onClick={() => onChange(today)}>Today</button>
          )}
          <label className="icon-btn" title="Pick a date">
            <Calendar />
            <input
              type="date"
              className="sr-date"
              value={toInputValue(ymd)}
              onChange={(e) => e.target.value && onChange(e.target.value.replaceAll('-', ''))}
            />
          </label>
        </div>
      </div>
      <div className="days">
        <button className="icon-btn" aria-label="Previous day" onClick={() => onChange(addDays(ymd, -1))}><Chevron dir="left" /></button>
        {days.map((d) => {
          const date = fromYMD(d)
          return (
            <button
              key={d}
              className={`day${d === ymd ? ' active' : ''}${d === today ? ' is-today' : ''}`}
              onClick={() => onChange(d)}
              aria-current={d === ymd ? 'date' : undefined}
            >
              <span className="dow">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className="dom">{date.getDate()}</span>
            </button>
          )
        })}
        <button className="icon-btn" aria-label="Next day" onClick={() => onChange(addDays(ymd, 1))}><Chevron dir="right" /></button>
      </div>
    </div>
  )
}
