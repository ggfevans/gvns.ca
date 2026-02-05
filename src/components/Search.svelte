<script lang="ts">
  declare global {
    interface Window {
      PagefindUI: new (options: {
        element: HTMLElement;
        showSubResults?: boolean;
        showImages?: boolean;
      }) => void;
    }
  }

  let dialogEl: HTMLDialogElement | undefined = $state();
  let searchContainerEl: HTMLDivElement | undefined = $state();
  let isOpen = $state(false);
  let pagefindLoaded = $state(false);
  let pagefindError = $state(false);

  async function loadPagefind() {
    if (pagefindLoaded) return;
    try {
      // pagefind-ui.js is an IIFE that sets window.PagefindUI (not an ES module)
      await import(/* @vite-ignore */ '/pagefind/pagefind-ui.js');

      if (searchContainerEl && window.PagefindUI) {
        new window.PagefindUI({
          element: searchContainerEl,
          showSubResults: true,
          showImages: false,
        });
        pagefindLoaded = true;
        // Focus the input after Pagefind renders
        requestAnimationFrame(() => {
          const input = searchContainerEl?.querySelector<HTMLInputElement>('input');
          input?.focus();
        });
      } else {
        pagefindError = true;
      }
    } catch {
      pagefindError = true;
    }
  }

  function openDialog() {
    if (!dialogEl) return;
    dialogEl.showModal();
    isOpen = true;
    loadPagefind();
    // If already loaded, focus the input
    if (pagefindLoaded) {
      requestAnimationFrame(() => {
        const input = searchContainerEl?.querySelector<HTMLInputElement>('input');
        input?.focus();
      });
    }
  }

  function closeDialog() {
    if (!dialogEl) return;
    dialogEl.close();
    isOpen = false;
  }

  // Keyboard shortcut: Cmd/Ctrl+K
  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          closeDialog();
        } else {
          openDialog();
        }
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });

  // Close on click outside (on backdrop)
  function handleDialogClick(e: MouseEvent) {
    if (e.target === dialogEl) {
      closeDialog();
    }
  }
</script>

<button
  onclick={openDialog}
  class="search-trigger"
  aria-label="Search (Cmd+K)"
  title="Search (Cmd+K)"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
</button>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialogEl}
  class="search-dialog"
  aria-label="Site search"
  onclick={handleDialogClick}
  onclose={() => isOpen = false}
>
  <div class="search-dialog-inner">
    <div class="search-header">
      <h2 class="search-title">Search</h2>
      <kbd class="search-kbd">
        <span class="kbd-symbol">&#8984;</span>K
      </kbd>
    </div>
    <div class="search-container" bind:this={searchContainerEl}>
      {#if pagefindError}
        <p class="search-fallback">
          Search is not available in development mode. Run a production build to enable search.
        </p>
      {/if}
    </div>
  </div>
</dialog>

<style>
  .search-trigger {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    color: var(--colour-text-secondary);
    transition: color var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .search-trigger:hover {
    color: var(--colour-accent-primary);
  }

  .search-dialog {
    position: fixed;
    border: none;
    border-radius: 12px;
    padding: 0;
    max-width: 600px;
    width: calc(100% - 2rem);
    background: var(--colour-bg-primary);
    color: var(--colour-text-primary);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    top: 15%;
    margin: 0 auto;

    /* Pagefind UI CSS variable overrides */
    --pagefind-ui-primary: var(--colour-accent-primary);
    --pagefind-ui-text: var(--colour-text-primary);
    --pagefind-ui-background: var(--colour-bg-primary);
    --pagefind-ui-border: var(--colour-border);
    --pagefind-ui-tag: var(--colour-bg-tertiary);
    --pagefind-ui-border-width: 1px;
    --pagefind-ui-border-radius: 8px;
    --pagefind-ui-font: var(--font-sans);
  }

  .search-dialog::backdrop {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
  }

  .search-dialog-inner {
    padding: var(--space-6, 1.5rem);
  }

  .search-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4, 1rem);
    padding-bottom: var(--space-3, 0.75rem);
    border-bottom: 1px solid var(--colour-border);
  }

  .search-title {
    font-size: var(--text-lg, 1.25rem);
    font-weight: 600;
    margin: 0;
    color: var(--colour-text-primary);
  }

  .search-kbd {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-family: var(--font-sans);
    font-size: var(--text-xs, 0.75rem);
    padding: 0.2em 0.5em;
    background: var(--colour-bg-tertiary);
    border: 1px solid var(--colour-border);
    border-radius: 4px;
    color: var(--colour-text-secondary);
    line-height: 1;
  }

  .kbd-symbol {
    font-size: 0.85em;
  }

  .search-container {
    min-height: 60px;
  }

  .search-fallback {
    color: var(--colour-text-secondary);
    font-size: var(--text-sm, 0.875rem);
    text-align: center;
    padding: var(--space-8, 2rem) var(--space-4, 1rem);
    margin: 0;
  }

  /* Pagefind UI style overrides */
  .search-container :global(.pagefind-ui__search-input) {
    background: var(--colour-bg-secondary) !important;
    color: var(--colour-text-primary) !important;
    font-family: var(--font-sans) !important;
    border: 1px solid var(--colour-border) !important;
    border-radius: 8px !important;
    padding: 0.75rem 1rem !important;
    font-size: var(--text-base) !important;
    width: 100% !important;
    outline: none !important;
    transition: border-color var(--transition-fast) !important;
  }

  .search-container :global(.pagefind-ui__search-input:focus) {
    border-color: var(--colour-accent-primary) !important;
  }

  .search-container :global(.pagefind-ui__search-clear) {
    color: var(--colour-text-secondary) !important;
    background: none !important;
  }

  .search-container :global(.pagefind-ui__result) {
    padding: var(--space-3) !important;
    border-radius: 8px !important;
    border-bottom: 1px solid var(--colour-border) !important;
    transition: background var(--transition-fast) !important;
  }

  .search-container :global(.pagefind-ui__result:hover) {
    background: var(--colour-bg-tertiary) !important;
  }

  .search-container :global(.pagefind-ui__result-link) {
    color: var(--colour-accent-primary) !important;
    text-decoration: none !important;
    font-weight: 500 !important;
  }

  .search-container :global(.pagefind-ui__result-excerpt) {
    color: var(--colour-text-secondary) !important;
    font-size: var(--text-sm) !important;
  }

  .search-container :global(.pagefind-ui__message) {
    color: var(--colour-text-secondary) !important;
    font-size: var(--text-sm) !important;
  }

  .search-container :global(.pagefind-ui__button) {
    background: var(--colour-bg-tertiary) !important;
    color: var(--colour-text-primary) !important;
    border: 1px solid var(--colour-border) !important;
    border-radius: 8px !important;
    transition: background var(--transition-fast) !important;
  }

  .search-container :global(.pagefind-ui__button:hover) {
    background: var(--colour-bg-secondary) !important;
  }

  .search-container :global(.pagefind-ui__form::before) {
    display: none !important;
  }

  .search-container :global(.pagefind-ui__search-input::placeholder) {
    color: var(--colour-text-muted) !important;
  }

  .search-container :global(.pagefind-ui__result-title) {
    color: var(--colour-text-primary) !important;
  }
</style>
