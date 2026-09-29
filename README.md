# TEKKEN 8 — Browser Edition

A 2D fighting game for the browser with deep, frame-data-driven mechanics.

```bash
npm start          # http://localhost:3000
```

No build step, no dependencies. Plain ES modules + Canvas 2D.

## Controls

| | Move | Punch | Kick | Block | Heat | Rage |
|---|---|---|---|---|---|---|
| **P1** | `WASD` | `J` | `K` | `L` | `Shift` | `Q` |
| **P2** | Arrows | `Numpad1` | `Numpad2` | `Numpad3` | `Numpad+` | `Numpad-` |

Gamepads are auto-detected. On touch devices an on-screen stick and button
layout appear automatically.

**Training overlays** (in match): `F1` hurtboxes · `F2` hitboxes ·
`F3` live frame data · `F4` input history

## Mechanics

- **Motion inputs** — quarter/half circles, dragon punch, `f,f` dash,
  `b,b` backdash, buffered buttons, facing-relative numpad notation
- **Frame data** — startup / active / recovery with real `onBlock` / `onHit` /
  counter-hit values, punish windows, safe-vs-unsafe move balance
- **Juggling** — launchers, tornadoes (refresh juggle allowance), juggle
  limits, damage scaling
- **Wall game** — wall carry, wall splat, wall bounce, balcony break,
  spiral throws, wall throws, ring-out
- **Defense** — high/low/mid blocking, unblockables, guard meter and guard
  crush, chip damage that cannot kill, recoverable (white) health
- **Throws** — normal and command throws, tech throws, wall throws
- **Wakeup** — knockdown, floor bounce, downback, reversal invulnerability
- **Heat** — burst vs engager entry, two energy bars, heat dash and smash,
  per-character heat moves
- **Rage** — auto-activates at 25% health, one rage art per round, damage
  scales with missing health

## Roster

Nine characters with distinct movesets, stats and silhouettes:
Jin, Kazuya, Paul, King, Xiaoyu, Law, Nina, Bryan, Yoshimitsu.

Eight stages.

## Modes

Arcade (AI), Versus (local 2P), Training, Online (room-code relay).

## Online

`server.cjs` serves the static files and hosts a WebSocket relay with no
dependencies. One player creates a room and shares the code; the other joins.

## Tests

```bash
npm test               # core systems
npm run test:core      # input engine, frame data, roster integrity
npm run test:ws        # websocket relay (needs the server running)
npm run test:browser   # gameplay + wall game suite in headless chromium
npm run test:all
```

`test/suite.mjs` holds the 81 gameplay and wall-game assertions. It is
executed inside a real browser by `test/browser.test.mjs`, because the game
is a browser app and the module graph needs to be validated where it
actually runs. `npm run test:browser` needs `npm i playwright && npx
playwright install chromium`.

## Layout

```
index.html
css/style.css
js/
  main.js              app shell, menus, render loop
  engine/              game loop, input, renderer
  game/                fighter, combat, moves, AI, wall game, rig, netcode
  data/                roster, stages
  ui/                  HUD, touch controls
  audio/               procedural SFX
server.cjs             static server + room API
ws.cjs                 dependency-free websocket relay
```

## License

MIT. Not affiliated with Bandai Namco. All character names and move
notations are references; this is a fan project.
