const API="https://vamios-api.onrender.com";
export async function health(){const r=await fetch(`${API}/health`);return r.json()}
export async function createGame(stake:number,boardId:number,userId:string,displayName:string){const r=await fetch(`${API}/api/games`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({stake,boardId,userId,displayName})});if(!r.ok)throw new Error(await r.text());return r.json()}
export async function getGame(id:string){const r=await fetch(`${API}/api/games/${id}`);if(!r.ok)throw new Error("Game not found");return r.json()}
export async function mark(id:string,userId:string,index:number){const r=await fetch(`${API}/api/games/${id}/mark`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({userId,index})});if(!r.ok)throw new Error(await r.text());return r.json()}
export async function bingo(id:string,userId:string){const r=await fetch(`${API}/api/games/${id}/bingo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({userId})});if(!r.ok)throw new Error(await r.text());return r.json()}
