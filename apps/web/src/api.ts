const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

let token = localStorage.getItem("vamios_token") || "";

export function setToken(t:string) {
  token = t;
  localStorage.setItem("vamios_token", t);
}

async function request(path:string, init:RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type","application/json");
  if (token) headers.set("Authorization",`Bearer ${token}`);
  const res = await fetch(`${API}${path}`, {...init,headers});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export async function login() {
  const tg = (window as any).Telegram?.WebApp;
  const initData = tg?.initData || "";
  const body = initData ? {initData} : {demo:true};
  const data = await request("/api/auth/telegram", {
    method:"POST", body:JSON.stringify(body)
  });
  setToken(data.token);
  return data.user;
}
export const getMe = () => request("/api/me");
export const getLobby = () => request("/api/lobby");
export const createGame = (stake:number,boardId:number) =>
  request("/api/games",{method:"POST",body:JSON.stringify({stake,boardId})});
export const getGame = (id:string) => request(`/api/games/${id}`);
export const mark = (id:string,number:number) =>
  request(`/api/games/${id}/mark`,{method:"POST",body:JSON.stringify({number})});
export const bingo = (id:string) =>
  request(`/api/games/${id}/bingo`,{method:"POST",body:"{}"});
export const wallet = () => request("/api/wallet");
export const deposit = (amount:number) =>
  request("/api/wallet/deposit",{method:"POST",body:JSON.stringify({amount})});
export const withdraw = (amount:number) =>
  request("/api/wallet/withdraw",{method:"POST",body:JSON.stringify({amount})});

export function wsUrl(gameId:string) {
  const base = API.replace(/^http/,"ws");
  return `${base}/ws?gameId=${encodeURIComponent(gameId)}`;
}
