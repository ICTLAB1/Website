// Runs inside the app container (`docker compose exec -T app node - < check-meta.mjs`).
// Confirms the running server has META_CAPI_TOKEN and that Meta accepts it for
// the dataset, by reading the dataset's name. Sends no events. Prints the
// token's length and Meta's status, never the token.
const token = process.env.META_CAPI_TOKEN ?? "";
if (!token) {
  console.log("META_CAPI_TOKEN: NOT SET in the running container");
  process.exit(3);
}
console.log(`META_CAPI_TOKEN: set in the running container (${token.length} characters)`);

const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1143158141004040";
try {
  const response = await fetch(`https://graph.facebook.com/v21.0/${pixel}?fields=name`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  const body = await response.json().catch(() => ({}));
  if (response.ok) console.log(`Meta accepted the token for dataset ${pixel} ("${body.name ?? "?"}")`);
  else console.log(`Meta answered ${response.status}: ${String(body?.error?.message ?? "no detail").slice(0, 200)}`);
} catch (error) {
  console.log(`Could not reach Meta from the container: ${error instanceof Error ? error.message : error}`);
}
