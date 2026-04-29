// GitHub auth proxy for Sveltia CMS.
//
// Backed by a GitHub App. The flow is:
//
//   1. User clicks login → /auth → GitHub OAuth (App user-flow).
//   2. /callback exchanges the code for a *user-to-server* token, then uses
//      it to verify the user has push access to the configured repo.
//   3. If verified, the Worker mints an *installation access token* by
//      signing a short-lived RS256 JWT with the App's private key and
//      exchanging it at /app/installations/{id}/access_tokens.
//   4. The installation token is what we hand to Sveltia (NOT the
//      user-to-server token). Commits made with installation tokens are
//      attributed to the App's bot identity (gvns-ca-cms[bot]) — that's
//      what enables actor separation under branch protection (#263).
//
//   5. Installation tokens last ~1 hour and aren't refreshable. We hand
//      Sveltia the user-to-server *refresh_token* so /refresh can re-verify
//      the user (cheap proof of identity that doesn't require re-prompting
//      login) and mint a fresh installation token. The user-to-server
//      access_token is never given to Sveltia — only the refresh token,
//      which is useless without our client_secret.

export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string; // PEM-encoded RS256 private key
  GITHUB_APP_INSTALLATION_ID: string; // numeric installation ID
  GITHUB_APP_REPO: string; // "owner/name" the user must have push access to
  AUTH_ALLOWED_ORIGINS: string;
}

const STATE_COOKIE = "sveltia_oauth_state";
const TOKEN_EXCHANGE_TIMEOUT_MS = 8000;
const APP_API_TIMEOUT_MS = 8000;
const APP_JWT_LIFETIME_S = 540; // 9 min — GitHub allows up to 10
const REQUIRED_PERMISSIONS = new Set(["admin", "maintain", "write"]);

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface InstallationTokenResponse {
  token?: string;
  expires_at?: string;
  message?: string;
}

interface CollabPermissionResponse {
  permission?: string; // "admin" | "maintain" | "write" | "triage" | "read" | "none"
  message?: string;
}

interface UserResponse {
  login?: string;
  message?: string;
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

// --- GitHub HTTP helpers ---

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

// --- JWT signing for GitHub App auth ---

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Strip headers/footers and whitespace, decode base64.
  const stripped = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(stripped);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function importAppPrivateKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function mintAppJwt(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  // iat clock-skew safety: GitHub rejects iat in the future. Subtract 60s.
  const payload = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        iat: now - 60,
        exp: now + APP_JWT_LIFETIME_S,
        iss: env.GITHUB_APP_ID,
      }),
    ),
  );
  const signingInput = `${header}.${payload}`;
  const key = await importAppPrivateKey(env.GITHUB_APP_PRIVATE_KEY);
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

// --- Installation-token / user-verification helpers ---

async function fetchWithTimeout(input: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function mintInstallationToken(env: Env): Promise<{ token?: string; error?: string }> {
  let appJwt: string;
  try {
    appJwt = await mintAppJwt(env);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `App JWT signing failed: ${detail}` };
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.github.com/app/installations/${encodeURIComponent(env.GITHUB_APP_INSTALLATION_ID)}/access_tokens`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${appJwt}`,
          "User-Agent": "sveltia-auth-worker",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
      APP_API_TIMEOUT_MS,
    );
    const data = (await res.json()) as InstallationTokenResponse;
    if (!res.ok || !data.token) {
      return { error: data.message || `Installation token endpoint returned ${res.status}` };
    }
    return { token: data.token };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Installation token request aborted (timeout)" };
    }
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `Installation token request failed: ${detail}` };
  }
}

