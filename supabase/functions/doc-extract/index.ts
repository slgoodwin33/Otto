// doc-extract: reads a document photo or PDF and returns structured fields + full text for search. Owner sign-in required.
import { requireOwner, json, cors, errMessage, errStatus, HttpError } from "./common.ts";

const MODEL = Deno.env.get("OTTO_MODEL") ?? "claude-sonnet-5-5";
const KINDS = ["license", "registration", "insurance", "passport", "id", "warranty", "lease", "certificate", "medical", "other"];
const TAGS = ["IDs", "Car", "Home", "Health", "Money & taxes", "School", "Warranties & manuals", "Work"];
const TOOL = {
  name: "save_document",
  description: "Structured fields read from the document.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Short human title, e.g. 'Massachusetts driver's license', 'Dishwasher warranty (Bosch)'" },
      kind: { type: "string", enum: KINDS },
      issuer: { type: "string", description: "Who issued it (agency, company, school)" },
      issued_on: { type: "string", description: "YYYY-MM-DD or empty" },
      expires_on: { type: "string", description: "YYYY-MM-DD or empty" },
      number_last4: { type: "string", description: "ONLY the last 4 characters of the main ID/policy/serial number, letters or digits; empty if none. Never the full number." },
      tags: { type: "array", items: { type: "string", enum: TAGS } },
      content: { type: "string", description: "All readable text on the document, in reading order, for search. Replace any full ID, account, card or social security number with only its last 4 characters preceded by '••••'." },
    },
    required: ["name", "kind", "tags", "content"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    await requireOwner(req);
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new HttpError(503, "ANTHROPIC_API_KEY is not set");
    const body = await req.json().catch(() => ({}));
    const mt = String(body.media_type || "");
    if (!body.data || !mt) throw new HttpError(400, "Send media_type and base64 data");
    const block = mt === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: String(body.data) } }
      : { type: "image", source: { type: "base64", media_type: mt, data: String(body.data) } };
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 4000, tools: [TOOL], tool_choice: { type: "tool", name: "save_document" },
        messages: [{ role: "user", content: [block, { type: "text", text: "Read this document for Samuel's private document vault and call save_document. Dates as YYYY-MM-DD. Pick every tag that fits." }] }],
      }),
    });
    const out = await r.json();
    if (!r.ok) throw new HttpError(502, `AI request failed: ${out?.error?.message ?? r.status}`);
    const tu = (out.content ?? []).find((c: any) => c.type === "tool_use");
    if (!tu) throw new HttpError(502, "No fields came back");
    const f = tu.input ?? {};
    // belt and braces: keep only the last 4 characters of any number field
    const last4 = String(f.number_last4 ?? "").replace(/[^A-Za-z0-9]/g, "").slice(-4);
    const date = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : null;
    return json(req, {
      name: String(f.name ?? "Document").slice(0, 200), kind: KINDS.includes(f.kind) ? f.kind : "other",
      issuer: f.issuer ? String(f.issuer).slice(0, 200) : null, issued_on: date(f.issued_on), expires_on: date(f.expires_on),
      number_last4: last4 || null, tags: (Array.isArray(f.tags) ? f.tags : []).filter((t: string) => TAGS.includes(t)),
      content: String(f.content ?? "").slice(0, 60000),
    });
  } catch (e) {
    return json(req, { error: errMessage(e) }, errStatus(e));
  }
});
