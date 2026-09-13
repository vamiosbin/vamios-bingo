import { useEffect, useMemo, useState } from "react";
import { generateBoard, type GameState, STAKES } from "@vamios/shared";
import * as api from "./api";

type User = {id:string;username?:string;firstName:string;lastName?:string;balance:number};

function App() {
  const [user,setUser] = useState<User|null>(null);
  const [screen,setScreen] = useState<"lobby"|"board"|"game"|"wallet"|"result">("lobby");
  const [stake,setStake] = useState<number>(10);
  const [boardId,setBoardId] = useState<number>(1);
  const [game,setGame] = useState<GameState|null>(null);
  const [error,setError] = useState("");
  const [selected,setSelected] = useState<Set<number>>(new Set());
  const [walletOpen,setWalletOpen] = useState(false);

  useEffect(() => {
    (window as any).Telegram?.WebApp?.ready?.();
    (window as any).Telegram?.WebApp?.expand?.();
    api.login().then(setUser).catch(e=>setError(e.message));
  },[]);

  useEffect(() => {
    if (!game) return;
    const ws = new WebSocket(api.wsUrl(game.id));
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.type === "GAME_STATE") {
        setGame(msg.payload);
        if (msg.payload.status === "FINISHED") setScreen("result");
      }
    };
    ws.onerror = () => {};
    return () => ws.close();
  },[game?.id]);

  const board = useMemo(() => generateBoard(boardId), [boardId]);
  const called = useMemo(() => new Set(game?.calledNumbers || []), [game?.calledNumbers]);
  const myPlayer = game?.players.find(p=>p.id===user?.id);
  const displayBoard = useMemo(() => myPlayer ? generateBoard(myPlayer.boardId) : board,[myPlayer?.boardId,board]);

  const enter = async () => {
    setError("");
    try {
      const g = await api.createGame(stake,boardId);
      setGame(g); setScreen("game");
      setUser(await api.getMe());
    } catch(e:any) { setError(e.message); }
  };

  const claim = async () => {
    if (!game) return;
    try {
      const g = await api.bingo(game.id);
      setGame(g); setScreen("result");
      setUser(await api.getMe());
    } catch(e:any) { setError(e.message); }
  };

  if (!user) return <main className="shell"><div className="card"><h1>VAMIOS</h1><p>Connecting to Telegram…</p>{error&&<div className="error">{error}</div>}</div></main>;

  return <main className="shell">
    <header className="topbar">
      <div><strong>VAMIOS</strong><span className="muted"> Bingo</span></div>
      <button className="balance" onClick={()=>{setWalletOpen(true);setScreen("wallet")}}>💰 {user.balance}</button>
    </header>

    {error && <div className="error">{error}<button onClick={()=>setError("")}>×</button></div>}

    {screen==="lobby" && <section>
      <div className="hero"><h2>Choose your game</h2><p>Pick a stake, then choose a board from 1–100.</p></div>
      <div className="stakes">{STAKES.map(s=><button key={s} className={stake===s?"stake active":"stake"} onClick={()=>setStake(s)}>{s}<small> credits</small></button>)}</div>
      <button className="primary full" onClick={()=>setScreen("board")}>Choose board</button>
      <button className="secondary full" onClick={()=>setScreen("wallet")}>Wallet</button>
    </section>}

    {screen==="board" && <section>
      <button className="back" onClick={()=>setScreen("lobby")}>← Back</button>
      <h2>Choose board</h2>
      <div className="board-picker">{Array.from({length:100},(_,i)=>i+1).map(n=>
        <button key={n} className={n===boardId?"board-num active":"board-num"} onClick={()=>setBoardId(n)}>{n}</button>
      )}</div>
      <div className="preview">
        <h3>Board #{boardId}</h3>
        <BingoBoard values={board} called={new Set()} selected={new Set()} onToggle={()=>{}} preview/>
      </div>
      <button className="primary full" onClick={enter}>Join {stake} credit game</button>
    </section>}

    {screen==="game" && game && <section>
      <div className="game-head">
        <div><span className="pill">{game.stake} credits</span><h2>Game #{game.id.slice(0,8)}</h2></div>
        <Countdown target={game.startsAt}/>
      </div>
      <div className="called-card"><span>Last called</span><strong>{game.calledNumbers.at(-1) || "—"}</strong><small>{game.calledNumbers.length} / 75 numbers</small></div>
      <BingoBoard
        values={displayBoard}
        called={called}
        selected={selected}
        onToggle={n=>setSelected(prev=>{const next=new Set(prev); next.has(n)?next.delete(n):next.add(n); return next;})}
      />
      <button className="primary full" onClick={claim}>BINGO</button>
      <p className="hint">Numbers are called by the server every 5 seconds. Your browser cannot create a winning call.</p>
      <div className="players">{game.players.map(p=><span key={p.id}>{p.displayName} · #{p.boardId}</span>)}</div>
    </section>}

    {screen==="result" && game && <section className="result">
      <div className="confetti">🎉</div>
      {game.winnerId===user.id ? <><h1>BINGO!</h1><p>You won.</p><strong className="prize">+{game.prize} credits</strong></> :
        <><h1>Game finished</h1><p>Winner: {game.players.find(p=>p.id===game.winnerId)?.displayName || "—"}</p></>}
      <p className="muted">Prize: 80% · Commission: 20%</p>
      <button className="primary full" onClick={()=>{setGame(null);setScreen("lobby")}}>Back to lobby</button>
    </section>}

    {screen==="wallet" && <Wallet user={user} onBack={()=>setScreen("lobby")} onRefresh={async()=>setUser(await api.getMe())}/>}
    {walletOpen && null}
  </main>
}

function Countdown({target}:{target?:string}) {
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(t)},[]);
  if(!target) return <span className="pill">Waiting</span>;
  const sec=Math.max(0,Math.ceil((new Date(target).getTime()-now)/1000));
  return <span className="timer">⏱ {sec}s</span>;
}

