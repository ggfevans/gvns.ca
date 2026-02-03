<script lang="ts">
  let progress = $state(0);

  $effect(() => {
    const prose = document.querySelector('.prose');
    if (!prose) return;

    let start: number;
    let end: number;

    function computeBounds() {
      const rect = prose!.getBoundingClientRect();
      start = rect.top + window.scrollY;
      end = start + rect.height - window.innerHeight;
    }

    function handleScroll() {
      const scrolled = window.scrollY;
      if (scrolled <= start) {
        progress = 0;
      } else if (scrolled >= end) {
        progress = 100;
      } else {
        progress = ((scrolled - start) / (end - start)) * 100;
      }
    }

    computeBounds();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', computeBounds, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', computeBounds);
    };
  });
</script>

<div
  class="reading-progress"
  style="width: {progress}%"
  role="presentation"
  aria-hidden="true"
></div>

<style>
  .reading-progress {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: var(--colour-accent-primary);
    z-index: 100;
    transition: width 100ms ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .reading-progress {
      transition: none;
    }
  }
</style>
