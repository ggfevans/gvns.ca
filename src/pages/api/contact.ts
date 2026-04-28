import type { APIRoute } from 'astro';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — cloudflare:workers is a Cloudflare runtime module, not a Node module
import { env } from 'cloudflare:workers';

import { contactSchema } from '../../lib/contact-schema';
import { buildResendPayload } from '../../lib/contact-email';

export const prerender = false;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimiter {
  limit: (opts: { key: string }) => Promise<{ success: boolean }>;
}

interface CloudflareEnv {
  RATE_LIMITER: RateLimiter;
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BODY_SIZE_LIMIT = 10240; // 10 KB

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const RESEND_SEND_URL = 'https://api.resend.com/emails';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  const candidate = origin ?? (() => {
    if (!referer) return null;
    try {
      const u = new URL(referer);
      return `${u.protocol}//${u.host}`;
    } catch {
      return null;
    }
  })();

  if (!candidate) return false;

  if (candidate === 'https://gvns.ca') return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(candidate)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(candidate)) return true;

  return false;
}

type ResponseFormat = 'json' | 'html';

function responseFormat(request: Request): ResponseFormat {
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/html')) return 'html';
  return 'json';
}

function errorResponse(
  format: ResponseFormat,
  status: number,
  message: string,
  code: string,
  errors?: Record<string, string>,
  extraHeaders?: Record<string, string>,
): Response {
  const headers: Record<string, string> = { ...extraHeaders };

  if (format === 'html') {
    return new Response(null, {
      status: 303,
      headers: { ...headers, Location: `/contact?error=${code}` },
    });
  }

  headers['Content-Type'] = 'application/json';
  const body: Record<string, unknown> = { ok: false, message };
  if (errors) body.errors = errors;
  return new Response(JSON.stringify(body), { status, headers });
}

function successResponse(format: ResponseFormat): Response {
  if (format === 'html') {
    return new Response(null, {
      status: 303,
      headers: { Location: '/contact?sent=1' },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// GET — 405
// ---------------------------------------------------------------------------

export const GET: APIRoute = async () =>
  new Response(null, { status: 405, headers: { Allow: 'POST' } });

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const cfEnv = env as CloudflareEnv;

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  function log(outcome: string, extra?: string) {
    const base = `[contact] outcome=${outcome} ip=${ip}`;
    console.log(extra ? `${base} ${extra}` : base);
  }

  const fmt = responseFormat(request);

  // 1. Origin / Referer check
  if (!isAllowedOrigin(request)) {
    log('origin_blocked');
    return errorResponse(fmt, 403, 'Forbidden', 'bad_request');
  }

  // 2. Content-Type check
  const ct = (request.headers.get('content-type') ?? '').toLowerCase().split(';')[0].trim();
  if (ct !== 'application/json' && ct !== 'application/x-www-form-urlencoded') {
    log('unsupported_media_type');
    return errorResponse(fmt, 415, 'Unsupported Media Type', 'bad_request');
  }

  // 3. Body size cap (Content-Length fast path)
  const clHeader = request.headers.get('content-length');
  if (clHeader !== null) {
    const cl = parseInt(clHeader, 10);
    if (!isNaN(cl) && cl > BODY_SIZE_LIMIT) {
      log('payload_too_large');
      return errorResponse(fmt, 413, 'Payload Too Large', 'bad_request');
    }
  }

  // 4. Read body (enforce cap regardless of Content-Length)
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    log('payload_too_large');
    return errorResponse(fmt, 413, 'Payload Too Large', 'bad_request');
  }

  if (new TextEncoder().encode(rawBody).length > BODY_SIZE_LIMIT) {
    log('payload_too_large');
    return errorResponse(fmt, 413, 'Payload Too Large', 'bad_request');
  }

  // 5. Parse body
  let fields: Record<string, unknown>;
  try {
    if (ct === 'application/json') {
      const parsed: unknown = JSON.parse(rawBody);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        log('bad_request');
        return errorResponse(fmt, 400, 'Bad Request', 'bad_request');
      }
      fields = parsed as Record<string, unknown>;
    } else {
      const params = new URLSearchParams(rawBody);
      fields = Object.fromEntries(params.entries());
    }
  } catch {
    log('bad_request');
    return errorResponse(fmt, 400, 'Bad Request', 'bad_request');
  }

  // 6. Honeypot check
  const honeypot = typeof fields.hp_field === 'string' ? fields.hp_field : '';
  if (honeypot !== '') {
    log('honeypot');
    // Return fake success — do NOT call rate limiter or send email
    return successResponse(fmt);
  }

  // 7. Rate limit
  try {
    const rl = await cfEnv.RATE_LIMITER.limit({ key: ip });
    if (!rl.success) {
      log('rate_limited');
      return errorResponse(fmt, 429, 'Too Many Requests', 'rate_limited');
    }
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    log('send_failed', `stage=ratelimit error=${e.name} message=${JSON.stringify(e.message)}`);
    return errorResponse(fmt, 500, 'Something went wrong, please try again', 'server');
  }

  // 8. Turnstile verification
  const turnstileToken =
    typeof fields['cf-turnstile-response'] === 'string'
      ? fields['cf-turnstile-response']
      : '';

  const verifyController = new AbortController();
  const verifyTimeout = setTimeout(() => verifyController.abort(), 5000);
  try {
    const verifyBody = new URLSearchParams({
      secret: cfEnv.TURNSTILE_SECRET_KEY,
      response: turnstileToken,
      remoteip: ip,
      idempotency_key: crypto.randomUUID(),
    });

    const verifyRes = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: verifyBody,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: verifyController.signal,
    });

    const verifyJson = (await verifyRes.json()) as { success: boolean };
    if (verifyJson.success !== true) {
      log('turnstile_failed');
      return errorResponse(fmt, 400, 'Verification failed', 'verification');
    }
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.name === 'AbortError') {
      log('turnstile_failed', 'error=timeout');
      return errorResponse(fmt, 504, 'Verification timed out, please try again', 'verification');
    }
    log('send_failed', `stage=turnstile_fetch error=${e.name} message=${JSON.stringify(e.message)}`);
    return errorResponse(fmt, 500, 'Something went wrong, please try again', 'server');
  } finally {
    clearTimeout(verifyTimeout);
  }

  // 9. Zod parse
  const parsed = contactSchema.safeParse(fields);
  if (!parsed.success) {
    log('validation_failed');
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!errors[key]) errors[key] = issue.message;
    }
    return errorResponse(fmt, 400, 'Validation failed', 'validation', errors);
  }

  const input = parsed.data;

  // 10. Build payload
  const payload = buildResendPayload(input);

  // 11. Send via Resend
  const sendController = new AbortController();
  const sendTimeout = setTimeout(() => sendController.abort(), 10000);
  try {
    const sendRes = await fetch(RESEND_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfEnv.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: sendController.signal,
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text().catch(() => '');
      log('send_failed', `stage=email status=${sendRes.status} body=${JSON.stringify(errText.slice(0, 500))}`);
      return errorResponse(fmt, 500, 'Something went wrong, please try again', 'server');
    }
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.name === 'AbortError') {
      log('send_failed', 'stage=email error=timeout');
      return errorResponse(fmt, 504, 'Sending timed out, please try again', 'server');
    }
    log('send_failed', `stage=email error=${e.name} message=${JSON.stringify(e.message)}`);
    return errorResponse(fmt, 500, 'Something went wrong, please try again', 'server');
  } finally {
    clearTimeout(sendTimeout);
  }

  log('ok');
  return successResponse(fmt);
};
