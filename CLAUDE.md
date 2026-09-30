# CLAUDE.md

## Project

Chess Opening Trainer: a browser app that pulls the user's Lichess studies (including private ones) and quizzes them on the correct next moves.

**SPEC.md is the source of truth for what the app does. Read it before any work and follow it.**

## Current phase

Building. The app is `trainer.html`; keep it in line with SPEC.md.

## Standing rules

- The whole app is a single HTML file, opened directly from disk (`file://`). No server, no build step, no npm.
- Libraries load from the jsDelivr CDN via ES module imports:
  - chessops for PGN parsing and move validation
  - chessground for the board
  - Noto Sans (`@fontsource/noto-sans`) for the Lichess look, and Noto Sans Symbols 2 (`@fontsource/noto-sans-symbols-2`) for the piece symbols in move notation
  - Lichess's SFX sounds, via jsDelivr's GitHub route (`cdn.jsdelivr.net/gh/lichess-org/lila@<commit>/…`). Only use Lichess assets that COPYING.md marks as freely licensed; the default "standard" sounds are non-free.
- The page is always dark (Lichess dark theme); don't add a light mode.
- Call the Lichess API directly from the page.
- Browser storage:
  - localStorage for the Lichess token, the selection, stats and preferences (backups never include the token)
  - IndexedDB for cached study data and the downloaded Lichess data (move statistics, masters statistics, evaluations; these are included in backups)

## Working with the user

- When editing SPEC.md, record only what the user decided. If you add a detail or make an assumption they didn't state, add it and then point it out explicitly so they can accept or reject it.
- Ask before changing any decision already recorded in the spec.
- Ask one or two focused questions at a time, not long lists.

## Running

Open `trainer.html` in a browser. It needs internet access, for Lichess and the CDN.

For testing without a real token: serve the folder over localhost (the Browser pane blocks storage on `file://`), seed IndexedDB key `studies` in database `chess-opening-trainer`, or stub `window.fetch` for `/api/account` and `/export.pgn` (and `explorer.lichess.org` for move statistics).

## Where things are

- Natural-language selection ("Describe what to practice") was removed; its spec and code are archived in `archive/natural-language-selection.md` (not loaded by the app) in case it's rebuilt.
- The script in `trainer.html` is divided into sections marked `// ---------- Name ----------`: Storage, State, helpers, Lichess, chapters and lines, annotations, move results and grading, then one section per page (Studies, Practice, Weaknesses, Options), the Lichess downloads, backup, navigation and start. Put new code in the section it belongs to.
- Stored data: localStorage (`cot.` + `token`, `settings`, `selection`, `favorites`, `hiddenStudies`, `history`) and IndexedDB database `chess-opening-trainer` (store `library` for the fetched studies, store `positions` keyed by EPD, each `{ lichess, masters, eval }`). `history` is `{ moves: { moveKey: { attempts: [{ tried, points }], lastTried } }, lines: { lineKey: { played: [times] } } }`. Backups are version 4 and hold the same pieces; older backups can't be restored.
- The Lichess downloads (move statistics, masters statistics, evaluations) run automatically from `startDownloads()` after Update studies and when the app opens.
