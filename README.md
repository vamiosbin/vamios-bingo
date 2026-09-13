# VAMIOS Bingo — full-stack starter

A production-oriented starter for the architecture you described:

- Telegram bot: registration, wallet commands, Web App launch
- VAMIOS Web App: React + Vite, deployable to GitHub Pages
- Lobby: stakes 10 / 15 / 25 / 50 virtual credits
- Board selection: 1–100
- Waiting room with one shared 60-second countdown
- Server-authoritative number caller every 5 seconds
- Manual board marking
- Server-side BINGO verification
- Winner screen
- Prize split: 80% winner / 20% commission
- SQLite for local development; easy to swap for PostgreSQL
- WebSocket game-state broadcasts
- Docker setup
- Telegram Mini App initData verification
- Payment/withdrawal hooks intentionally kept as adapters for licensed production providers

## Important production note

This repository uses **virtual/demo credits**. It does not include a real-money gambling/payment processor.

If you operate this as a real-money bingo product, you need to handle the applicable gambling licence, age/geo restrictions, KYC/AML, responsible-gaming controls, payment-provider rules, tax/reporting, privacy, security, and Telegram/platform requirements for the countries where you operate.

## Repository layout

```text
apps/
  web/       React/Vite Web App
  api/       Express API + WebSocket game engine
  bot/       Telegram bot
packages/
  shared/    Shared TypeScript types and game helpers
database/
  schema.sql
.github/
  workflows/
```

## Local development

Requirements:

- Node.js 20+
- npm 10+

Install:

```bash
npm install
```

Create environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/bot/.env.example apps/bot/.env
```

Start API:

```bash
npm run dev:api
```

Start web app:

```bash
npm run dev:web
```

Start bot:

```bash
npm run dev:bot
```

Open:

```text
http://localhost:5173
```

The web app falls back to a local demo user when Telegram Web App data is absent.

## GitHub Pages

The frontend is configured for Vite base-path deployment.

Set the GitHub repository name in:

```text
apps/web/.env.production
```

Example:

```text
VITE_BASE_PATH=/vamios-bingo/
VITE_API_URL=https://your-api.example.com
```

Then push to GitHub. The included workflow builds and deploys `apps/web/dist`.

## API

Main endpoints:

```text
POST /api/auth/telegram
GET  /api/me
GET  /api/lobby
GET  /api/games/:id
POST /api/games
POST /api/games/:id/join
POST /api/games/:id/mark
POST /api/games/:id/bingo
GET  /api/wallet
POST /api/wallet/deposit
POST /api/wallet/withdraw
```

WebSocket:

```text
ws://localhost:3001/ws
```

## Game flow

1. User opens the Telegram Web App.
2. Backend validates Telegram `initData`.
3. User receives/creates a local account.
4. User selects a stake.
5. Server creates or joins a waiting game for that stake.
6. Players select one board from 1–100.
7. The game starts after the first player joins, with a 60-second countdown.
8. Numbers are called every 5 seconds by the server.
9. All connected clients receive the same state through WebSocket.
10. Player manually marks called numbers.
11. Player submits BINGO.
12. Server verifies the board against the called numbers.
13. Winner receives 80% of the pot; 20% is recorded as commission.
14. Game closes.

## Game rules in this starter

- Each board is a deterministic 5×5 Bingo card generated from the board ID.
- 1–15: B
- 16–30: I
- 31–45: N
- 46–60: G
- 61–75: O
- Center cell is FREE.
- A winning line is any row, column, or diagonal.
- A BINGO claim is accepted only if a complete line is currently satisfied.
- Number calls are unique and random.
- The server, not the browser, controls the RNG and game state.

## Next production steps

- Replace demo wallet adapter with a licensed payment provider.
- Move SQLite to PostgreSQL.
- Add Redis for horizontal WebSocket/game coordination.
- Add admin dashboard and audit logs.
- Add KYC/AML and responsible-gaming controls.
- Add rate limiting, CSRF/origin protections where applicable, structured logging and monitoring.
- Add integration/e2e tests.
