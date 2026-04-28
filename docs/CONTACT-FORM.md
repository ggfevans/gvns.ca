# Contact Form

The `/contact` page submits to `POST /api/contact` (server-rendered Astro endpoint, deployed as part of the gvns-ca Worker). Submissions are validated, gated by Cloudflare Turnstile, rate-limited, and sent as email via the Resend HTTP API.

## Architecture

```
Browser                  Worker (gvns-ca)                   External
─────────                ─────────────────                  ────────
ContactForm.svelte       src/pages/api/contact.ts
   │                            │
   │  POST /api/contact          │
   │  ─────────────────────────▶│
   │                            ├─▶ Origin / CT / size checks
   │                            ├─▶ Honeypot (hp_field)
   │                            ├─▶ RATE_LIMITER binding (5/60s per IP)
   │                            ├─▶ POST challenges.cloudflare.com/turnstile/v0/siteverify
   │                            │       (TURNSTILE_SECRET_KEY)
   │                            ├─▶ Zod validate (contact-schema.ts)
   │                            ├─▶ buildResendPayload (contact-email.ts)
   │                            └─▶ POST api.resend.com/emails  ─────────▶  Resend
   │  200 {ok:true}             │       (RESEND_API_KEY)                        │
   │ ◀──────────────────────────│                                               ▼
                                                                          DKIM-signed
                                                                          email delivered
                                                                          to hi@gvns.ca
                                                                          (iCloud MX)
```

Cloudflare **does not own MX** on gvns.ca — iCloud does. We do not use `cloudflare:email` / `send_email` bindings. Resend is the transport because it only needs DKIM/SPF TXT records on the zone and coexists with iCloud receiving.

## Files

| File | Role |
|---|---|
| `src/components/ContactForm.svelte` | Client island; collects fields, renders Turnstile, POSTs as `application/x-www-form-urlencoded`. |
| `src/pages/contact.astro` | Page wrapper; loads `https://challenges.cloudflare.com/turnstile/v0/api.js`; sets CSP. |
| `src/pages/api/contact.ts` | Server endpoint; gating + Turnstile verify + Resend send. |
| `src/lib/contact-schema.ts` | Zod schema (name/email/subject/message + honeypot + Turnstile token). |
| `src/lib/contact-email.ts` | `buildResendPayload(input)` — returns plain JSON for Resend. |

## Required infra

| Item | Where | Notes |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | Worker secret | `wrangler secret put TURNSTILE_SECRET_KEY --name gvns-ca` |
| `PUBLIC_TURNSTILE_SITE_KEY` | Build-time env (Cloudflare Workers Builds → Variables) | Locked to `gvns.ca`. Preview deploy URLs cannot pass Turnstile. |
| `RESEND_API_KEY` | Worker secret | `wrangler secret put RESEND_API_KEY --name gvns-ca` |
| `RATE_LIMITER` binding | `wrangler.jsonc` `ratelimits` block | 5 requests / 60s per CF-Connecting-IP. |
| Resend domain verification | resend.com → Domains → gvns.ca | Provides DKIM TXT record(s) and an SPF include to merge with iCloud's. |
| DNS on gvns.ca | Cloudflare DNS | DKIM TXT (Resend), SPF TXT merged: `v=spf1 include:icloud.com include:_spf.resend.com ~all`. **MX stays at iCloud.** |

## Outcomes (logged via `wrangler tail`)

`[contact] outcome=<state> ip=<ip> [extra]`

| outcome | meaning |
|---|---|
| `ok` | Email accepted by Resend; 200 to client. |
| `origin_blocked` | Origin/Referer not gvns.ca or localhost. |
| `unsupported_media_type` | Content-Type not JSON or form-urlencoded. |
| `payload_too_large` | Body > 10 KB. |
| `bad_request` | Body parse failed. |
| `honeypot` | Hidden `hp_field` was non-empty. Returns fake 200 to client. |
| `rate_limited` | RATE_LIMITER said no. 429 to client. |
| `turnstile_failed` | Turnstile siteverify returned `success: false` or timed out. |
| `validation_failed` | Zod parse failed. 400 with field errors. |
| `send_failed` | Downstream throw. Tagged with `stage=ratelimit\|turnstile_fetch\|email`, plus `error=` and `message=` (or `status=`/`body=` for Resend 4xx/5xx). |

## Debug recipe

1. **Tail.** `npx wrangler tail gvns-ca --format pretty` from this repo. Submit the form on the live site — preview URLs cannot pass Turnstile because the site key is locked to `gvns.ca`.
2. **Look at outcome.** The `[contact] outcome=...` line tells you which gate fired. Anything other than `ok` short-circuits before send.
3. **`outcome=send_failed`?** The `stage=` and `message=`/`status=`/`body=` tell you which dependency threw. For `stage=email status=4xx`, the `body=` field is Resend's JSON error.
4. **Cross-check Resend.** Resend dashboard → Logs lists every send attempt with payload + delivery state. If `outcome=ok` but no email arrives, the issue is post-Resend (deliverability, iCloud filtering).
5. **Confirm secrets exist.** `npx wrangler secret list --name gvns-ca` should include `RESEND_API_KEY` and `TURNSTILE_SECRET_KEY`.

## Known failure modes from history (#295)

| Symptom | Root cause | Reference |
|---|---|---|
| 500 with no useful log | Catch arms only logged `error.name`; rate-limit / Turnstile-fetch / send-fail were indistinguishable | #296 added `stage=` + `message=` |
| `MIMETEXT_INVALID_HEADER_VALUE` for Reply-To | mimetext rejects bare strings for address-list headers | #297 + #301 (since superseded by #302 dropping mimetext entirely) |
| `outcome=honeypot` on real submissions | Hidden field was named `website` — Firefox autofill targets it. `autocomplete="off"` is widely ignored on non-password fields | #298 renamed to `hp_field` |
| `destination address is not a verified address` | Cloudflare `send_email` binding requires the target to be an account-level Destination (an external verified mailbox). Routed aliases on the same zone (`hi@gvns.ca`) cannot be Destinations. | #302 dropped the binding entirely; switched to Resend HTTP API |

## Local dev

The Turnstile site key falls back to Cloudflare's always-pass test key (`1x00000000000000000000AA`) when `PUBLIC_TURNSTILE_SITE_KEY` is unset and `import.meta.env.DEV` is true. To smoke-test the send path locally, you'd also need `RESEND_API_KEY` available to the Worker dev runtime — easiest is to skip and verify in production.
