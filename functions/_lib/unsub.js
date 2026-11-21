// Shared by the hub (to sign the link in every email) and the unsubscribe endpoint (to check it).
const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
export async function unsubKey(db) {
  let k = await db.prepare("SELECT v FROM secrets WHERE k = 'unsub_key'").first("v");
  if (!k) {
    k = hex(crypto.getRandomValues(new Uint8Array(32)));
    await db.prepare("INSERT OR IGNORE INTO secrets (k, v, updated) VALUES ('unsub_key', ?, ?)").bind(k, Date.now()).run();
    k = await db.prepare("SELECT v FROM secrets WHERE k = 'unsub_key'").first("v");
  }
  return k;
}
export async function unsubToken(db, email) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(await unsubKey(db)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(email).trim().toLowerCase()))).slice(0, 32);
}

