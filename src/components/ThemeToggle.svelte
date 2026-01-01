<script lang="ts">
  let theme = $state<'dark' | 'light'>('dark');

  // Initialize theme from localStorage or system preference
  $effect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  });

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
</script>

<button
  onclick={toggle}
  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
  class="theme-toggle"
>
  {#if theme === 'dark'}
    <span class="icon" aria-hidden="true">☀️</span>
  {:else}
    <span class="icon" aria-hidden="true">🌙</span>
  {/if}
</button>

<style>
  .theme-toggle {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1.25rem;
    line-height: 1;
    opacity: 0.8;
    transition: opacity 150ms ease;
  }

  .theme-toggle:hover {
    opacity: 1;
  }

  .theme-toggle:focus-visible {
    outline: 2px solid var(--color-accent-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .icon {
    display: block;
  }
</style>
