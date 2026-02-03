<script lang="ts">
  // Read initial theme from BaseLayout's inline script (avoids re-initialization)
  // Falls back to 'dark' during SSR or if window.__theme isn't set
  function getInitialTheme(): 'dark' | 'light' {
    if (typeof window !== 'undefined' && (window as any).__theme) {
      return (window as any).__theme;
    }
    return 'dark';
  }

  let theme = $state<'dark' | 'light'>(getInitialTheme());

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    (window as any).__theme = theme;
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

  .icon {
    display: block;
  }
</style>
