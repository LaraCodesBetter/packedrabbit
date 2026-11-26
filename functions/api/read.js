// The Packed Rabbit: read a photo (owner, 26 Nov 2026: "take the work out of the users' hands and put it into the AI").
// The app sends one photo only when the person taps "Read this photo" and has said yes once. This passes it to Claude,
// returns what Claude read, and keeps nothing: no photo, no answer, no name. The only thing written is a count per phone
// per day, so one phone can't run up the bill. The key is the owner's, pasted into the hub, kept in the private
// secrets table and never returned. With no key saved, every call answers { on: false } and the button stays hidden.
const DAY_PER_PHONE = 120;     // reads per phone per day
const DAY_ALL = 4000;          // reads per day across everyone, a ceiling on the bill
const MODEL_QUICK = "claude-haiku-5-5", MODEL_CAREFUL = "claude-sonnet-5-5";

const PROMPTS = {
  box: `This is a photo of the inside of a moving or storage box, taken before it was taped shut. List the things you can see, the way a person would write them on a box list: plain everyday names, a count when there is more than one ("4 mugs"), most visible first. Leave out the box itself, packing paper and bubble wrap. If you can't tell what something is, leave it out rather than guess.
Reply with JSON only: {"items": ["..."], "fragile": true or false}`,
  furniture: `This is a photo of a piece of furniture or a large household item someone is moving. Identify it as specifically as you honestly can.
Reply with JSON only: {"name": plain name, "make": brand if a logo, label or truly distinctive design makes you reasonably sure, else "", "model": model or line if reasonably sure, else "", "size": typical width x depth x height in inches for this kind of piece, as "W x D x H", "value": a rough price range new in US dollars, like "$800 to $1,200", "confident": true or false}`,
  quote: `This is a photo of a moving company's quote, estimate or contract. Copy out all of its text, line by line, exactly as written, including the company name, USDOT and MC numbers, prices, fees, deposit, dates, estimate type and coverage. Don't summarize and don't add anything.
Reply with JSON only: {"text": "..."}`,
  listing: `This is a screenshot or photo of a rental or for-sale home listing. Copy out what it says.
Reply with JSON only: {"address": "", "price": "", "deposit": "", "fees": "", "beds": "", "baths": "", "pets": "", "rooms": [room names and sizes as written], "contact": how the listing asks to be contacted or paid, "text": all the listing's words}`,
};

const reply = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" } });

async function keyOf(db) { try { return db ? await db.prepare("SELECT v FROM secrets WHERE k = 'anthropic_read'").first("v") : null; } catch (e) { return null; } }

export async function onRequestGet({ env }) {
  return reply({ on: !!(await keyOf(env.HUB)) });
}

export async function onRequestPost({ request, env }) {
  const db = env.HUB, key = await keyOf(db);
  if (!key) return reply({ on: false, why: "Reading photos isn't switched on yet." }, 503);
  let b; try { b = await request.json(); } catch (e) { return reply({ error: "bad_request" }, 400); }
  const kind = String(b.kind || ""), prompt = PROMPTS[kind];
  const who = String(b.who || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 40);
  const m = String(b.image || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!prompt || !who || !m) return reply({ error: "bad_request" }, 400);
  if (m[2].length > 2_000_000) return reply({ error: "too_big", why: "That photo is too large to read." }, 413);

  const day = new Date().toISOString().slice(0, 10);
  await db.prepare("CREATE TABLE IF NOT EXISTS reads (day TEXT, who TEXT, n INTEGER, PRIMARY KEY (day, who))").run();
  const mine = (await db.prepare("SELECT n FROM reads WHERE day = ? AND who = ?").bind(day, who).first("n")) || 0;
  const all = (await db.prepare("SELECT SUM(n) AS t FROM reads WHERE day = ?").bind(day).first("t")) || 0;
  if (mine >= DAY_PER_PHONE || all >= DAY_ALL) return reply({ error: "limit", why: "That's all the photos it can read today. Type this one in, and it reads again tomorrow." }, 429);
  await db.prepare("INSERT INTO reads (day, who, n) VALUES (?, ?, 1) ON CONFLICT(day, who) DO UPDATE SET n = n + 1").bind(day, who).run();

  const careful = kind === "quote" || kind === "listing";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: careful ? MODEL_CAREFUL : MODEL_QUICK,
      max_tokens: careful ? 3000 : 600,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
        { type: "text", text: prompt },
      ] }],
    }),
  });
  if (!r.ok) return reply({ error: "ai_" + r.status, why: "The rabbit couldn't read that one. You can type it in." }, 502);
  const j = await r.json();
  const text = ((j.content || []).find((c) => c.type === "text") || {}).text || "";
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  let out = null; try { out = JSON.parse(text.slice(s, e + 1)); } catch (x) {}
  if (!out) return reply({ error: "unreadable", why: "The rabbit couldn't read that one. You can type it in." }, 502);
  return reply({ ok: true, kind, read: out });
}
