import { createClient } from "npm:@supabase/supabase-js@2.45.4";

export const OWNER_EMAIL = "slgoodwin33@gmail.com";
const PLAID_ENV = Deno.env.get("PLAID_ENV") ?? "sandbox";
export const PLAID_BASE = `https://${PLAID_ENV}.plaid.com`;

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const ALLOWED_ORIGINS = ["https://slgoodwin33.github.io", "http://localhost:8765"];
export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-sync-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

/** The signed-in user must be the owner. Returns the user. */
export async function requireOwner(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Sign in required");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Sign in required");
  if ((data.user.email ?? "").toLowerCase() !== OWNER_EMAIL) throw new HttpError(403, "Not allowed");
  return data.user;
}

/** Call a Plaid endpoint. Throws a readable error with Plaid's error_code. */
export async function plaid<T = any>(path: string, body: Record<string, unknown>): Promise<T> {
  const client_id = Deno.env.get("PLAID_CLIENT_ID"), secret = Deno.env.get("PLAID_SECRET");
  if (!client_id || !secret) throw new HttpError(500, "PLAID_CLIENT_ID / PLAID_SECRET secrets are not set");
  const res = await fetch(PLAID_BASE + path, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id, secret, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new HttpError(502, `Plaid ${path}: ${data.error_code ?? res.status} ${data.error_message ?? ""}`.trim());
  return data as T;
}

/** Next sequential code for tables that still compute codes by prefix (AC-, BS-). */
export async function nextCode(table: string, prefix: string): Promise<string> {
  const { data } = await admin.from(table).select("code").like("code", `${prefix}-%`).order("code", { ascending: false }).limit(1);
  const n = data && data.length ? parseInt(data[0].code.split("-")[1], 10) + 1 : 1;
  return `${prefix}-${String(n).padStart(5, "0")}`;
}

export function errMessage(e: unknown): string { return e instanceof Error ? e.message : String(e); }
export function errStatus(e: unknown): number { return e instanceof HttpError ? e.status : 500; }
