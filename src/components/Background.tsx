// Fixed street texture behind everything: halftone corner fade and concrete grain.
export function Background() {
  return (
    <div className="tide" aria-hidden="true">
      <div className="halftone" />
      <div className="halftone bottom" />
      <div className="grain" />
    </div>
  )
}
