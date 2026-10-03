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
  - IndexedDB for cached study data and the downloaded Lichess data (move statistics and masters statistics; these are included in backups)

## Working with the user

- **Terminology (the user's standing rule):** use these terms consistently in everything the user sees (the app, Help, messages) and in SPEC.md:
  - **move accuracy**: how well one of your moves is known, as a percentage. For one attempt, its points × 10 (e.g. "80% move accuracy" on the practice hover board); over time, the weighted average of its last 10 attempts (e.g. "75% move accuracy (last 4 tries)").
  - **line accuracy**: the average move accuracy of your moves in one completed line (e.g. "92% line accuracy").
  - **position reached**: how many times a position was reached in rated Lichess games, always with `shortCount()`: "Position reached 23k times" on the hover boards, the column "Position reached (times)" on the Positions page.
  - Don't use "score" or a bare "accuracy" for these on screen. (Internal code names like `scoreOf` and the `score-90` classes may stay.)
  - **error** vs **mistake** (different concepts): an **error** is any move you play that isn't the one in your study (your preferred line), plus the hint; errors cost move accuracy ("Errors: …", "No errors.", "Error penalties reducing move accuracy"). **Mistake** is reserved for moves marked as a mistake (?), blunder (??) or dubious (?!) in a study (one definition everywhere: `isMistake()`), e.g. "marked as a mistake", "Prefer opponent's mistakes". Never call an error a mistake. Avoid "wrong" in labels; use "error".
  - Name positions with the agreed convention (opening name plus the moves since; see SPEC.md, Naming positions), and show counts of games with `shortCount()`.

- When editing SPEC.md, record only what the user decided. If you add a detail or make an assumption they didn't state, add it and then point it out explicitly so they can accept or reject it.
- Ask before changing any decision already recorded in the spec.
- Ask one or two focused questions at a time, not long lists.

## Running

Open `trainer.html` in a browser. It needs internet access, for Lichess and the CDN.

For testing without a real token: serve the folder over localhost (the Browser pane blocks storage on `file://`), seed IndexedDB key `studies` in database `chess-opening-trainer`, or stub `window.fetch` for `/api/account` and `/export.pgn` (and `explorer.lichess.org` for move statistics).

**Tests:** `tests.html` (open over localhost) loads `trainer.html` without starting the app and checks the core logic (scoring, penalties, masters moves, position names, study parsing), plays whole practice lines through the app (wrong moves, alternatives, hints, ending early, single positions, practice lists and spaced repetition; saving and network are switched off), plus a recorded snapshot of how the test chapters become lines, trees and positions. It takes about 20 seconds. Run it after any change to that logic or to practice; all checks should pass. After a deliberate change to the chapter structures, re-record the snapshot with `tests.html?record` and replace `EXPECTED_SNAPSHOT`.

## Where things are

- Counts of games are always shown with `shortCount()` (950, 23k, 1.2M, 1.8bn). Use it for any new place that shows how often a position was reached.

- Natural-language selection ("Describe what to practice") was removed; its spec and code are archived in `archive/natural-language-selection.md` (not loaded by the app) in case it's rebuilt.
- The script in `trainer.html` is divided into sections marked `// ---------- Name ----------`: Storage, State, helpers, Lichess, chapters and lines, annotations, move results and grading, then one section per page (Studies, Lines, Positions, Practice, Options), spaced repetition (the priorities for the Practice page's All (spaced repetition)), the Lichess downloads, backup, navigation and start. Put new code in the section it belongs to.
- Practice starts only from the idle Practice page's chooser (via `practiceFromList`) and stops with End practice; the Studies page only selects chapters, and the Lines and Positions pages only show tables.
- Stored data: localStorage (`cot.` + `token`, `settings`, `selection`, `favorites`, `hiddenStudies`, `history`) and IndexedDB database `chess-opening-trainer` (store `library` for the fetched studies, store `positions` keyed by EPD, each `{ lichess, masters }`). `history` is `{ moves: { moveKey: { attempts: [{ tried, points }], lastTried } }, lines: { lineKey: { played: [times] } } }`. Backups are version 4 and hold the same pieces; older backups can't be restored.
- Each chapter is parsed once into a tree of move nodes (`parseChapter(ch).root`; see the comment above `parseChapter`). Lines, the Studies-page tree, branch points, alternative counts and the positions to download all read from that tree, and each node carries its position, so nothing replays moves from the start.
- The Lichess downloads (move statistics, masters statistics) run automatically from `startDownloads()` after Update studies and when the app opens.