async function verifyUserHasPushAccess(env: Env, userToServerToken: string): Promise<{ login?: string; error?: string }> {
  // 1. Resolve the authenticated user's login.
  let login: string;
  try {
    const res = await fetchWithTimeout(
      "https://api.github.com/user",
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${userToServerToken}`,
          "User-Agent": "sveltia-auth-worker",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
      APP_API_TIMEOUT_MS,
    );
    const data = (await res.json()) as UserResponse;
    if (!res.ok || !data.login) {
      return { error: data.message || `/user returned ${res.status}` };
    }
    login = data.login;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "/user request aborted (timeout)" };
    }
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `/user request failed: ${detail}` };
  }

  // 2. Verify the user has push (write/maintain/admin) access to the repo.
  const [repoOwner, repoName] = env.GITHUB_APP_REPO.split("/");
  if (!repoOwner || !repoName) {
    return { error: `GITHUB_APP_REPO is not in 'owner/name' form: ${env.GITHUB_APP_REPO}` };
  }
  const repoPath = `${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}`;
  try {
    const res = await fetchWithTimeout(
      `https://api.github.com/repos/${repoPath}/collaborators/${encodeURIComponent(login)}/permission`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${userToServerToken}`,
          "User-Agent": "sveltia-auth-worker",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
      APP_API_TIMEOUT_MS,
    );
    const data = (await res.json()) as CollabPermissionResponse;
    if (!res.ok) {
      return { error: data.message || `permission check returned ${res.status}` };
    }
    if (!data.permission || !REQUIRED_PERMISSIONS.has(data.permission)) {
      return { error: `User ${login} lacks push access (permission: ${data.permission ?? "unknown"})` };
    }
    return { login };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "permission check aborted (timeout)" };
    }
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `permission check failed: ${detail}` };
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

      // 1. Exchange code → user-to-server token.
      const oauth = await exchangeWithGithub({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        redirect_uri: `${url.origin}/callback`,
        code,
      });
      if (!oauth.access_token) {
        return htmlResponse(
          postMessageHTML(targetOrigin, "error", {
            message: oauth.error_description || oauth.error || "No token",
          }),
        );
      }

      // 2. Verify the human has push access to the configured repo.
      const verify = await verifyUserHasPushAccess(env, oauth.access_token);
      if (verify.error || !verify.login) {
        return htmlResponse(
          postMessageHTML(targetOrigin, "error", { message: verify.error ?? "User verification failed" }),
        );
      }

      // 3. Mint an installation access token. This is what Sveltia uses.
      const inst = await mintInstallationToken(env);
      if (!inst.token) {
        return htmlResponse(
          postMessageHTML(targetOrigin, "error", { message: inst.error ?? "Installation token failed" }),
        );
      }

      // 4. Hand Sveltia the installation token (so commits attribute to the
      //    App bot) AND the user's refresh_token (so /refresh can re-verify
      //    the user without re-prompting login). Never expose the
      //    user-to-server access_token itself.
      const successPayload: Record<string, unknown> = {
        token: inst.token,
        provider: "github",
        // Installation tokens last ~1 hour. Tell Sveltia conservatively.
        expires_in: 3300,
      };
      if (oauth.refresh_token) successPayload.refresh_token = oauth.refresh_token;
      if (typeof oauth.refresh_token_expires_in === "number") {
        successPayload.refresh_token_expires_in = oauth.refresh_token_expires_in;
      }

      return htmlResponse(postMessageHTML(targetOrigin, "success", successPayload));
    }

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

      // 1. Re-exchange refresh_token for a new user-to-server access_token
      //    (and a fresh refresh_token).
      const oauth = await exchangeWithGithub({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: body.refresh_token,
      });
      if (oauth.error || !oauth.access_token) {
        return jsonResponse(
          { error: oauth.error_description || oauth.error || "No token" },
          { status: 400, origin: allowedOrigin },
        );
      }

      // 2. Re-verify the user still has push access. This catches access
      //    revocation between sessions.
      const verify = await verifyUserHasPushAccess(env, oauth.access_token);
      if (verify.error || !verify.login) {
        return jsonResponse(
          { error: verify.error ?? "User verification failed" },
          { status: 403, origin: allowedOrigin },
        );
      }

      // 3. Mint a fresh installation access token.
      const inst = await mintInstallationToken(env);
      if (!inst.token) {
        return jsonResponse(
          { error: inst.error ?? "Installation token failed" },
          { status: 502, origin: allowedOrigin },
        );
      }

      const refreshPayload: Record<string, unknown> = {
        access_token: inst.token,
        expires_in: 3300,
      };
      if (oauth.refresh_token) refreshPayload.refresh_token = oauth.refresh_token;
      if (typeof oauth.refresh_token_expires_in === "number") {
        refreshPayload.refresh_token_expires_in = oauth.refresh_token_expires_in;
      }

      return jsonResponse(refreshPayload, { origin: allowedOrigin });
    }

    return new Response("Not found", { status: 404 });
  },
};
