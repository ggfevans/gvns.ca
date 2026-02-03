<script lang="ts">
  import ThemeToggle from './ThemeToggle.svelte';

  interface NavItem {
    href: string;
    label: string;
  }

  interface Props {
    navItems: NavItem[];
    currentPath: string;
  }

  let { navItems, currentPath }: Props = $props();

  let isOpen = $state(false);
  let menuRef = $state<HTMLElement | null>(null);
  let buttonRef = $state<HTMLElement | null>(null);

  function toggle() {
    isOpen = !isOpen;
  }

  function close() {
    isOpen = false;
    buttonRef?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      close();
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (
      isOpen &&
      menuRef &&
      !menuRef.contains(event.target as Node) &&
      buttonRef &&
      !buttonRef.contains(event.target as Node)
    ) {
      close();
    }
  }

  function isActive(href: string): boolean {
    return currentPath === href || (href !== '/' && currentPath.startsWith(href));
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeydown);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="mobile-nav">
  <button
    bind:this={buttonRef}
    onclick={toggle}
    class="hamburger"
    aria-expanded={isOpen}
    aria-controls="mobile-menu"
    aria-label={isOpen ? 'Close menu' : 'Open menu'}
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {#if isOpen}
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      {:else}
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      {/if}
    </svg>
  </button>

  <nav
    bind:this={menuRef}
    id="mobile-menu"
    class="menu"
    class:open={isOpen}
    aria-hidden={!isOpen}
  >
    <ul class="nav-links">
      {#each navItems as { href, label }}
        <li>
          <a
            {href}
            class="nav-link"
            class:active={isActive(href)}
            aria-current={isActive(href) ? 'page' : undefined}
            onclick={close}
          >
            {label}
          </a>
        </li>
      {/each}
    </ul>
    <div class="menu-footer">
      <ThemeToggle />
    </div>
  </nav>
</div>

<style>
  .mobile-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--colour-text-primary);
    cursor: pointer;
    border-radius: 4px;
    transition: background-color var(--transition-fast);
  }

  .hamburger:hover {
    background: var(--colour-bg-secondary);
  }

  .menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--colour-bg-primary);
    border-bottom: 1px solid var(--colour-border);
    padding: 1rem 1.5rem;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition:
      opacity var(--transition-fast),
      transform var(--transition-fast),
      visibility var(--transition-fast);
  }

  .menu.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .nav-links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .nav-link {
    display: block;
    padding: 0.75rem 1rem;
    color: var(--colour-text-secondary);
    text-decoration: none;
    border-radius: 4px;
    transition:
      color var(--transition-fast),
      background-color var(--transition-fast);
  }

  .nav-link:hover {
    color: var(--colour-accent-primary);
    background: var(--colour-bg-secondary);
  }

  .nav-link.active {
    color: var(--colour-accent-primary);
    background: var(--colour-bg-secondary);
  }

  .menu-footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--colour-border);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
