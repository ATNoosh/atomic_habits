# Atomic Habits PWA

Personal habit tracker inspired by Atomic Habits.

## Features
- Identity, cue, tiny behavior, environment
- Daily / selected-weekday habits
- Today checklist, complete, skip, undo
- Current and best streaks
- 30-day completion rate
- Monthly calendar and statistics
- JSON export/import
- Backup reminder
- Offline-capable PWA
- GitHub Pages deployment

## Run locally
```bash
npm install
npm run dev
```

## GitHub Pages
1. Create a GitHub repository, e.g. `atomic-habits`.
2. Copy all project files into its root.
3. Push to the `main` branch.
4. GitHub: **Settings → Pages → Build and deployment → GitHub Actions**.
5. The included workflow deploys automatically.

The app uses `base: "./"`, so a normal project URL works:
`https://YOUR_USERNAME.github.io/atomic-habits/`

## Phone
Open the Pages URL on the phone. On Android Chrome use **Install app / Add to Home screen**. On iPhone Safari use **Share → Add to Home Screen**.

## Data
Data is stored locally with `localStorage`. Export JSON backups before clearing browser data, resetting the phone, changing browsers, or clearing site data.
