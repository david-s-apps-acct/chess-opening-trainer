# CLAUDE.md

## Project

Chess Opening Trainer: a browser app that pulls the user's Lichess studies (including private ones) and quizzes them on the correct next moves.

**SPEC.md is the source of truth for what the app does. Read it before any work and follow it.**

## Current phase

Building. The app is `index.html`; keep it in line with SPEC.md.

## Standing rules

- **Licence:** AGPL-3.0-or-later with a section 7(b) attribution term (`LICENSE`, `NOTICE.md`). Keep "Chess Opening Trainer by David Sharman" in the Help page, and add any new third-party part, with its licence, to `NOTICE.md` and the Help credits.
- **Writing for the user (the user's guideline):** assume users are intelligent and experienced at chess. Use as few words as possible on screen: brief labels, messages and hover hints, never long explanations. Longer explanations go on the Help page.
- The whole app is a single HTML file, `index.html`, opened from disk (`file://`) or from GitHub Pages. No server, no build step, no npm. Online, `sw.js` (the service worker) keeps it working offline: when a library, font or sound URL changes, update its file list and bump its `VERSION`.
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
  - **position reached**: how many times a position was reached in rated Lichess games, always with `shortCount()`: "Reached 23k times (Lichess) 46 times (Masters)" on the hover boards and the Studies page (`positionCountText`), the column "Position reached (times)" in the positions table.
  - **errors are violet** everywhere (arrows and text), whatever kind; the kind is in the text, e.g. "(masters)".
  - Don't use "score" or a bare "accuracy" for these on screen. (Internal code names like `scoreOf` and the `score-90` classes may stay.)
  - **error** vs **mistake** (different concepts): an **error** is any move you play that isn't the one in your study (your preferred line), plus the hint; errors cost move accuracy ("Errors: …", "No errors.", "Error penalties"). **Mistake** is reserved for moves marked as a mistake (?), blunder (??) or dubious (?!) in a study (one definition everywhere: `isMistake()`), e.g. "marked as a mistake", "Prefer opponent's mistakes". Never call an error a mistake. Avoid "wrong" in labels; use "error".
  - **Studies page**: the page with your studies and a chapter on a board (the header's Studies button, or the small board icon by the study's name during practice); it was called the Review page until 4 November 2026. Looking through a chapter on its board is still `review` in the code (`openReview`, `reviewBoard`); the page is `studies-screen`. Not "explore", which could be confused with Lichess's Opening Explorer (the move statistics).
  - **group**: a named set of chapters to practise (All is built in), chosen on the Practice page and edited on the Studies page; `preset` in the code and stored data.
  - Name positions with the agreed convention (opening name plus the moves since; see SPEC.md, Naming positions), and show counts of games with `shortCount()`.

- When editing SPEC.md, record only what the user decided. If you add a detail or make an assumption they didn't state, add it and then point it out explicitly so they can accept or reject it.
- Ask before changing any decision already recorded in the spec.
- Ask one or two focused questions at a time, not long lists.

## Running

Open `index.html` in a browser. It needs internet access, for Lichess and the CDN.

For testing without a real token: serve the folder over localhost (the Browser pane blocks storage on `file://`), seed IndexedDB key `studies` in database `chess-opening-trainer`, or stub `window.fetch` for `/api/account` and `/export.pgn` (and `explorer.lichess.org` for move statistics).

**Tests:** `tests.html` (open over localhost) loads `index.html` without starting the app and checks the core logic (scoring, penalties, masters moves, position names, study parsing), plays whole practice lines through the app (wrong moves, alternatives, hints, ending early, single positions, the Practice page's chooser, spaced repetition, groups (presets), the Studies page (its list, hiding, the arrows switch); saving and network are switched off from the start, so stored data is never touched), plus a recorded snapshot of how the test chapters become lines, trees and positions. It takes about 25 seconds. If results look stale, the local server may have stopped and the service worker is serving saved copies: restart it, and load `tests.html?v=N` to get past the browser's cache. Run it after any change to that logic or to practice; all checks should pass. After a deliberate change to the chapter structures, re-record the snapshot with `tests.html?record` and replace `EXPECTED_SNAPSHOT`.

## Where things are

- Counts of games are always shown with `shortCount()` (950, 23k, 1.2M, 1.8bn). Use it for any new place that shows how often a position was reached.

- Natural-language selection ("Describe what to practice") was removed; its spec and code are archived in `archive/natural-language-selection.md` (not loaded by the app) in case it's rebuilt.
- The script in `index.html` is divided into sections marked `// ---------- Name ----------`: Storage, State, Page helpers, Chess helpers, Lichess (`downloadStudies`, `useStudies`; `fetchStudies` when connecting, with the welcome screen's flow: `fetchStudies({ welcome: true })`, `showWelcomeReady`; `syncStudies`, the automatic update each time the app opens, which waits for the end of a practice session via `waitingStudies`), Lichess login (OAuth with PKCE: `logInWithLichess`, `finishLogIn`; online only), Chapters and lines (with `positionName`), Annotations, Move results and grading, Studies list (on the Studies page, beside the board: `renderStudies`, `renderStudiesList`; not editing, a chapter opens it, and the eye by the Studies heading shows hidden studies and chapters; the Groups tile above it, whose ✎ edits the groups: `editing`, `startEditing`), Studies page: reviewing a chapter (`openReview`, `showReviewNode`; the arrows switch: `reviewArrows`, `topMoves`, `errorArrows`, `squareTipLines` for the hover tips; `studies-screen`), Spaced repetition (`practiceItems`, `itemFacts`, `priorityOf`, the `WEIGHTS` sliders), Practice: the board, Practice: choosing what to practise (the chooser, the Spaced repetition tile with its sliders, `renderWeights`, and Test probabilities), Practice: playing lines (`session`, `startSession`, `nextItem`, `finish`, `endPractice`), the move list, names and sounds, the hover board, the Lichess downloads, Lichess page (`showLichess`, `renderLichessPage`, `updateLichessStatus` for the header's Lichess button, connecting, `showWelcomeReady`), Backup, Navigation and Start. Put new code in the section it belongs to.
- Practice starts only from the Practice page's chooser, for the chosen preset (`startSession`), and stops with End practice (`endPractice`); every line or position played belongs to a `session`. Chapters are only ticked while editing a group on the Studies page (`editing`); Start practice waits meanwhile.
- Stored data: localStorage (`cot.` + `token`, `tokenSavedAt`, `settings`, `presets` (`[{ name, chapters }]`), `chosenPreset` (null for the built-in preset All; what's practised is always the chosen preset's chapters, worked out by `useChosenPreset` into the in-memory `selection`; only groups decide what's practised), `hidden` (the studies (ids) and chapters (keys) hidden from the Studies page's list; hiding doesn't affect practice), `history`, `lastBackup` (when a backup was last saved from this browser; not in backups)) and IndexedDB database `chess-opening-trainer` version 4 (store `library` for the fetched studies, with your Lichess ratings, store `moveStats` keyed by EPD, each `{ lichess, masters }`). `history` is `{ moves: { moveKey: [{ tried, at }] }, lines: { lineKey: [times] } }` (a move's key is its tree node's `key`, a line's is its last move's) (the last 10 of each); points aren't stored, they're worked out in memory (`rescoreHistory`). `settings.practice` is `{ kind: 'lines' | 'positions', mainLinesOnly: { lines, positions }, reversed (Reverse sides, lines only, not scored), weights: { frequency, accuracy, lastPlayed, untried } }` (the weights are the four spaced-repetition sliders, 0–100, default 50). `settings.review` is `{ view }`, the Studies page's arrows switch: 'study', 'masters' or 'lichess' (the masters moves or the top-5 Lichess moves, each with its share: `topMoves`) or 'errors' (your errors there, "×2" when repeated: `errorArrows`); see `reviewArrows`. Arrow colours: `BRUSHES` (see the comment above it); a study's own arrows and circles are each node's `drawn`. `settings.games` is `{ ratings, speeds }`, the Opening Explorer's rating bands and time controls the move statistics come from (null until chosen from your Lichess rating, `chooseDefaultGames`; each position's `lichess` statistics record theirs as `games`, see `gamesKey`; `library.ratings` holds your Lichess ratings). The error penalties are fixed (`ERROR_PENALTIES`: 20, 20, 50, 100%; a masters move is a top-3 master move played 10% of the time or more); `pointsFor` divides them by 10 (points are 0–10). Backups are version 5 and hold the same pieces; older backups can't be restored.
- Each chapter is parsed once into a tree of move nodes (`parseChapter(ch).root`; see the comment above `parseChapter`). Lines, the Studies page's tree, alternative counts and the positions to download all read from that tree, and each node carries its position and its `key` ("studyId/chapterId|e4 e5 Nf3"), so nothing replays moves from the start or rebuilds keys. Hover boards take a move node (`addHoverBoard(el, node, orientation)`).
- Studies update from Lichess each time the app opens (`syncStudies`; there's no Update studies button). The Lichess downloads (move statistics, masters statistics) run automatically from `startDownloads()` after that, and after studies are fetched or replaced.
