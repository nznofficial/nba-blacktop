import { addDays, fromYMD, toInputValue, todayYMD } from '../lib/date'
import { Calendar, Chevron } from './Icons'

interface Props {
  ymd: string
  onChange: (ymd: string) => void
}

export function DateRail({ ymd, onChange }: Props) {
  const today = todayYMD()
  const days = [-3, -2, -1, 0, 1, 2, 3].map((n) => addDays(ymd, n))
  return (
    <div className="rail">
      <button className="rail-step" aria-label="Previous day" onClick={() => onChange(addDays(ymd, -1))}>
        <Chevron dir="left" />
      </button>
      <div className="rail-days">
        {days.map((d) => {
          const date = fromYMD(d)
          return (
            <button
              key={d}
              className={`rail-day${d === ymd ? ' active' : ''}${d === today ? ' today' : ''}`}
              onClick={() => onChange(d)}
              aria-current={d === ymd ? 'date' : undefined}
            >
              <span className="rd-dow">{d === today ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className="rd-dom">{date.getDate()}</span>
            </button>
          )
        })}
      </div>
      <button className="rail-step" aria-label="Next day" onClick={() => onChange(addDays(ymd, 1))}>
        <Chevron dir="right" />
      </button>
      <label className="rail-cal" title="Jump to a date">
        <Calendar />
        <input
          type="date"
          value={toInputValue(ymd)}
          onChange={(e) => e.target.value && onChange(e.target.value.replaceAll('-', ''))}
          aria-label="Jump to a date"
        />
      </label>
    </div>
  )
}
