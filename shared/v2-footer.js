/* ============================================
   AI Hub v2.0 — Footer Component
   ============================================ */

(function() {
  'use strict';

  function buildFooter() {
    const footer = document.createElement('footer');
    footer.className = 'v2-footer';
    footer.innerHTML = [
      '<div class="v2-footer__inner">',
      '  <div class="v2-footer__left">',
      '    <span class="v2-footer__brand">AI Hub v2.0</span>',
      '    <span class="v2-footer__separator">|</span>',
      '    <span class="v2-footer__tagline">The Confidence Engine</span>',
      '    <span class="v2-footer__separator">|</span>',
      '    <span class="v2-footer__org">Built for Randstad GBS</span>',
      '  </div>',
      '  <div class="v2-footer__right">',
      '    <a href="/ai-governance/" class="v2-footer__link">AI Governance</a>',
      '    <a href="/privacy-policy/" class="v2-footer__link">Privacy</a>',
      '    <a href="/cookie-policy/" class="v2-footer__link">Cookies</a>',
      '    <a href="/legal-notice/" class="v2-footer__link">Legal</a>',
      '    <a href="/contact-us/" class="v2-footer__link">Contact</a>',
      '    <a href="/feedback/" class="v2-footer__link">Feedback</a>',
      '  </div>',
      '</div>'
    ].join('\n');

    // Add styles
    const style = document.createElement('style');
    style.textContent = [
      '.v2-footer {',
      '  margin-top: var(--space-16);',
      '  padding: var(--space-6) 0;',
      '  border-top: 1px solid var(--border-subtle);',
      '}',
      '.v2-footer__inner {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  flex-wrap: wrap;',
      '  gap: var(--space-4);',
      '}',
      '.v2-footer__left {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: var(--space-3);',
      '  font-size: var(--font-xs);',
      '  color: var(--text-muted);',
      '}',
      '.v2-footer__brand {',
      '  font-weight: var(--weight-semibold);',
      '  color: var(--text-secondary);',
      '}',
      '.v2-footer__separator {',
      '  color: var(--border-default);',
      '}',
      '.v2-footer__right {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: var(--space-4);',
      '  flex-wrap: wrap;',
      '}',
      '.v2-footer__link {',
      '  font-size: var(--font-xs);',
      '  color: var(--text-muted);',
      '  text-decoration: none;',
      '  transition: color var(--transition-fast);',
      '}',
      '.v2-footer__link:hover {',
      '  color: var(--text-secondary);',
      '}',
      '@media (max-width: 768px) {',
      '  .v2-footer__inner {',
      '    flex-direction: column;',
      '    align-items: flex-start;',
      '  }',
      '}'
    ].join('\n');

    document.head.appendChild(style);

    // Insert footer into main content area
    const main = document.querySelector('.app-main');
    if (main) {
      main.appendChild(footer);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildFooter);
  } else {
    buildFooter();
  }
})();
