// stand-in for supabase-js in tests: every query resolves to empty data; rpc calls are recorded
function q(){ const p = Promise.resolve({ data: [], error: null }); const h = { get(t, k){ if(k === 'then') return p.then.bind(p); if(k === 'catch') return p.catch.bind(p); return () => new Proxy({}, h); } }; return new Proxy({}, h); }
export const rpcCalls = []; globalThis.__rpcCalls = rpcCalls;
export function createClient(){ return { from: () => q(),
  rpc: async (name, args) => { rpcCalls.push([name, args]); return name === 'chat_apply' ? { data: { ok: true, action_id: 42, summary: `did ${args.p_tool}` }, error: null } : { data: { ok: true }, error: null }; },
  auth: { getUser: async () => ({ data: { user: { email: 'slgoodwin33@gmail.com' } }, error: null }) } }; }
