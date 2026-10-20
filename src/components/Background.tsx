// Fixed atmosphere behind the paper: slow-drifting light caustics and a fine grain.
export function Background() {
  return (
    <div className="tide" aria-hidden="true">
      <div className="caustic c1" />
      <div className="caustic c2" />
      <div className="caustic c3" />
      <div className="grain" />
    </div>
  )
}
