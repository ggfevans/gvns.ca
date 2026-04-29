// GitHub auth proxy for Sveltia CMS.
//
// Backed by a GitHub App (not an OAuth App). The web flow is identical —
// /login/oauth/authorize → /login/oauth/access_token — but App tokens have
// two differences from OAuth App tokens:
//
//   1. No `scope` param on /authorize. App permissions are fixed at App
//      definition; passing `scope` is rejected.
//   2. With "Expire user authorization tokens" enabled on the App, the
//      token exchange returns `refresh_token` + `expires_in` alongside
//      `access_token`. Sveltia handles refresh client-side, so we pass
//      those through in the success postMessage and expose a /refresh
//      endpoint for renewals.
//
// No private key / JWT plumbing is needed here: Sveltia uses user-to-server
// tokens, which are minted from client_id + client_secret + code. The App's
// private key is only required for minting *installation* tokens (no human),
// which we don't do.

export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  AUTH_ALLOWED_ORIGINS: string; // comma-separated, e.g. "https://gvns.ca,https://chore-247.gvns-ca.<account>.workers.dev"
}

const STATE_COOKIE = "sveltia_oauth_state";
// Cap GitHub token-exchange to keep us comfortably under the Workers CPU limit.
const TOKEN_EXCHANGE_TIMEOUT_MS = 8000;

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

function parseOrigins(env: Env): string[] {
  return env.AUTH_ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
}

function pickOrigin(referer: string | null, allowed: string[]): string | null {
  if (!referer) return null;
  try {
    const refOrigin = new URL(referer).origin;
    return allowed.includes(refOrigin) ? refOrigin : null;
  } catch {
    return null;
  }
}

// Token-bearing HTML: never cache. SameSite/HttpOnly handled at the cookie layer.
function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function jsonResponse(body: unknown, init: { status?: number; origin?: string } = {}): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (init.origin) headers["Access-Control-Allow-Origin"] = init.origin;
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

function postMessageHTML(targetOrigin: string, status: "success" | "error", payload: unknown): string {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  return `<!DOCTYPE html><html><body><script>
    (function(){
      function send(){ window.opener && window.opener.postMessage(${JSON.stringify(message)}, ${JSON.stringify(targetOrigin)}); }
      window.addEventListener("message", function(e){ if (e.data === "authorizing:github") send(); }, false);
      send();
    })();
  </script></body></html>`;
}

// Emit an OAuth error. If we can't safely identify a target origin (e.g. the
// allowlist is empty or the cookie was tampered with), refuse outright instead
// of falling back to "*" — that fallback would let any popup-opener page
// receive the postMessage.
function originErrorResponse(targetOrigin: string | null, allowed: string[], message: string): Response {
  if (targetOrigin && allowed.includes(targetOrigin)) {
    return htmlResponse(postMessageHTML(targetOrigin, "error", { message }));
  }
  if (allowed[0]) {
    return htmlResponse(postMessageHTML(allowed[0], "error", { message }));
  }
  return new Response("Origin not allowed", {
    status: 400,
    headers: { "Cache-Control": "no-store" },
  });
}

