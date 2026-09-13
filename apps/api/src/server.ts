import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import { WebSocketServer } from "ws";
import { db, id } from "./db";
import { auth, verifyTelegramInitData, signUser, type AuthRequest } from "./auth";
import { createOrJoinGame, gameState, markNumber, claimBingo, tickGames } from "./game";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const clients = new Map<string, Set<any>>();

app.use(cors({ origin: process.env.WEB_ORIGIN?.split(",") || "*", credentials: false }));
app.use(express.json());

app.get("/health", (_req,res) => res.json({ ok: true, service: "vamios-api" }));

app.post("/api/auth/telegram", (req,res) => {
  try {
    const { initData, demo } = req.body || {};
    let telegramId = "";
    let firstName = "Demo";
    let lastName = "Player";
    let username = "demo";

    if (demo && !process.env.TELEGRAM_BOT_TOKEN) {
      telegramId = "demo-telegram-user";
    } else {
      const data = verifyTelegramInitData(String(initData || ""));
      const tgUser = JSON.parse(data.user || "{}");
      telegramId = String(tgUser.id);
      firstName = tgUser.first_name || "Player";
      lastName = tgUser.last_name || "";
      username = tgUser.username || "";
    }

    let user = db.prepare("SELECT * FROM users WHERE telegram_id=?").get(telegramId) as any;
    if (!user) {
      const userId = id();
      db.prepare(`INSERT INTO users (id,telegram_id,username,first_name,last_name,balance,created_at)
                  VALUES (?,?,?,?,?,?,?)`)
        .run(userId,telegramId,username,firstName,lastName,100,new Date().toISOString());
      user = db.prepare("SELECT * FROM users WHERE id=?").get(userId);
    } else {
      db.prepare("UPDATE users SET username=?,first_name=?,last_name=? WHERE id=?")
        .run(username,firstName,lastName,user.id);
      user = db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
    }
    res.json({ token: signUser(user.id), user: publicUser(user) });
  } catch (e:any) {
    res.status(400).json({ error: e.message || "Authentication failed" });
  }
});

function publicUser(user:any) {
  return { id:user.id, username:user.username, firstName:user.first_name, lastName:user.last_name, balance:user.balance };
}

app.get("/api/me", auth, (req:AuthRequest,res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.userId) as any;
  if (!user) return res.status(404).json({error:"User not found"});
  res.json(publicUser(user));
});

app.get("/api/lobby", auth, (_req,res) => {
  const rows = db.prepare(`
    SELECT stake, COUNT(*) as games,
      SUM((SELECT COUNT(*) FROM game_players gp WHERE gp.game_id=g.id)) as players
    FROM games g WHERE status='WAITING' GROUP BY stake
  `).all();
  res.json({ stakes:[10,15,25,50], waiting:rows });
});

app.post("/api/games", auth, (req:AuthRequest,res) => {
  try {
    const { stake, boardId } = req.body;
    const state = createOrJoinGame(req.userId!, Number(stake), Number(boardId));
    broadcast(state.id);
    res.json(state);
  } catch(e:any) {
    res.status(400).json({error:e.message});
  }
});

app.post("/api/games/:id/join", auth, (req:AuthRequest,res) => {
  try {
    const { boardId } = req.body;
    const current = gameState(req.params.id);
    if (!current) return res.status(404).json({error:"Game not found"});
    const state = createOrJoinGame(req.userId!, current.stake, Number(boardId));
    broadcast(state.id);
    res.json(state);
  } catch(e:any) { res.status(400).json({error:e.message}); }
});

app.get("/api/games/:id", auth, (req,res) => {
  const state = gameState(req.params.id);
  if (!state) return res.status(404).json({error:"Game not found"});
  res.json(state);
});

app.post("/api/games/:id/mark", auth, (req:AuthRequest,res) => {
  try {
    res.json(markNumber(req.userId!, req.params.id, Number(req.body.number)));
  } catch(e:any) { res.status(400).json({error:e.message}); }
});

app.post("/api/games/:id/bingo", auth, (req:AuthRequest,res) => {
  try {
    const state = claimBingo(req.userId!, req.params.id);
    broadcast(req.params.id);
    res.json(state);
  } catch(e:any) { res.status(400).json({error:e.message}); }
});

app.get("/api/wallet", auth, (req:AuthRequest,res) => {
  const user = db.prepare("SELECT balance FROM users WHERE id=?").get(req.userId!) as any;
  const transactions = db.prepare(`SELECT id,type,amount,status,reference,created_at as createdAt
    FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 50`).all(req.userId!);
  res.json({balance:user.balance, transactions});
});

// Demo wallet adapter. Replace these endpoints with your licensed payment-provider flow.
app.post("/api/wallet/deposit", auth, (req:AuthRequest,res) => {
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) return res.status(400).json({error:"Invalid amount"});
  const trx = db.transaction(() => {
    db.prepare("UPDATE users SET balance=balance+? WHERE id=?").run(amount, req.userId!);
    db.prepare(`INSERT INTO wallet_transactions (id,user_id,type,amount,status,reference,created_at)
                VALUES (?,?,?,?,?,?,?)`)
      .run(id(),req.userId!,"DEPOSIT",amount,"DEMO_COMPLETED","demo",new Date().toISOString());
  });
  trx();
  res.json({ok:true});
});

app.post("/api/wallet/withdraw", auth, (req:AuthRequest,res) => {
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount <= 0) return res.status(400).json({error:"Invalid amount"});
  const user = db.prepare("SELECT balance FROM users WHERE id=?").get(req.userId!) as any;
  if (!user || user.balance < amount) return res.status(400).json({error:"Insufficient balance"});
  const trx = db.transaction(() => {
    db.prepare("UPDATE users SET balance=balance-? WHERE id=?").run(amount, req.userId!);
    db.prepare(`INSERT INTO wallet_transactions (id,user_id,type,amount,status,reference,created_at)
                VALUES (?,?,?,?,?,?,?)`)
      .run(id(),req.userId!,"WITHDRAWAL",-amount,"DEMO_COMPLETED","demo",new Date().toISOString());
  });
  trx();
  res.json({ok:true});
});

function broadcast(gameId:string) {
  const state = gameState(gameId);
  const set = clients.get(gameId);
  if (!state || !set) return;
  const msg = JSON.stringify({type:"GAME_STATE", payload:state});
  for (const ws of set) if (ws.readyState === 1) ws.send(msg);
}

server.on("upgrade", (request, socket, head) => {
  if (!request.url?.startsWith("/ws")) return socket.destroy();
  wss.handleUpgrade(request, socket, head, ws => {
    const url = new URL(request.url!, "http://localhost");
    const gameId = url.searchParams.get("gameId");
    if (!gameId) return ws.close();
    if (!clients.has(gameId)) clients.set(gameId,new Set());
    clients.get(gameId)!.add(ws);
    ws.on("close", () => clients.get(gameId)?.delete(ws));
    const state = gameState(gameId);
    if (state) ws.send(JSON.stringify({type:"GAME_STATE",payload:state}));
  });
});

setInterval(() => tickGames(broadcast), 1000);

const port = Number(process.env.PORT || 3001);
server.listen(port, () => console.log(`VAMIOS API listening on :${port}`));
