/* ============================================
   AI Hub v2.0 — AI Service Layer
   Unified interface for Gemini + Copilot
   ============================================ */

const AIService = (function() {
  'use strict';

  const ENGINES = {
    gemini: {
      name: 'Google Gemini',
      endpoint: '/api/learning-assistant',
      available: true
    },
    copilot: {
      name: 'Microsoft Copilot',
      endpoint: '/api/copilot-proxy',
      available: false // Will be enabled when Copilot API is configured
    }
  };

  let defaultEngine = 'gemini';

  /**
   * Send a prompt to the selected AI engine
   * @param {string} prompt - The prompt text
   * @param {Object} options - Configuration options
   * @param {string} options.engine - 'gemini' or 'copilot'
   * @param {string} options.context - Additional context for the prompt
   * @param {string} options.systemPrompt - System-level instruction
   * @param {number} options.maxTokens - Maximum response tokens
   * @returns {Promise<{text: string, engine: string, error?: string}>}
   */
  async function query(prompt, options = {}) {
    const engine = options.engine || defaultEngine;
    const config = ENGINES[engine];

    if (!config) {
      return { text: '', engine: engine, error: 'Unknown AI engine: ' + engine };
    }

    if (!config.available) {
      return { text: '', engine: engine, error: config.name + ' is not yet configured. Using Gemini instead.' };
    }

    const payload = {
      message: prompt,
      context: options.context || '',
      systemPrompt: options.systemPrompt || '',
      maxTokens: options.maxTokens || 2048
    };

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error('API error (' + response.status + '): ' + errText);
      }

      const data = await response.json();
      return {
        text: data.response || data.text || data.message || '',
        engine: engine,
        error: null
      };
    } catch (err) {
      console.error('[AIService] Error:', err);
      return {
        text: '',
        engine: engine,
        error: err.message || 'Failed to get AI response'
      };
    }
  }

  /**
   * Get list of available engines
   */
  function getEngines() {
    return Object.entries(ENGINES).map(function([key, val]) {
      return { id: key, name: val.name, available: val.available };
    });
  }

  /**
   * Set the default engine
   */
  function setDefaultEngine(engine) {
    if (ENGINES[engine]) {
      defaultEngine = engine;
      localStorage.setItem('ai-engine-preference', engine);
    }
  }

  /**
   * Get current default engine
   */
  function getDefaultEngine() {
    return defaultEngine;
  }

  // Restore preference from localStorage
  const saved = localStorage.getItem('ai-engine-preference');
  if (saved && ENGINES[saved] && ENGINES[saved].available) {
    defaultEngine = saved;
  }

  return {
    query: query,
    getEngines: getEngines,
    setDefaultEngine: setDefaultEngine,
    getDefaultEngine: getDefaultEngine
  };
})();
