interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  LABRU_PIN: string;
}

const ALLOWED_ORIGINS = [
  "https://mackavi.pulsosolucion.com",
  "https://zoe-delivery-control.pages.dev",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

function cors(request: Request) {
  const origin = request.headers.get("Origin") || "";

  const allowed =
    ALLOWED_ORIGINS.includes(origin)
      ? origin
      : "https://mackavi.pulsosolucion.com";

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-LaBru-Pin",
    "Access-Control-Expose-Headers": "Content-Disposition",
    "Vary": "Origin"
  };
}

function json(
  request: Request,
  data: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...cors(request),
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

function authorized(request: Request, env: Env) {
  return (
    request.headers.get("X-LaBru-Pin")
    === env.LABRU_PIN
  );
}

async function ensureSchema(env: Env) {
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS labru_state (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS labru_sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {

    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors(request)
      });
    }

    if (url.pathname === "/health") {
      return json(request, {
        ok: true,
        service: "mackavi-la-bru-api"
      });
    }

    if (!authorized(request, env)) {
      return json(
        request,
        { error: "Unauthorized" },
        401
      );
    }

    await ensureSchema(env);


    // ==========================================
    // SNAPSHOT COMPLETO
    // ==========================================

    if (
      url.pathname === "/api/state"
      &&
      request.method === "GET"
    ) {

      const result = await env.DB
        .prepare(`
          SELECT key, data, updated_at
          FROM labru_state
        `)
        .all();

      const state: Record<string, unknown> = {};

      let latestUpdatedAt: string | null = null;

      for (const row of result.results as any[]) {
        try {
          state[row.key] = JSON.parse(row.data);
        } catch {
          state[row.key] = [];
        }

        if (
          !latestUpdatedAt
          ||
          row.updated_at > latestUpdatedAt
        ) {
          latestUpdatedAt = row.updated_at;
        }
      }

      return json(request, {
        state,
        updatedAt: latestUpdatedAt
      });
    }


    if (
      url.pathname === "/api/state"
      &&
      request.method === "PUT"
    ) {

      const body: any =
        await request.json();

      const state =
        body?.state || {};

      const allowedKeys = [
        "products",
        "clients",
        "purchases",
        "entries",
        "sales",
        "outputs"
      ];

      const statements = [];

      for (const key of allowedKeys) {

        if (!(key in state)) {
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
              VALUES (
                ?,
                ?,
                CURRENT_TIMESTAMP
              )
              ON CONFLICT(key)
              DO UPDATE SET
                data = excluded.data,
                updated_at = CURRENT_TIMESTAMP
            `)
            .bind(
              key,
              JSON.stringify(state[key] ?? [])
            )
        );
      }

      if (statements.length) {
        await env.DB.batch(statements);
      }

      await env.DB
        .prepare(`
          INSERT INTO labru_sync_log (action)
          VALUES ('state_sync')
        `)
        .run();

      return json(request, {
        ok: true
      });
    }


    // ==========================================
    // ARCHIVOS R2
    // ==========================================

    if (
      url.pathname === "/api/file"
      &&
      request.method === "POST"
    ) {

      const form =
        await request.formData();

      const file =
        form.get("file");

      if (
        !file
        ||
        typeof file === "string"
      ) {
        return json(
          request,
          { error: "File required" },
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
              file.type
              ||
              "application/octet-stream"
          },
          customMetadata: {
            name: file.name
          }
        }
      );

      return json(request, {
        ok: true,
        id,
        name: file.name
      });
    }


    if (
      url.pathname.startsWith("/api/file/")
      &&
      request.method === "GET"
    ) {

      const id =
        url.pathname
          .replace("/api/file/", "")
          .trim();

      if (!id) {
        return json(
          request,
          { error: "Invalid file id" },
          400
        );
      }

      const object =
        await env.FILES.get(
          `labru/${id}`
        );

      if (!object) {
        return json(
          request,
          { error: "File not found" },
          404
        );
      }

      const headers =
        new Headers(
          cors(request)
        );

      object.writeHttpMetadata(headers);

      headers.set(
        "Cache-Control",
        "private, no-store"
      );

      const name =
        object.customMetadata?.name
        ||
        "factura";

      headers.set(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(name)}`
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
      { error: "Not found" },
      404
    );
  }
};
