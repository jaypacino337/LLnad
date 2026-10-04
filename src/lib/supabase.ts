/**
 * Supabase over its REST API (PostgREST): no SDK dependency, server-only.
 *
 * Ported from memcoinz `.claude/skills/launchpad-site/preset-seats/lib/store.supabase.ts`
 * and generalised to "a table of versioned jsonb documents", which both the city
 * store and the seat registry use. Schema: supabase/schema.sql (RLS on, no
 * public policies, so only the service-role key used here can read or write).
 *
 * Concurrency: every row has a `version`. update() reads (data, version),
 * applies the change, and writes only `WHERE version = <read version>`. If
 * another instance won the race, 0 rows change, so it re-reads and retries:
 * no lost writes across any number of serverless instances.
 */

export interface SupabaseEnv {
  url: string;
  serviceKey: string;
}

/** SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or null (→ file backends). */
export function supabaseEnv(): SupabaseEnv | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? { url, serviceKey } : null;
}

export type Rest = <T>(path: string, init?: RequestInit & { prefer?: string }) => Promise<T>;

export function supabaseRest(env: SupabaseEnv, fetchImpl: typeof fetch = fetch): Rest {
  const base = `${env.url.replace(/\/$/, "")}/rest/v1`;
  return async function rest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
    const { prefer, ...rest } = init;
    const res = await fetchImpl(`${base}${path}`, {
      ...rest,
      headers: {
        apikey: env.serviceKey,
        authorization: `Bearer ${env.serviceKey}`,
        "content-type": "application/json",
        ...(prefer ? { prefer } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(
        `Supabase ${init.method ?? "GET"} ${path.split("?")[0]} → ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  };
}

const MAX_RETRIES = 8;

/**
 * A table shaped `(<keyColumn> text pk, data jsonb, version int, updated_at)`.
 * Keys are URL-encoded; callers validate their shape.
 */
export function versionedDocs<D>(rest: Rest, table: string, keyColumn: string) {
  const enc = encodeURIComponent;
  return {
    async list(order = "created_at.desc"): Promise<D[]> {
      const rows = await rest<{ data: D }[]>(`/${table}?select=data&order=${order}`);
      return rows.map((row) => row.data);
    },

    async get(key: string): Promise<D | null> {
      const rows = await rest<{ data: D }[]>(`/${table}?select=data&${keyColumn}=eq.${enc(key)}`);
      return rows[0]?.data ?? null;
    },

    /** Insert if absent (idempotent: an existing row wins). */
    async insert(key: string, data: D): Promise<void> {
      await rest(`/${table}?on_conflict=${keyColumn}`, {
        method: "POST",
        prefer: "resolution=ignore-duplicates,return=minimal",
        body: JSON.stringify({ [keyColumn]: key, data, version: 0 }),
      });
    },

    /**
     * Atomic read-modify-write. `fn` mutates the document and returns
     * `{ value, write }`; with `write: false` nothing is written (no version
     * bump). Throws "Unknown key" when the row is missing.
     */
    async update<T>(key: string, fn: (doc: D) => { value: T; write: boolean }): Promise<T> {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const rows = await rest<{ data: D; version: number }[]>(
          `/${table}?select=data,version&${keyColumn}=eq.${enc(key)}`,
        );
        if (!rows[0]) throw new Error("Unknown key");
        const { data: doc, version } = rows[0];
        const { value, write } = fn(doc);
        if (!write) return value;
        const written = await rest<unknown[]>(`/${table}?${keyColumn}=eq.${enc(key)}&version=eq.${version}`, {
          method: "PATCH",
          prefer: "return=representation",
          body: JSON.stringify({ data: doc, version: version + 1, updated_at: new Date().toISOString() }),
        });
        if (written.length === 1) return value;
        // Lost the race: someone else wrote first. Back off a little, retry on fresh data.
        await new Promise((resolve) => setTimeout(resolve, 15 + Math.random() * 40 * (attempt + 1)));
      }
      throw new Error("Busy: too many simultaneous updates, try again");
    },
  };
}
