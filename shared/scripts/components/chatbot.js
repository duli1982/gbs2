// Learning Assistant chatbot widget
(function () {
  if (window.GBSChatbotInitialized) return;
  window.GBSChatbotInitialized = true;

  const CONFIG = {
    assistantName: 'Learning Assistant',
    assistantTagline: 'Ask about AI tools, prompts, and learning paths.',
    greeting: 'Hi! I can help you navigate the learning hub, explain concepts, or suggest what to read next. What are you working on?',
    maxMessages: 10,
    maxContextItems: 5,
  };

  const state = {
    isOpen: false,
    messages: [],
    index: null,
    indexPromise: null,
  };

  const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i',
    'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'what', 'when',
    'where', 'which', 'who', 'why', 'with', 'you', 'your',
  ]);

  const TERM_EXPANSIONS = {
    ai: ['artificial intelligence', 'genai', 'llm'],
    prompt: ['prompts', 'template', 'templates'],
    sourcing: ['source', 'boolean', 'talent search'],
    screen: ['screening', 'truth check', 'pre-hm'],
    submission: ['confidence pack', 'shortlist'],
    governance: ['policy', 'compliance', 'gdpr'],
    training: ['academy', 'program', 'learning'],
    rituals: ['cadence', 'weekly rituals'],
    metrics: ['telemetry', 'analytics', 'kpi'],
  };

  function shouldDisable() {
    if (window.GBS_DISABLE_CHATBOT) return true;
    const body = document.body;
    return body && body.getAttribute('data-chatbot') === 'off';
  }

  if (shouldDisable()) return;

  function resolveFromScript(relativePath) {
    const src = (document.currentScript && document.currentScript.src) ? String(document.currentScript.src) : '';
    if (!src) return relativePath;
    try {
      return new URL(relativePath, src).toString();
    } catch {
      return relativePath;
    }
  }

  const SEARCH_INDEX_URLS = [
    resolveFromScript('../../search-index.json'),
    '/shared/search-index.json',
    './shared/search-index.json',
  ];

  function createWidget() {
    if (document.getElementById('gbs-chatbot')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'gbs-chatbot';
    wrapper.className = 'gbs-chatbot';
    wrapper.innerHTML = `
      <button class="gbs-chatbot__toggle" type="button" aria-expanded="false" aria-controls="gbs-chatbot-panel">
        <span>Ask ${CONFIG.assistantName}</span>
      </button>
      <div class="gbs-chatbot__panel" id="gbs-chatbot-panel" role="dialog" aria-live="polite">
        <div class="gbs-chatbot__header">
          <h3 class="gbs-chatbot__title">${CONFIG.assistantName}</h3>
          <p class="gbs-chatbot__subtitle">${CONFIG.assistantTagline}</p>
        </div>
        <div class="gbs-chatbot__messages" aria-live="polite"></div>
        <div class="gbs-chatbot__actions">
          <span>Powered by Gemini</span>
          <button type="button" class="gbs-chatbot__clear">Clear</button>
        </div>
        <div class="gbs-chatbot__composer">
          <textarea class="gbs-chatbot__input" rows="1" placeholder="Ask a question..."></textarea>
          <button type="button" class="gbs-chatbot__send">Send</button>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);
  }

  function getElements() {
    const root = document.getElementById('gbs-chatbot');
    if (!root) return {};
    return {
      root,
      toggle: root.querySelector('.gbs-chatbot__toggle'),
      panel: root.querySelector('.gbs-chatbot__panel'),
      messages: root.querySelector('.gbs-chatbot__messages'),
      input: root.querySelector('.gbs-chatbot__input'),
      send: root.querySelector('.gbs-chatbot__send'),
      clear: root.querySelector('.gbs-chatbot__clear'),
    };
  }

  function addMessage(role, content, options = {}) {
    const { messages } = getElements();
    if (!messages) return;

    const entry = { role, content };
    state.messages.push(entry);
    if (state.messages.length > CONFIG.maxMessages) {
      state.messages = state.messages.slice(-CONFIG.maxMessages);
    }

    const row = document.createElement('div');
    row.className = `gbs-chatbot__message ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'gbs-chatbot__bubble';
    bubble.textContent = content;
    row.appendChild(bubble);

    if (role === 'assistant' && options.sources && options.sources.length) {
      const sources = document.createElement('div');
      sources.className = 'gbs-chatbot__sources';
      sources.textContent = 'Sources: ';
      options.sources.forEach((source, idx) => {
        const link = document.createElement('a');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = source.title || source.url;
        sources.appendChild(link);
        if (idx < options.sources.length - 1) {
          sources.appendChild(document.createTextNode(' | '));
        }
      });
      row.appendChild(sources);
    }

    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTypingIndicator() {
    const { messages } = getElements();
    if (!messages) return null;
    const row = document.createElement('div');
    row.className = 'gbs-chatbot__message assistant';
    row.dataset.typing = 'true';
    row.innerHTML = `
      <div class="gbs-chatbot__bubble">
        <span class="gbs-chatbot__typing">
          <span class="gbs-chatbot__dot"></span>
          <span class="gbs-chatbot__dot"></span>
          <span class="gbs-chatbot__dot"></span>
        </span>
      </div>
    `;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  function removeTypingIndicator(node) {
    if (node && node.parentElement) node.parentElement.removeChild(node);
  }

  function sanitizeSearchInput(text) {
    const raw = typeof text === 'string' ? text : '';
    if (window.SecurityUtils && typeof window.SecurityUtils.sanitizeSearchQuery === 'function') {
      return window.SecurityUtils.sanitizeSearchQuery(raw);
    }
    return raw
      .normalize('NFKC')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/[<>`"'\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
  }

  function tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token && token.length > 1);
  }

  function expandTokens(tokens) {
    const expanded = new Set(tokens);
    tokens.forEach((token) => {
      const extra = TERM_EXPANSIONS[token];
      if (!extra) return;
      extra.forEach((term) => {
        tokenize(term).forEach((t) => expanded.add(t));
      });
    });
    return Array.from(expanded);
  }

  function buildSearchCycles(query) {
    const sanitized = sanitizeSearchInput(query).toLowerCase();
    const baseTokens = tokenize(sanitized).filter((t) => !STOP_WORDS.has(t));
    const expandedTokens = expandTokens(baseTokens);
    const relaxedTokens = expandedTokens.filter((t) => t.length >= 3);
    const phraseTokens = sanitizeSearchInput(query).toLowerCase();

    return [
      { name: 'strict', phrase: phraseTokens, tokens: baseTokens, minScore: 3 },
      { name: 'expanded', phrase: '', tokens: expandedTokens, minScore: 2 },
      { name: 'relaxed', phrase: '', tokens: relaxedTokens, minScore: 1 },
    ];
  }

  function scoreEntry(entry, cycle) {
    if (!entry) return 0;
    const title = String(entry.title || entry.sectionTitle || '').toLowerCase();
    const summary = String(entry.description || '').toLowerCase();
    const keywords = String(entry.keywords || '').toLowerCase();
    const content = String(entry.content || '').toLowerCase();

    const haystack = [title, summary, keywords, content].join(' ');
    if (!haystack.trim()) return 0;

    let score = 0;
    if (cycle.phrase && cycle.phrase.length >= 4) {
      if (title.includes(cycle.phrase)) score += 8;
      if (summary.includes(cycle.phrase) || content.includes(cycle.phrase)) score += 5;
    }

    cycle.tokens.forEach((token) => {
      if (title.includes(token)) score += 4;
      if (keywords.includes(token)) score += 3;
      if (summary.includes(token)) score += 2;
      if (content.includes(token)) score += 1;
    });

    return score;
  }

  function runCycle(index, cycle, limit) {
    return index
      .map((entry) => ({ entry, score: scoreEntry(entry, cycle) }))
      .filter((item) => item.score >= cycle.minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async function loadSearchIndex() {
    if (state.index) return state.index;
    if (state.indexPromise) return state.indexPromise;

    state.indexPromise = (async () => {
      for (const url of SEARCH_INDEX_URLS) {
        try {
          const resp = await fetch(url, { cache: 'no-cache' });
          if (!resp.ok) continue;
          const data = await resp.json();
          if (data && Array.isArray(data.searchIndex)) {
            state.index = data.searchIndex;
            return state.index;
          }
        } catch {
          // try next
        }
      }
      state.index = [];
      return state.index;
    })();

    return state.indexPromise;
  }

  async function buildContext(query) {
    const index = await loadSearchIndex();
    if (!index || !index.length) return { items: [], meta: { cyclesUsed: 0, candidateCount: 0 } };

    const cycles = buildSearchCycles(query).filter((cycle) => cycle.tokens.length > 0 || cycle.phrase);
    if (!cycles.length) return { items: [], meta: { cyclesUsed: 0, candidateCount: 0 } };

    const candidateMap = new Map();
    let cyclesUsed = 0;

    for (const cycle of cycles) {
      cyclesUsed += 1;
      const hits = runCycle(index, cycle, CONFIG.maxContextItems * 6);

      hits.forEach((hit) => {
        const key = String(hit.entry.id || hit.entry.url || hit.entry.title || Math.random());
        const current = candidateMap.get(key);
        if (!current || hit.score > current.score) {
          candidateMap.set(key, { ...hit, cycle: cycle.name });
        }
      });

      if (candidateMap.size >= CONFIG.maxContextItems * 2) break;
    }

    const strictCycle = cycles[0];
    const rechecked = Array.from(candidateMap.values())
      .map((item) => {
        const recheckScore = scoreEntry(item.entry, strictCycle);
        return { ...item, finalScore: item.score + Math.floor(recheckScore * 0.5) };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, CONFIG.maxContextItems)
      .map((item) => item.entry);

    const items = rechecked.map((entry) => ({
      title: entry.title || entry.sectionTitle || entry.id || 'Untitled',
      url: entry.url || '',
      snippet: (entry.content || entry.description || '').slice(0, 800),
    }));

    return {
      items,
      meta: {
        cyclesUsed,
        candidateCount: candidateMap.size,
      },
    };
  }

  function extractSourceIndices(text) {
    const matches = String(text || '').match(/\[(\d+)\]/g) || [];
    const indices = new Set();
    matches.forEach((match) => {
      const num = parseInt(match.replace(/\D/g, ''), 10);
      if (!Number.isNaN(num)) indices.add(num);
    });
    return Array.from(indices).filter((n) => n > 0 && n <= CONFIG.maxContextItems);
  }

  async function handleSend() {
    const { input, send } = getElements();
    if (!input || !send) return;
    const text = sanitizeSearchInput(input.value);
    if (!text) return;

    addMessage('user', text);
    input.value = '';
    send.disabled = true;

    const typingNode = showTypingIndicator();

    const startedAt = Date.now();
    let attempts = 0;
    try {
      const contextBuild = await buildContext(text);
      const payload = {
        messages: state.messages,
        context: contextBuild.items,
        page: {
          title: document.title || '',
          url: window.location.pathname || '',
        },
      };

      let resp = null;
      let lastErrorText = '';
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts += 1;
        resp = await fetch('/api/learning-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (resp.ok) break;
        lastErrorText = await resp.text();

        if (window.trackApiFailure) {
          window.trackApiFailure({ endpoint: 'learning-assistant', status: resp.status, attempt: attempts, kind: 'chatbot' });
        }

        if (resp.status !== 429 && resp.status < 500) break;
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 300 * attempts));
        }
      }

      if (!resp || !resp.ok) {
        throw new Error(lastErrorText || 'Failed to reach the assistant.');
      }

      const data = await resp.json();
      const reply = data && data.reply ? String(data.reply) : 'Sorry, I did not get a response.';
      let sources = Array.isArray(data.sources) ? data.sources.slice(0, CONFIG.maxContextItems) : [];

      if (!sources.length) {
        const usedIndices = extractSourceIndices(reply);
        sources = usedIndices.map((idx) => contextBuild.items[idx - 1]).filter(Boolean);
      }

      if (window.trackRetrievalQuality) {
        const usedIndices = extractSourceIndices(reply);
        window.trackRetrievalQuality({
          kind: 'chatbot',
          sourceCount: sources.length,
          sourceHits: usedIndices.length,
          noSource: sources.length === 0,
          cycles: Number(data?.retrieval?.cyclesUsed) || Number(contextBuild.meta.cyclesUsed) || 0,
          retries: Math.max(0, attempts - 1),
          latencyMs: Date.now() - startedAt,
          candidateCount: Number(data?.retrieval?.candidateCount) || Number(contextBuild.meta.candidateCount) || 0,
          cache: String(data?.cache || ''),
        });
      }

      addMessage('assistant', reply, { sources });
    } catch (err) {
      addMessage('assistant', 'Sorry, I had trouble answering that. Please try again in a moment.');
      console.warn('Chatbot error:', err);
    } finally {
      removeTypingIndicator(typingNode);
      send.disabled = false;
    }
  }

  function bindEvents() {
    const { toggle, panel, input, send, clear } = getElements();
    if (!toggle || !panel || !input || !send) return;

    toggle.addEventListener('click', () => {
      state.isOpen = !state.isOpen;
      panel.classList.toggle('is-open', state.isOpen);
      toggle.setAttribute('aria-expanded', state.isOpen ? 'true' : 'false');
      if (state.isOpen && state.messages.length === 0) {
        addMessage('assistant', CONFIG.greeting);
      }
      if (state.isOpen) {
        setTimeout(() => input.focus(), 50);
      }
    });

    send.addEventListener('click', handleSend);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    });

    clear.addEventListener('click', () => {
      state.messages = [];
      const { messages } = getElements();
      if (messages) messages.innerHTML = '';
      addMessage('assistant', CONFIG.greeting);
    });
  }

  function init() {
    createWidget();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
