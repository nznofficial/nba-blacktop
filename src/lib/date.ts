export const pad = (n: number) => String(n).padStart(2, '0')

export const toYMD = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`

export const fromYMD = (ymd: string) =>
  new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)))

export const addDays = (ymd: string, n: number) => {
  const d = fromYMD(ymd)
  d.setDate(d.getDate() + n)
  return toYMD(d)
}

export const todayYMD = () => toYMD(new Date())

export const toInputValue = (ymd: string) => `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`

export function dayLabel(ymd: string) {
  const t = todayYMD()
  if (ymd === t) return 'Today'
  if (ymd === addDays(t, -1)) return 'Yesterday'
  if (ymd === addDays(t, 1)) return 'Tomorrow'
  return fromYMD(ymd).toLocaleDateString(undefined, { weekday: 'long' })
}

export const longDate = (ymd: string) =>
  fromYMD(ymd).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

export const shortDate = (ymd: string) =>
  fromYMD(ymd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export const tipTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
