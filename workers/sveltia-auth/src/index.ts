// GitHub OAuth proxy for Sveltia CMS.
// Compatible with Decap CMS / Sveltia CMS auth flow.

export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  AUTH_ALLOWED_ORIGINS: string; // comma-separated, e.g. "https://gvns.ca,https://chore-247.gvns-ca.<account>.workers.dev"
}

const STATE_COOKIE = "sveltia_oauth_state";

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

function htmlResponse(body: string): Response {
  return new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const allowed = parseOrigins(env);

    if (url.pathname === "/auth") {
      const origin = pickOrigin(request.headers.get("Referer"), allowed) ?? allowed[0];
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
      const targetOrigin = decodeURIComponent(cookieOriginEnc || "");

      if (!targetOrigin || !allowed.includes(targetOrigin)) {
        return htmlResponse(postMessageHTML(allowed[0] || "*", "error", { message: "Origin not allowed" }));
      }
      if (!code || !state || state !== cookieState) {
        return htmlResponse(postMessageHTML(targetOrigin, "error", { message: "Invalid state" }));
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const data = (await tokenRes.json()) as { access_token?: string; error?: string };
      if (!data.access_token) {
        return htmlResponse(postMessageHTML(targetOrigin, "error", { message: data.error || "No token" }));
      }
      return htmlResponse(postMessageHTML(targetOrigin, "success", { token: data.access_token, provider: "github" }));
    }

    return new Response("Not found", { status: 404 });
  },
};
