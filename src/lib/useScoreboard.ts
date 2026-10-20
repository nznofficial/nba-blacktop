import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchScoreboard, type Game } from '../api'
import { todayYMD } from './date'

const LIVE_MS = 20_000
const SOON_MS = 60_000
const IDLE_MS = 5 * 60_000

/** How often to re-poll, or null to stop (e.g. a finished day in the past). */
function pollInterval(ymd: string, games: Game[]): number | null {
  if (games.some((g) => g.state === 'in')) return LIVE_MS
  const now = Date.now()
  const startingSoon = games.some((g) => g.state === 'pre' && +new Date(g.date) - now < 15 * 60_000)
  if (startingSoon) return SOON_MS
  if (ymd >= todayYMD()) return IDLE_MS
  return games.every((g) => g.completed) ? null : IDLE_MS
}

export function useScoreboard(ymd: string) {
  const [games, setGames] = useState<Game[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updated, setUpdated] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const current = useRef(ymd)

  const load = useCallback(async () => {
    const target = ymd
    setLoading(true)
    try {
      const data = await fetchScoreboard(target)
      if (current.current !== target) return
      setGames(data)
      setError(null)
      setUpdated(new Date())
    } catch (e) {
      if (current.current === target) setError(e instanceof Error ? e.message : 'Could not load games')
    } finally {
      if (current.current === target) setLoading(false)
    }
  }, [ymd])

  useEffect(() => {
    current.current = ymd
    setGames(null)
    setError(null)
    load()
  }, [ymd, load])

  useEffect(() => {
    if (!games) return
    const ms = pollInterval(ymd, games)
    if (ms == null) return
    let id: number | undefined
    const start = () => {
      clearInterval(id)
      id = window.setInterval(() => !document.hidden && load(), ms)
    }
    const onVisible = () => {
      if (!document.hidden) {
        load()
        start()
      }
    }
    start()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ymd, games, load])

  const live = games?.some((g) => g.state === 'in') ?? false
  return { games, error, updated, loading, live, reload: load }
}
