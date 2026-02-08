/* ============================================
   AI Hub v2.0 — Sidebar Component
   ============================================ */

(function() {
  'use strict';

  const NAV_ITEMS = [
    {
      section: 'Core',
      items: [
        { id: 'home',       label: 'Command Center', icon: 'layout-dashboard', href: '/',          mobileHide: false },
        { id: 'stages',     label: 'The 12 Stages',  icon: 'git-branch',       href: '/stages/',   mobileHide: false },
        { id: 'passport',   label: 'Role Passport',  icon: 'file-text',        href: '/passport/', mobileHide: false },
        { id: 'truth',      label: 'Truth Check',    icon: 'shield-check',     href: '/truth-check/', mobileHide: false },
        { id: 'confidence', label: 'Confidence Pack', icon: 'target',          href: '/confidence-pack/', mobileHide: true },
      ]
    },
    {
      section: 'Resources',
      items: [
        { id: 'prompts',  label: 'Prompt Arsenal', icon: 'terminal',      href: '/prompts/',  mobileHide: false },
        { id: 'academy',  label: 'Academy',        icon: 'graduation-cap', href: '/academy/',  mobileHide: true },
        { id: 'library',  label: 'Asset Library',  icon: 'folder-open',   href: '/library/',  mobileHide: true },
      ]
    },
    {
      section: 'Operations',
      items: [
        { id: 'telemetry', label: 'Telemetry',     icon: 'bar-chart-2',   href: '/telemetry/', mobileHide: true },
        { id: 'rituals',   label: 'Team Rituals',  icon: 'calendar-check', href: '/rituals/',  mobileHide: true },
        { id: 'profile',   label: 'My Profile',    icon: 'user-circle',   href: '/profile/',  mobileHide: true },
      ]
    },
    {
      section: '',
      items: [
        { id: 'manifesto', label: 'The Manifesto', icon: 'book-open', href: '/manifesto/', mobileHide: true },
      ]
    }
  ];

  const ICONS = {
    'layout-dashboard': '<line x1="3" y1="3" x2="3" y2="11"/><line x1="3" y1="3" x2="11" y2="3"/><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="4" rx="1"/><rect x="13" y="9" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="4" rx="1"/>',
    'git-branch': '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
    'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    'shield-check': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'terminal': '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
    'graduation-cap': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 8 3 12 0v-5"/>',
    'folder-open': '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M2 10h20"/>',
    'bar-chart-2': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    'calendar-check': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/>',
    'user-circle': '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/><circle cx="12" cy="12" r="10"/>',
    'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    'chevrons-left': '<polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>',
  };

  function svgIcon(name) {
    const paths = ICONS[name] || '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }

  function getActivePage() {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'home';
    for (const section of NAV_ITEMS) {
      for (const item of section.items) {
        if (item.href !== '/' && path.startsWith(item.href)) return item.id;
      }
    }
    return 'home';
  }

  function buildSidebar() {
    const activePage = getActivePage();
    const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';

    let html = '';

    // Logo
    html += '<div class="sidebar__logo">';
    html += '  <div class="sidebar__logo-mark">' + svgIcon('layout-dashboard') + '</div>';
    html += '  <div class="sidebar__logo-text">';
    html += '    <span class="sidebar__logo-title">AI Hub</span>';
    html += '    <span class="sidebar__logo-subtitle">Confidence Engine</span>';
    html += '  </div>';
    html += '</div>';

    // Navigation
    html += '<nav class="sidebar__nav" role="navigation" aria-label="Main navigation">';

    for (const section of NAV_ITEMS) {
      html += '<div class="sidebar__section">';
      if (section.section) {
        html += '<div class="sidebar__section-label">' + section.section + '</div>';
      }
      for (const item of section.items) {
        const isActive = activePage === item.id;
        const classes = ['sidebar__link'];
        if (isActive) classes.push('active');
        if (item.soon) classes.push('sidebar__link--soon');

        const attrs = [
          'class="' + classes.join(' ') + '"',
          'href="' + item.href + '"',
          'data-page="' + item.id + '"',
          'data-mobile-hide="' + (item.mobileHide ? 'true' : 'false') + '"',
          'aria-label="' + item.label + '"',
        ];
        if (item.soon) {
          attrs.push('aria-disabled="true"');
          attrs.push('tabindex="-1"');
        }

        html += '<a ' + attrs.join(' ') + '>';
        html += svgIcon(item.icon);
        html += '<span class="sidebar__link-text">' + item.label + '</span>';
        html += '<span class="sidebar__tooltip">' + item.label + '</span>';
        html += '</a>';
      }
      html += '</div>';
    }

    html += '</nav>';

    // Footer / Collapse button
    html += '<div class="sidebar__footer">';
    html += '  <button class="sidebar__collapse-btn" aria-label="Toggle sidebar">';
    html += svgIcon('chevrons-left');
    html += '    <span class="sidebar__collapse-text">Collapse</span>';
    html += '  </button>';
    html += '</div>';

    // Create sidebar element
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.setAttribute('role', 'complementary');
    sidebar.innerHTML = html;

    // Insert into DOM
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      appLayout.insertBefore(sidebar, appLayout.firstChild);
      if (collapsed) {
        appLayout.classList.add('sidebar-collapsed');
      }
    }

    // Collapse toggle
    const collapseBtn = sidebar.querySelector('.sidebar__collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function() {
        const layout = document.querySelector('.app-layout');
        layout.classList.toggle('sidebar-collapsed');
        const isNowCollapsed = layout.classList.contains('sidebar-collapsed');
        localStorage.setItem('sidebar-collapsed', isNowCollapsed);
      });
    }

    // Prevent navigation on "soon" links
    const soonLinks = sidebar.querySelectorAll('.sidebar__link--soon');
    soonLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
      });
    });
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSidebar);
  } else {
    buildSidebar();
  }
})();