async function exchangeWithGithub(body: Record<string, string>): Promise<TokenResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_EXCHANGE_TIMEOUT_MS);
  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { error: `Token endpoint returned ${res.status}` };
    }
    return (await res.json()) as TokenResponse;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Token exchange aborted (timeout)" };
    }
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `Token exchange failed: ${detail}` };
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const allowed = parseOrigins(env);

    if (url.pathname === "/auth") {
      const origin = pickOrigin(request.headers.get("Referer"), allowed) ?? allowed[0];
      if (!origin) {
        return new Response("Origin not allowed", {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        });
      }
      const state = crypto.randomUUID();
      const cookieValue = `${state}|${encodeURIComponent(origin)}`;
      // GitHub Apps: no `scope` — permissions are baked into the App definition.
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: `${url.origin}/callback`,
        state,
      });
      return new Response(null, {
        status: 302,
        headers: {
          Location: `https://github.com/login/oauth/authorize?${params}`,
          "Set-Cookie": `${STATE_COOKIE}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const cookie = (request.headers.get("Cookie") || "")
        .split(";").map((s) => s.trim())
        .find((c) => c.startsWith(`${STATE_COOKIE}=`))?.split("=")[1] || "";
      const [cookieState, cookieOriginEnc] = cookie.split("|");

      // Malformed percent-encoding crashes decodeURIComponent. Treat any
      // decode failure as "no valid origin" so the error path fires cleanly.
      let targetOrigin: string | null = null;
      try {
        targetOrigin = decodeURIComponent(cookieOriginEnc || "");
      } catch {
        targetOrigin = null;
      }

      if (!targetOrigin || !allowed.includes(targetOrigin)) {
        return originErrorResponse(targetOrigin, allowed, "Origin not allowed");
      }
      if (!code || !state || state !== cookieState) {
        return htmlResponse(postMessageHTML(targetOrigin, "error", { message: "Invalid state" }));
      }

      const data = await exchangeWithGithub({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        redirect_uri: `${url.origin}/callback`,
        code,
      });

      if (!data.access_token) {
        return htmlResponse(
          postMessageHTML(targetOrigin, "error", {
            message: data.error_description || data.error || "No token",
          }),
        );
      }

      // Pass through refresh_token + expiries so Sveltia can refresh
      // user-to-server tokens client-side (App "Expire tokens" enabled).
      const successPayload: Record<string, unknown> = {
        token: data.access_token,
        provider: "github",
      };
      if (data.refresh_token) successPayload.refresh_token = data.refresh_token;
      if (typeof data.expires_in === "number") successPayload.expires_in = data.expires_in;
      if (typeof data.refresh_token_expires_in === "number") {
        successPayload.refresh_token_expires_in = data.refresh_token_expires_in;
      }
      if (data.token_type) successPayload.token_type = data.token_type;

      return htmlResponse(postMessageHTML(targetOrigin, "success", successPayload));
    }

    // Refresh endpoint: Sveltia POSTs the refresh_token here when the
    // access_token nears expiry. We forward to GitHub's token endpoint.
    if (url.pathname === "/refresh") {
      const origin = request.headers.get("Origin");
      const originOk = origin !== null && allowed.includes(origin);

      if (request.method === "OPTIONS") {
        if (!originOk) return new Response(null, { status: 403 });
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
          },
        });
      }

      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }
      if (!originOk) {
        return jsonResponse({ error: "Origin not allowed" }, { status: 403 });
      }
      // After the originOk guard above, `origin` is guaranteed non-null.
      const allowedOrigin: string = origin;

      let body: { refresh_token?: unknown };
      try {
        body = (await request.json()) as { refresh_token?: unknown };
      } catch {
        return jsonResponse({ error: "Invalid JSON" }, { status: 400, origin: allowedOrigin });
      }

      if (typeof body.refresh_token !== "string" || !body.refresh_token) {
        return jsonResponse({ error: "Missing refresh_token" }, { status: 400, origin: allowedOrigin });
      }

      const data = await exchangeWithGithub({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: body.refresh_token,
      });

      if (data.error || !data.access_token) {
        return jsonResponse(
          { error: data.error_description || data.error || "No token" },
          { status: 400, origin: allowedOrigin },
        );
      }

      // Mirror the /callback payload shape — only include optional fields
      // when GitHub returned them.
      const refreshPayload: Record<string, unknown> = {
        access_token: data.access_token,
      };
      if (data.refresh_token) refreshPayload.refresh_token = data.refresh_token;
      if (typeof data.expires_in === "number") refreshPayload.expires_in = data.expires_in;
      if (typeof data.refresh_token_expires_in === "number") {
        refreshPayload.refresh_token_expires_in = data.refresh_token_expires_in;
      }
      if (data.token_type) refreshPayload.token_type = data.token_type;

      return jsonResponse(refreshPayload, { origin: allowedOrigin });
    }

    return new Response("Not found", { status: 404 });
  },
};
