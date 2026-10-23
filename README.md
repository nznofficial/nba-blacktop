# 🏀 BLACKTOP

**Live:** https://nznofficial.github.io/nba-blacktop/

A streetwear-styled NBA companion for the 2026–27 season, hosted on GitHub Pages. Raw concrete (light) and after-hours asphalt (dark), with Big Shoulders Display signage type, Archivo + IBM Plex Mono, hard borders, offset block shadows, and a safety-orange accent.

- **Ticker**: a scrolling bar of the day's games, scores, and lines.
- **Scoreboard**: a magazine-style lede for the game of the night, then sportsbook-style rows.
- **Game detail**: tap any game for line score, win probability, matchup predictor, line movement (open → now), leaders, team stats, full box score, recent form, and injuries.
- **Daily games**: tip-off in your local time, TV channels (national, plus home/away regional), and live scores that refresh automatically.
- **Odds**: moneyline, spread, and over/under (DraftKings via ESPN), with a **FAV** badge on the betting favorite.
- **My teams**: star teams to pin their games to the top and highlight them in the standings.
- **Standings**: East and West with playoff (1–6) and play-in (7–10) cut lines, L10, and streaks.
- **Daily Pick'em**: pick winners before tip-off. Picks are auto-graded, with streaks, perfect days, and shareable image cards for each day and your season card.
- **Extras**: browse any date (`?date=YYYYMMDD` and `#game=<id>` deep links), light/dark (auto, Concrete, After Hours), and installable as a PWA.

## Develop

```sh
npm install
npm run dev
```

## Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes to Pages.
One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The build uses a relative base path, so it works under any repo name.

## Data

All data comes live from ESPN's public, keyless site API (`site.api.espn.com`). It's unofficial and could change
without notice; parsing lives in `src/api.ts`. Pick'em and favorites are stored in your browser's localStorage.

Odds are for entertainment only. Please gamble responsibly (1-800-GAMBLER).
