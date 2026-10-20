// Fixed, decorative beach scene behind the glass panels.
export function Background() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="sky" />
      <div className="orb" />
      <div className="cloud c1" />
      <div className="cloud c2" />
      <div className="sea">
        <svg className="wave w1" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0 50c60 -18 120 -18 180 0c60 18 120 18 180 0c60 -18 120 -18 180 0c60 18 120 18 180 0c60 -18 120 -18 180 0c60 18 120 18 180 0c60 -18 120 -18 180 0c60 18 120 18 180 0V120H0z" /></svg>
        <svg className="wave w2" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0 64c60 -14 120 -14 180 0c60 14 120 14 180 0c60 -14 120 -14 180 0c60 14 120 14 180 0c60 -14 120 -14 180 0c60 14 120 14 180 0c60 -14 120 -14 180 0c60 14 120 14 180 0V120H0z" /></svg>
        <svg className="wave w3" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0 78c60 -10 120 -10 180 0c60 10 120 10 180 0c60 -10 120 -10 180 0c60 10 120 10 180 0c60 -10 120 -10 180 0c60 10 120 10 180 0c60 -10 120 -10 180 0c60 10 120 10 180 0V120H0z" /></svg>
      </div>
      <div className="sand" />
    </div>
  )
}
