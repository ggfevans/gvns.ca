<script lang="ts">
  // Masthead pause/play for the homepage shader (WCAG 2.2.2, ADR-023).
  // Talks to TopographicBackground only through the `gvns:motion-toggle`
  // event and <html data-motion>; never imports homepage code.
  import { onMount } from 'svelte';
  import pauseIcon from '@tabler/icons/outline/player-pause.svg?raw';
  import playIcon from '@tabler/icons/outline/player-play.svg?raw';

  const STORAGE_KEY = 'gvns-shader-paused';

  let paused = $state(false);
  // The server can't know a stored pause, and an unhydrated button can't act,
  // so stay hidden until mounted rather than show the wrong label.
  let mounted = $state(false);

  onMount(() => {
    try {
      paused = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      paused = false; // storage blocked: default to playing
    }
    mounted = true;
  });

  function toggle() {
    paused = !paused;
    try {
      localStorage.setItem(STORAGE_KEY, paused ? '1' : '0');
    } catch {
      // storage blocked: the event below still pauses for this session
    }
    document.dispatchEvent(new CustomEvent('gvns:motion-toggle', { detail: { paused } }));
  }
</script>

<button
  type="button"
  onclick={toggle}
  aria-label={paused ? 'Play background animation' : 'Pause background animation'}
  class="motion-toggle"
  hidden={!mounted}
>
  <span class="icon" aria-hidden="true">{@html paused ? playIcon : pauseIcon}</span>
</button>

<style>
  .motion-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    min-height: 2rem;
    padding: 0.25rem;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--colour-text-secondary);
    cursor: pointer;
    transition: color 150ms ease;
  }
  .motion-toggle:hover {
    color: var(--colour-text-primary);
  }
  .motion-toggle:focus-visible {
    outline: 2px solid var(--colour-accent-primary);
    outline-offset: 2px;
  }
  .icon {
    display: block;
    line-height: 0;
  }
  .icon :global(svg) {
    width: 18px;
    height: 18px;
  }

  /* Not yet hydrated (the display rule above would override [hidden]), or
     nothing to control: no WebGL, phones (still frame) or reduced motion. */
  .motion-toggle[hidden],
  :global(html[data-motion='unavailable']) .motion-toggle {
    display: none;
  }
  @media (max-width: 767px), (prefers-reduced-motion: reduce) {
    .motion-toggle {
      display: none;
    }
  }
</style>
