<script lang="ts">
  // Turnstile site key — PUBLIC_ prefix means it's safe to expose in client code.
  // In dev, fall back to Cloudflare's always-pass test key. In production, a missing
  // key is a deploy-time misconfiguration we surface loudly rather than silently
  // sending submissions that will fail server-side verification.
  const PUBLIC_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;
  const TURNSTILE_SITE_KEY: string =
    PUBLIC_KEY ?? (import.meta.env.DEV ? '1x00000000000000000000AA' : '');
  const KEY_MISSING = !TURNSTILE_SITE_KEY;

  let status = $state<'idle' | 'pending' | 'success' | 'error'>('idle');
  let serverMessage = $state('');
  let fieldErrors = $state<Record<string, string>>({});

  function resetTurnstile() {
    const turnstile = (globalThis as { turnstile?: { reset: () => void } }).turnstile;
    turnstile?.reset();
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    status = 'pending';
    serverMessage = '';
    fieldErrors = {};

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data as any).toString(),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        status = 'success';
      } else {
        status = 'error';
        serverMessage = json.message ?? 'Something went wrong.';
        if (json.errors) fieldErrors = json.errors;
        resetTurnstile();
      }
    } catch {
      status = 'error';
      serverMessage = 'Network error. Please try again.';
      resetTurnstile();
    }
  }
</script>

{#if KEY_MISSING}
  <div
    role="alert"
    class="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-200"
  >
    Contact form unavailable: PUBLIC_TURNSTILE_SITE_KEY is not configured. In the meantime, email <a class="underline" href="mailto:hi@gvns.ca">hi@gvns.ca</a> directly.
  </div>
{:else if status === 'success'}
  <div
    role="status"
    class="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200"
  >
    Thanks. Your message is on its way.
  </div>
{:else}
  {#if status === 'error' && serverMessage}
    <div
      role="alert"
      class="mb-6 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-200"
    >
      {serverMessage}
    </div>
  {/if}

  <form
    action="/api/contact"
    method="POST"
    enctype="application/x-www-form-urlencoded"
    novalidate
    onsubmit={handleSubmit}
    class="space-y-5"
  >
    <!-- Honeypot: off-screen, not display:none so bots still interact with it -->
    <div class="absolute left-[-9999px] w-px h-px overflow-hidden" aria-hidden="true">
      <label for="contact-website">Leave this empty</label>
      <input
        type="text"
        id="contact-website"
        name="website"
        tabindex="-1"
        autocomplete="off"
      />
    </div>

    <!-- Name -->
    <div class="space-y-1.5">
      <label
        for="contact-name"
        class="text-foreground leading-none font-medium text-base peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Name
      </label>
      <input
        type="text"
        id="contact-name"
        name="name"
        required
        maxlength="100"
        autocomplete="name"
        aria-invalid={fieldErrors.name ? 'true' : undefined}
        aria-describedby={fieldErrors.name ? 'error-name' : undefined}
        class="border-input dark:bg-input/30 text-foreground w-full rounded-md border bg-transparent shadow-xs h-11 px-3 text-base focus-visible:border-outline focus-visible:ring-outline/50 transition-[color,box-shadow] focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:focus-visible:ring-error/40 placeholder:text-muted-foreground outline-none"
      />
      {#if fieldErrors.name}
        <p id="error-name" class="text-sm text-rose-400">{fieldErrors.name}</p>
      {/if}
    </div>

    <!-- Email -->
    <div class="space-y-1.5">
      <label
        for="contact-email"
        class="text-foreground leading-none font-medium text-base peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Email
      </label>
      <input
        type="email"
        id="contact-email"
        name="email"
        required
        maxlength="254"
        autocomplete="email"
        aria-invalid={fieldErrors.email ? 'true' : undefined}
        aria-describedby={fieldErrors.email ? 'error-email' : undefined}
        class="border-input dark:bg-input/30 text-foreground w-full rounded-md border bg-transparent shadow-xs h-11 px-3 text-base focus-visible:border-outline focus-visible:ring-outline/50 transition-[color,box-shadow] focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:focus-visible:ring-error/40 placeholder:text-muted-foreground outline-none"
      />
      {#if fieldErrors.email}
        <p id="error-email" class="text-sm text-rose-400">{fieldErrors.email}</p>
      {/if}
    </div>

    <!-- Subject -->
    <div class="space-y-1.5">
      <label
        for="contact-subject"
        class="text-foreground leading-none font-medium text-base peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Subject
      </label>
      <input
        type="text"
        id="contact-subject"
        name="subject"
        required
        maxlength="200"
        aria-invalid={fieldErrors.subject ? 'true' : undefined}
        aria-describedby={fieldErrors.subject ? 'error-subject' : undefined}
        class="border-input dark:bg-input/30 text-foreground w-full rounded-md border bg-transparent shadow-xs h-11 px-3 text-base focus-visible:border-outline focus-visible:ring-outline/50 transition-[color,box-shadow] focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:focus-visible:ring-error/40 placeholder:text-muted-foreground outline-none"
      />
      {#if fieldErrors.subject}
        <p id="error-subject" class="text-sm text-rose-400">{fieldErrors.subject}</p>
      {/if}
    </div>

    <!-- Message -->
    <div class="space-y-1.5">
      <label
        for="contact-message"
        class="text-foreground leading-none font-medium text-base peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Message
      </label>
      <textarea
        id="contact-message"
        name="message"
        required
        maxlength="5000"
        rows="8"
        aria-invalid={fieldErrors.message ? 'true' : undefined}
        aria-describedby={fieldErrors.message ? 'error-message' : undefined}
        class="border-input dark:bg-input/30 text-foreground ring-offset-background w-full rounded-md border bg-transparent shadow-xs px-3 py-2 text-base focus-visible:border-outline focus-visible:ring-outline/50 transition-[color,box-shadow] focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:focus-visible:ring-error/40 placeholder:text-muted-foreground outline-none resize-y"
      ></textarea>
      {#if fieldErrors.message}
        <p id="error-message" class="text-sm text-rose-400">{fieldErrors.message}</p>
      {/if}
    </div>

    <!-- Turnstile widget — auto-rendered by the page-level Turnstile script -->
    <div class="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY}></div>

    <!-- Submit -->
    <button
      type="submit"
      disabled={status === 'pending'}
      class="inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/50 h-11 px-5 text-base"
      style="background-color: var(--colour-accent-primary, #8b5cf6); color: #fff;"
    >
      {status === 'pending' ? 'Sending…' : 'Send message'}
    </button>
  </form>
{/if}
