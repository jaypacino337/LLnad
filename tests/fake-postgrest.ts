/**
 * In-memory stand-in for Supabase's PostgREST, covering exactly the calls
 * src/lib/supabase.ts makes: select by key / ordered list, insert with
 * on_conflict ignore-duplicates, and PATCH guarded by `version=eq.N`.
 * Every request yields to the event loop first, so concurrent read-modify-
 * write cycles genuinely interleave and the optimistic lock gets exercised.
 */

type Row = { data: unknown; version: number; created_at: string; [key: string]: unknown };

export function fakePostgrest(keyColumns: Record<string, string>) {
  const tables = new Map<string, Map<string, Row>>();
  const table = (name: string) => {
    if (!keyColumns[name]) throw new Error(`unexpected table ${name}`);
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  };
  let requests = 0;
  let conflicts = 0;

  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests++;
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
    const url = new URL(String(input));
    const auth = new Headers(init?.headers).get("authorization");
    if (auth !== "Bearer service-key") return new Response("bad key", { status: 401 });
    const name = url.pathname.replace(/^\/rest\/v1\//, "");
    const rows = table(name);
    const keyColumn = keyColumns[name];
    const keyFilter = url.searchParams.get(keyColumn)?.replace(/^eq\./, "");
    const method = init?.method ?? "GET";
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

    if (method === "GET") {
      const selected = keyFilter !== undefined ? [rows.get(keyFilter)].filter(Boolean) : [...rows.values()];
      const columns = (url.searchParams.get("select") ?? "data").split(",");
      return json(selected.map((row) => Object.fromEntries(columns.map((c) => [c, structuredClone(row![c])]))));
    }
    if (method === "POST") {
      const body = JSON.parse(String(init?.body)) as Row;
      const key = String(body[keyColumn]);
      if (!rows.has(key)) rows.set(key, { ...body, created_at: new Date().toISOString() });
      return new Response("", { status: 201 });
    }
    if (method === "PATCH") {
      const expected = Number(url.searchParams.get("version")?.replace(/^eq\./, ""));
      const row = keyFilter !== undefined ? rows.get(keyFilter) : undefined;
      if (!row || row.version !== expected) {
        conflicts++;
        return json([]);
      }
      Object.assign(row, JSON.parse(String(init?.body)));
      return json([row]);
    }
    return new Response("unsupported", { status: 405 });
  }) as typeof fetch;

  return {
    fetchImpl,
    row: (name: string, key: string) => table(name).get(key),
    stats: () => ({ requests, conflicts }),
  };
}

/** Points the app's Supabase switch at a fake and swaps global fetch for it. */
export function installFakeSupabase(fake: ReturnType<typeof fakePostgrest>) {
  const realFetch = globalThis.fetch;
  process.env.SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  globalThis.fetch = fake.fetchImpl;
  return () => {
    globalThis.fetch = realFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  };
}
