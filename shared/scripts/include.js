// Simple client-side include loader
// Usage: <div data-include="../shared/partials/header.html"></div>
(function () {
  async function loadIncludes() {
    const nodes = document.querySelectorAll('[data-include]');
    await Promise.all(
      Array.from(nodes).map(async (el) => {
        const src = el.getAttribute('data-include');
        if (!src) return;
        try {
          const resp = await fetch(src, { cache: 'no-cache' });
          if (!resp.ok) throw new Error('Failed to load ' + src);
          const html = await resp.text();
          el.innerHTML = html;
        } catch (e) {
          console.warn('Include failed:', src, e);
        }
      })
    );
    // Initialize dropdown behavior if present
    const toolsDropdown = document.getElementById('tools-dropdown');
    if (toolsDropdown) {
      const btn = document.getElementById('tools-dropdown-btn');
      const menu = document.getElementById('tools-dropdown-menu');
      btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = menu.classList.contains('hidden');
        if (isHidden) {
          menu.classList.remove('hidden', 'opacity-0', 'scale-95');
          menu.classList.add('opacity-100', 'scale-100');
        } else {
          menu.classList.add('opacity-0', 'scale-95');
          setTimeout(() => menu.classList.add('hidden'), 100);
        }
      });
      window.addEventListener('click', (e) => {
        if (!toolsDropdown.contains(e.target)) {
          menu?.classList.add('opacity-0', 'scale-95');
          setTimeout(() => menu?.classList.add('hidden'), 100);
        }
      });
      menu?.addEventListener('click', () => {
        menu.classList.add('opacity-0', 'scale-95');
        setTimeout(() => menu.classList.add('hidden'), 100);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadIncludes);
  } else {
    loadIncludes();
  }
})();