function BingoBoard({values,called,selected,onToggle,preview=false}:{values:number[];called:Set<number>;selected:Set<number>;onToggle:(n:number)=>void;preview?:boolean}) {
  return <div className="bingo-wrap">
    <div className="letters">{["B","I","N","G","O"].map(x=><b key={x}>{x}</b>)}</div>
    <div className="bingo-grid">{values.map((n,i)=>{
      const free=i===12;
      const marked=free || called.has(n) && selected.has(n);
      return <button key={i} disabled={preview||(!called.has(n)&&!free)} onClick={()=>onToggle(n)}
        className={`cell ${free?"free":""} ${called.has(n)?"called":""} ${marked?"marked":""}`}>
        {free?"FREE":n}
      </button>
    })}</div>
  </div>
}

function Wallet({user,onBack,onRefresh}:{user:User;onBack:()=>void;onRefresh:()=>Promise<void>}) {
  const [amount,setAmount]=useState(50);
  const [tx,setTx]=useState<any[]>([]);
  const load=()=>api.wallet().then(x=>setTx(x.transactions));
  useEffect(()=>{load()},[]);
  const act=async(type:"deposit"|"withdraw")=>{
    try {
      await (type==="deposit"?api.deposit(amount):api.withdraw(amount));
      await onRefresh(); await load();
    } catch(e:any) { alert(e.message); }
  };
  return <section>
    <button className="back" onClick={onBack}>← Back</button>
    <h2>Wallet</h2>
    <div className="wallet-balance"><span>Balance</span><strong>{user.balance} credits</strong></div>
    <input type="number" min="1" value={amount} onChange={e=>setAmount(Number(e.target.value))}/>
    <div className="wallet-actions"><button className="primary" onClick={()=>act("deposit")}>Demo deposit</button><button className="secondary" onClick={()=>act("withdraw")}>Demo withdraw</button></div>
    <p className="hint">Demo credits only. Connect a compliant payment provider before any real-money deployment.</p>
    <h3>Transactions</h3>
    <div className="transactions">{tx.map(t=><div className="tx" key={t.id}><span>{t.type}</span><strong>{t.amount>0?"+":""}{t.amount}</strong></div>)}</div>
  </section>
}

export default App;
