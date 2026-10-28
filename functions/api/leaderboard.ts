// Cloudflare Pages Functions: /api/leaderboard

export interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any>;
  put(key: string, value: string | ArrayBuffer | ReadableStream): Promise<void>;
}

export interface PagesFunctionContext<E = any> {
  request: Request;
  env: E;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, unknown>;
}

interface Env {
  LEADERBOARD_KV?: KVNamespace;
}

interface ScoreRecord {
  id: string;
  name: string;
  score: number;
  date: string;
  rank?: number;
}

// In-memory cache fallback for edge worker instances
let memoryLeaderboard: ScoreRecord[] = [
  { id: '1', name: 'CyberViper', score: 28500, date: '2026-10-28', rank: 1 },
  { id: '2', name: 'NovaPilot', score: 21400, date: '2026-10-28', rank: 2 },
  { id: '3', name: 'EchoRunner', score: 18200, date: '2026-10-27', rank: 3 },
  { id: '4', name: 'GlitchMaster', score: 14500, date: '2026-10-27', rank: 4 },
  { id: '5', name: 'GhostRider', score: 11000, date: '2026-10-26', rank: 5 },
];

export async function onRequestGet(context: PagesFunctionContext<Env>): Promise<Response> {
  const { env } = context;

  if (env.LEADERBOARD_KV) {
    try {
      const data = await env.LEADERBOARD_KV.get('top_scores', { type: 'json' });
      if (Array.isArray(data)) {
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    } catch (e) {
      console.error('KV Read Error:', e);
    }
  }

  return new Response(JSON.stringify(memoryLeaderboard), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export async function onRequestPost(context: PagesFunctionContext<Env>): Promise<Response> {
  const { request, env } = context;

  try {
    const body = (await request.json()) as { name?: string; score?: number };
    const rawName = typeof body.name === 'string' ? body.name.trim() : 'Anonymous';
    const cleanName = (rawName || 'Anonymous').slice(0, 16);
    const score = typeof body.score === 'number' && !isNaN(body.score) ? Math.max(0, Math.floor(body.score)) : 0;

    const newRecord: ScoreRecord = {
      id: Math.random().toString(36).substring(2, 9),
      name: cleanName,
      score,
      date: new Date().toISOString().split('T')[0],
    };

    let list = memoryLeaderboard;
    if (env.LEADERBOARD_KV) {
      const kvData = await env.LEADERBOARD_KV.get('top_scores', { type: 'json' });
      if (Array.isArray(kvData)) list = kvData;
    }

    list.push(newRecord);
    list.sort((a, b) => b.score - a.score);
    const top10 = list.slice(0, 10).map((item, index) => ({ ...item, rank: index + 1 }));

    if (env.LEADERBOARD_KV) {
      await env.LEADERBOARD_KV.put('top_scores', JSON.stringify(top10));
    }
    memoryLeaderboard = top10;

    return new Response(JSON.stringify(top10), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
