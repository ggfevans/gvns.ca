<script lang="ts">
  interface Heading {
    id: string;
    text: string;
    level: number;
  }

  let headings: Heading[] = $state([]);
  let activeId = $state('');
  let isExpanded = $state(false);

  $effect(() => {
    const prose = document.querySelector('.prose');
    if (!prose) return;

    const elements = prose.querySelectorAll('h2, h3');
    const extracted: Heading[] = [];
    for (const el of elements) {
      if (el.id && el.textContent) {
        extracted.push({
          id: el.id,
          text: el.textContent.trim(),
          level: el.tagName === 'H2' ? 2 : 3,
        });
      }
    }
    headings = extracted;

    if (headings.length < 3) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeId = entry.target.id;
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );

    for (const el of elements) {
      if (el.id) observer.observe(el);
    }

    return () => observer.disconnect();
  });

  function scrollToHeading(id: string) {
    const el = document.getElementById(id);
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    isExpanded = false;
  }
</script>

{#if headings.length >= 3}
  <aside class="toc" aria-label="Table of contents">
    <button
      class="toc-toggle"
      onclick={() => isExpanded = !isExpanded}
      aria-expanded={isExpanded}
    >
      <span class="toc-toggle-label">On this page</span>
      <svg
        class="toc-toggle-icon"
        class:rotated={isExpanded}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <nav class="toc-nav" class:expanded={isExpanded}>
      <h2 class="toc-heading">On this page</h2>
      <ol class="toc-list">
        {#each headings as heading}
          <li class="toc-item" class:indent={heading.level === 3}>
            <button
              class="toc-link"
              class:active={activeId === heading.id}
              onclick={() => scrollToHeading(heading.id)}
            >
              {heading.text}
            </button>
          </li>
        {/each}
      </ol>
    </nav>
  </aside>
{/if}

<style>
  .toc {
    margin-bottom: 2rem;
    border: 1px solid var(--colour-border);
    border-radius: 8px;
    background: var(--colour-bg-secondary);
    overflow: hidden;
  }

  /* Mobile: collapsible */
  .toc-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--colour-text-primary);
    font-size: var(--text-sm);
    font-weight: 600;
    font-family: var(--font-sans);
  }

  .toc-toggle-icon {
    transition: transform var(--transition-fast);
  }

  .toc-toggle-icon.rotated {
    transform: rotate(180deg);
  }

  .toc-nav {
    display: none;
    padding: 0 1rem 0.75rem;
  }

  .toc-nav.expanded {
    display: block;
  }

  .toc-heading {
    display: none;
  }

  /* Desktop: always visible */
  @media (min-width: 768px) {
    .toc-toggle {
      display: none;
    }

    .toc-nav {
      display: block;
      padding: 1rem;
    }

    .toc-heading {
      display: block;
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--colour-text-primary);
      margin: 0 0 0.75rem;
    }
  }

  .toc-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .toc-item {
    margin: 0;
  }

  .toc-item.indent {
    padding-left: 1rem;
  }

  .toc-link {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.25rem 0.5rem;
    border: none;
    border-left: 2px solid transparent;
    background: none;
    cursor: pointer;
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--colour-text-secondary);
    transition: color var(--transition-fast), border-color var(--transition-fast);
    line-height: 1.5;
  }

  .toc-link:hover {
    color: var(--colour-text-primary);
  }

  .toc-link.active {
    color: var(--colour-accent-primary);
    border-left-color: var(--colour-accent-primary);
  }

  @media (prefers-reduced-motion: reduce) {
    .toc-toggle-icon {
      transition: none;
    }
  }
</style>
