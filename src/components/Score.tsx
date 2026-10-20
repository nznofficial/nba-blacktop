import { useEffect, useRef, useState } from 'react'

/** A score that briefly pulses whenever it changes during a live game. */
export function Score({ value, className = '' }: { value: number | null; className?: string }) {
  const prev = useRef(value)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (prev.current !== null && value !== prev.current) setTick((t) => t + 1)
    prev.current = value
  }, [value])
  return (
    <span key={tick} className={`num score ${tick ? 'bump' : ''} ${className}`}>
      {value ?? '–'}
    </span>
  )
}
