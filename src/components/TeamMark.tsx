import type { CSSProperties } from 'react'

interface Props {
  logo: string
  color?: string
  size?: number
  glow?: boolean
}

/** Team logo on a soft disc tinted with the team color. */
export function TeamMark({ logo, color = '#1e6f78', size = 32, glow = false }: Props) {
  return (
    <span className={`mark${glow ? ' glow' : ''}`} style={{ '--team': color, width: size, height: size } as CSSProperties}>
      {logo && <img src={logo} alt="" loading="lazy" width={size} height={size} />}
    </span>
  )
}
