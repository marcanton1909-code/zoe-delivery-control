interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  LABRU_PIN: string;
}

const STATE_KEYS = [
  "products",
  "clients",
  "purchases",
  "entries",
  "sales",
  "outputs"
];

function cors(request: Request) {
  const origin =
    request.headers.get("Origin") || "";

  let allowedOrigin =
    "https://mackavi.pulsosolucion.com";

  if (
    origin === "https://mackavi.pulsosolucion.com" ||
    origin === "https://zoe-delivery-control.pages.dev" ||
    origin.endsWith(".zoe-delivery-control.pages.dev") ||
    origin === "http://localhost:5173" ||
    origin === "http://127.0.0.1:5173"
  ) {
    allowedOrigin = origin;
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods":
      "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type,X-LaBru-Pin",
    "Access-Control-Expose-Headers":
      "Content-Disposition",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}

function json(
  request: Request,
  body: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(body, null, 2),
    {
      status,
      headers: {
        ...cors(request),
        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
}

function isAuthorized(
  request: Request,
  env: Env
) {
  return (
    request.headers.get("X-LaBru-Pin")
    ===
    env.LABRU_PIN
  );
}

async function readState(env: Env) {

  const result =
    await env.DB
      .prepare(`
        SELECT
          key,
          data,
          updated_at
        FROM labru_state
        ORDER BY key
      `)
      .all();

  const state: Record<string, any> = {
    products: [],
    clients: [],
    purchases: [],
    entries: [],
    sales: [],
    outputs: []
  };

  let latest: string | null = null;

  for (const row of result.results as any[]) {

    try {
      state[row.key] =
        JSON.parse(row.data);
    } catch {
      state[row.key] = [];
    }

    if (
      row.updated_at &&
      (
        !latest ||
        String(row.updated_at) > latest
      )
    ) {
      latest =
        String(row.updated_at);
    }
  }

  const counts: Record<string, number> = {};

  for (const key of STATE_KEYS) {
    counts[key] =
      Array.isArray(state[key])
        ? state[key].length
        : 0;
  }

  return {
    state,
    counts,
    updatedAt: latest
  };
}

export default {

  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {

    try {

      const url =
        new URL(request.url);


      // =========================================
      // CORS
      // =========================================

      if (request.method === "OPTIONS") {

        return new Response(
          null,
          {
            status: 204,
            headers: cors(request)
          }
        );
      }


      // =========================================
      // HEALTH
      // =========================================

      if (url.pathname === "/health") {

        return json(
          request,
          {
            ok: true,
            service: "mackavi-la-bru-api",
            version: "2.1",
            hasDB: !!env.DB,
            hasR2: !!env.FILES,
            hasPin: !!env.LABRU_PIN
          }
        );
      }


      // =========================================
      // AUTH
      // =========================================

      if (!isAuthorized(request, env)) {

        return json(
          request,
          {
            ok: false,
            error: "Unauthorized"
          },
          401
        );
      }


      // =========================================
      // DEBUG D1
      // =========================================

      if (url.pathname === "/debug/d1") {

        if (!env.DB) {

          return json(
            request,
            {
              ok: false,
              error: "D1 binding DB is undefined"
            },
            500
          );
        }

        const test =
          await env.DB
            .prepare(`
              SELECT
                1 AS ok,
                datetime('now') AS current_time
            `)
            .first();

        const tables =
          await env.DB
            .prepare(`
              SELECT name
              FROM sqlite_master
              WHERE type='table'
              AND name LIKE 'labru_%'
              ORDER BY name
            `)
            .all();

        return json(
          request,
          {
            ok: true,
            d1: test,
            tables: tables.results
          }
        );
      }


      // =========================================
      // GET STATE
      // =========================================

      if (
        url.pathname === "/api/state" &&
        request.method === "GET"
      ) {

        const state =
          await readState(env);

        return json(
          request,
          {
            ok: true,
            ...state
          }
        );
      }


      // =========================================
      // PUT STATE
      // =========================================

      if (
        url.pathname === "/api/state" &&
        request.method === "PUT"
      ) {

        const body: any =
          await request.json();

        const incoming =
          body?.state || {};

        const now =
          new Date().toISOString();

        const statements = [];

        for (const key of STATE_KEYS) {

          if (!(key in incoming)) {
            continue;
          }

          statements.push(
            env.DB
              .prepare(`
                INSERT INTO labru_state (
                  key,
                  data,
                  updated_at
                )
                VALUES (?, ?, ?)

                ON CONFLICT(key)
                DO UPDATE SET
                  data = excluded.data,
                  updated_at = excluded.updated_at
              `)
              .bind(
                key,
                JSON.stringify(
                  incoming[key] ?? []
                ),
                now
              )
          );
        }

        if (statements.length) {

          await env.DB.batch(
            statements
          );
        }

        await env.DB
          .prepare(`
            INSERT INTO labru_sync_log (
              action,
              created_at
            )
            VALUES (?, ?)
          `)
          .bind(
            "state_sync",
            now
          )
          .run();

        return json(
          request,
          {
            ok: true,
            ...(await readState(env))
          }
        );
      }


      // =========================================
      // FILE UPLOAD
      // =========================================

      if (
        url.pathname === "/api/file" &&
        request.method === "POST"
      ) {

        const form =
          await request.formData();

        const file =
          form.get("file");

        if (
          !file ||
          typeof file === "string"
        ) {

          return json(
            request,
            {
              ok: false,
              error: "File required"
            },
            400
          );
        }

        const id =
          crypto.randomUUID();

        const key =
          `labru/${id}`;

        await env.FILES.put(
          key,
          file.stream(),
          {
            httpMetadata: {
              contentType:
                file.type ||
                "application/octet-stream"
            },

            customMetadata: {
              name: file.name
            }
          }
        );

        return json(
          request,
          {
            ok: true,
            id,
            name: file.name
          }
        );
      }


      // =========================================
      // FILE GET
      // =========================================

      if (
        url.pathname.startsWith(
          "/api/file/"
        ) &&
        request.method === "GET"
      ) {

        const id =
          url.pathname
            .slice(
              "/api/file/".length
            )
            .trim();

        const object =
          await env.FILES.get(
            `labru/${id}`
          );

        if (!object) {

          return json(
            request,
            {
              ok: false,
              error: "File not found"
            },
            404
          );
        }

        const headers =
          new Headers(
            cors(request)
          );

        object.writeHttpMetadata(
          headers
        );

        const fileName =
          object.customMetadata?.name ||
          "factura";

        headers.set(
          "Content-Disposition",
          `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`
        );

        return new Response(
          object.body,
          {
            headers
          }
        );
      }


      return json(
        request,
        {
          ok: false,
          error: "Not found"
        },
        404
      );


    } catch (error: any) {

      console.error(
        "LA BRU WORKER ERROR:",
        error
      );

      /*
        Ahora Cloudflare NO devolverá solamente 1101.
        Veremos el error exacto en JSON.
      */

      return json(
        request,
        {
          ok: false,
          error:
            error?.message ||
            String(error),

          name:
            error?.name || null,

          stack:
            error?.stack || null
        },
        500
      );
    }
  }
};
