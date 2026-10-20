# 🏀🏖️ Courtside Tides

An editorial, coastal-glass NBA companion for the 2026–27 season, hosted on GitHub Pages. Designed like a newspaper sports section printed on sand-toned paper, with Instrument Serif headlines, Geist/Geist Mono data type, and a sea-glass accent.

- **Scoreboard**: a magazine-style lede for the game of the night, then sportsbook-style rows.
- **Game detail**: tap any game for line score, win probability, matchup predictor, line movement (open → now), leaders, team stats, full box score, recent form, and injuries.
- **Daily games**: tip-off in your local time, TV channels (national, plus home/away regional), and live scores that refresh automatically.
- **Odds**: moneyline, spread, and over/under (DraftKings via ESPN), with a **FAV** badge on the betting favorite.
- **My teams**: star teams to pin their games to the top and highlight them in the standings.
- **Standings**: East and West with playoff (1–6) and play-in (7–10) cut lines, L10, and streaks.
- **Daily Pick'em**: pick winners before tip-off. Picks are auto-graded, with streaks, perfect days, and a shareable emoji grid.
- **Extras**: browse any date (`?date=YYYYMMDD` and `#game=<id>` deep links), light/dark (auto, day beach, night ocean), and installable as a PWA.

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
