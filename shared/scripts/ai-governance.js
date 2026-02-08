/**
 * AI Governance Helpers (user-facing + lightweight enforcement)
 * - Provides a governance URL, acknowledgement storage, and an acknowledgement modal.
 * - Sends telemetry via `trackEvent` when available (which forwards to `/api/analytics/log` after consent).
 */

(function () {
  const GOVERNANCE_URL = '/ai-governance/';
  const VERSION = 'v1';

  const KEYS = {
    general: `ai_gov_ack_general_${VERSION}`,
    candidateEval: `ai_gov_ack_candidate_eval_${VERSION}`,
  };

  function getStorage() {
    const safeGet = window.SecurityUtils && typeof window.SecurityUtils.safeLocalStorageGet === 'function';
    const safeSet = window.SecurityUtils && typeof window.SecurityUtils.safeLocalStorageSet === 'function';

    return {
      get(key) {
        try {
          if (safeGet) return window.SecurityUtils.safeLocalStorageGet(key);
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      },
      set(key, value) {
        try {
          if (safeSet) return window.SecurityUtils.safeLocalStorageSet(key, value);
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch {
          return false;
        }
      },
    };
  }

  function track(name, data) {
    try {
      if (typeof window.trackEvent === 'function') {
        window.trackEvent(name, data || {});
      }
    } catch {
      // ignore
    }
  }

  function isAcknowledged(kind) {
    const storage = getStorage();
    const key = kind === 'candidate-eval' ? KEYS.candidateEval : KEYS.general;
    const value = storage.get(key);
    return Boolean(value && value.acknowledged === true);
  }

  function setAcknowledged(kind) {
    const storage = getStorage();
    const key = kind === 'candidate-eval' ? KEYS.candidateEval : KEYS.general;
    storage.set(key, { acknowledged: true, at: Date.now(), version: VERSION });
  }

  function openGovernance() {
    const from = encodeURIComponent(
      (window.location && (window.location.pathname + window.location.search + window.location.hash)) || '/'
    );
    const url = `${GOVERNANCE_URL}${GOVERNANCE_URL.includes('?') ? '&' : '?'}from=${from}`;
    track('governance_opened', { url });
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function ensureAcknowledged(kind, opts) {
    const options = opts || {};
    const title = options.title || 'AI hiring governance acknowledgement';
    const description =
      options.description ||
      (kind === 'candidate-eval'
        ? 'Before using AI to assess candidates, confirm you will use AI outputs as support only (not automated decisioning) and follow the candidate-data rules.'
        : 'Please acknowledge the AI use guidelines before proceeding.');

    if (isAcknowledged(kind)) return Promise.resolve(true);

    track('governance_ack_required', { kind });

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className =
        'fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', title);

      const panel = document.createElement('div');
      panel.className = 'w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden';

      const close = () => {
        overlay.remove();
      };

      const proceed = () => {
        setAcknowledged(kind);
        track('governance_acknowledged', { kind });
        close();
        resolve(true);
      };

      const cancel = () => {
        track('governance_ack_cancelled', { kind });
        close();
        resolve(false);
      };

      panel.innerHTML = `
        <div class="p-6 border-b border-gray-200 bg-gray-50">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-xl font-bold text-gray-900">${escapeHtml(title)}</h3>
              <p class="text-gray-700 mt-2">${escapeHtml(description)}</p>
            </div>
            <button class="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close">
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>

        <div class="p-6 space-y-4">
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div class="font-semibold mb-1">Key rules (short version)</div>
            <ul class="list-disc list-inside space-y-1">
              <li>Do not paste unnecessary candidate PII into public tools.</li>
              <li>No automated decisioning: AI outputs are support only.</li>
              <li>Do not infer protected characteristics; focus on job-related evidence.</li>
              <li>Use AI to draft questions, identify gaps, and structure interviews.</li>
            </ul>
          </div>

          <label class="flex items-start gap-3 text-sm text-gray-800">
            <input id="ai-gov-ack-checkbox" type="checkbox" class="mt-1 h-4 w-4" />
            <span>
              I understand and will follow these rules for this use.
            </span>
          </label>

          <div class="flex flex-col sm:flex-row gap-3 justify-end pt-2">
            <button id="ai-gov-read" class="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 font-semibold">
              Read full guidelines
            </button>
            <button id="ai-gov-cancel" class="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold">
              Not now
            </button>
            <button id="ai-gov-proceed" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold" disabled>
              I understand, continue
            </button>
          </div>
        </div>
      `;

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      const closeBtn = panel.querySelector('button[aria-label="Close"]');
      const readBtn = panel.querySelector('#ai-gov-read');
      const cancelBtn = panel.querySelector('#ai-gov-cancel');
      const proceedBtn = panel.querySelector('#ai-gov-proceed');
      const checkbox = panel.querySelector('#ai-gov-ack-checkbox');

      if (closeBtn) closeBtn.addEventListener('click', cancel);
      if (readBtn) readBtn.addEventListener('click', openGovernance);
      if (cancelBtn) cancelBtn.addEventListener('click', cancel);
      if (proceedBtn) proceedBtn.addEventListener('click', proceed);

      if (checkbox && proceedBtn) {
        checkbox.addEventListener('change', () => {
          proceedBtn.disabled = !checkbox.checked;
        });
      }

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cancel();
      });

      document.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'Escape') cancel();
        },
        { once: true }
      );
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  window.AIGovernance = {
    url: GOVERNANCE_URL,
    version: VERSION,
    track,
    isAcknowledged,
    ensureAcknowledged,
    openGovernance,
  };
})();
