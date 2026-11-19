# Chess Opening Trainer

Copyright © 2026 David Sharman

This program is free software: you can redistribute it and/or modify it under the terms of the GNU
Affero General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version. See [LICENSE](LICENSE).

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
General Public License for more details.

## Additional term (section 7(b) of the license)

Every copy and every modified version of this program, and every version made available to users
over a network, must keep the author attribution **"Chess Opening Trainer by David Sharman"**
visible to users in the program's Help page (or, if the program has no Help page, in an equally
prominent place). Modified versions must also say that they have been changed.

## Third-party parts

Loaded by the app from the jsDelivr CDN; each keeps its own license:

| Part | Author | License |
|---|---|---|
| [chessground](https://github.com/lichess-org/chessground) (board, pieces, board style) | Lichess | GPL-3.0-or-later |
| [chessops](https://github.com/niklasf/chessops) (chess rules, PGN) | Niklas Fiekas | GPL-3.0-or-later |
| "SFX" move sounds, from [lila](https://github.com/lichess-org/lila) | Enigmahack | AGPL-3.0-or-later |
| [Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans) and Noto Sans Symbols 2 (via Fontsource) | Google | OFL-1.1 |

Hosted with the app, in the `engine` folder:

| Part | Author | License |
|---|---|---|
| [Stockfish](https://github.com/official-stockfish/Stockfish) 19 lite, single-threaded (evaluations), in the [stockfish.js](https://github.com/nmrugg/stockfish.js) build 19.0.1 | The Stockfish developers; WebAssembly build by Nathan Rugg | GPL-3.0 (`engine/Copying.txt`) |

Its source code: [Stockfish](https://github.com/official-stockfish/Stockfish/tree/sf_19) and the
[stockfish.js build](https://github.com/nmrugg/stockfish.js/tree/v19.0.1) (the files are
`stockfish-19-lite-single.js` and `.wasm` from its npm package, `stockfish` 19.0.1, unchanged).

The app's icon is the knight (♞) from Noto Sans Symbols 2, in white on the app's blue.

Move statistics come from the [Lichess Opening Explorer](https://lichess.org/api#tag/Opening-Explorer).

This app is not affiliated with or endorsed by Lichess.org.
