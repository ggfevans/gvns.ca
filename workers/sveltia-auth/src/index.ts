// GitHub OAuth proxy for Sveltia CMS.
// Compatible with Decap CMS / Sveltia CMS auth flow.

export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  AUTH_ALLOWED_ORIGINS: string; // comma-separated, e.g. "https://gvns.ca,https://chore-247.gvns-ca.<account>.workers.dev"
}

const STATE_COOKIE = "sveltia_oauth_state";
// Cap GitHub token-exchange to keep us comfortably under the Workers CPU limit.
const TOKEN_EXCHANGE_TIMEOUT_MS = 8000;

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
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: `${url.origin}/callback`,
        scope: "public_repo,user",
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

      // Robust token exchange: bound the request, check status, and treat any
      // network/parse failure as a controlled OAuth error rather than a 500.
      let data: { access_token?: string; error?: string } = {};
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TOKEN_EXCHANGE_TIMEOUT_MS);
      try {
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
          signal: controller.signal,
        });
        if (!tokenRes.ok) {
          return htmlResponse(
            postMessageHTML(targetOrigin, "error", { message: `Token endpoint returned ${tokenRes.status}` }),
          );
        }
        data = (await tokenRes.json()) as { access_token?: string; error?: string };
      } catch {
        return htmlResponse(postMessageHTML(targetOrigin, "error", { message: "Token exchange failed" }));
      } finally {
        clearTimeout(timeout);
      }

      if (!data.access_token) {
        return htmlResponse(postMessageHTML(targetOrigin, "error", { message: data.error || "No token" }));
      }
      return htmlResponse(postMessageHTML(targetOrigin, "success", { token: data.access_token, provider: "github" }));
    }

    return new Response("Not found", { status: 404 });
  },
};
