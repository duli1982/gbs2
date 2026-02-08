/**
 * Security Utilities for GBS Learning Hub
 * Provides XSS protection, input sanitization, and security helpers
 */

// Import DOMPurify from CDN (will be loaded in HTML)
// <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>

const SecurityUtils = {
    /**
     * Sanitize HTML content to prevent XSS attacks
     * @param {string} dirty - Untrusted HTML content
     * @param {object} config - DOMPurify configuration options
     * @returns {string} Sanitized HTML
     */
    sanitizeHTML(dirty, config = {}) {
        if (typeof DOMPurify === 'undefined') {
            console.error('DOMPurify is not loaded! Falling back to text-only sanitization.');
            return this.escapeHTML(dirty);
        }

        const defaultConfig = {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            ALLOWED_ATTR: ['href', 'title', 'class', 'id', 'style'],
            ALLOW_DATA_ATTR: false,
            KEEP_CONTENT: true,
        };

        const mergedConfig = { ...defaultConfig, ...config };
        return DOMPurify.sanitize(dirty, mergedConfig);
    },

    /**
     * Escape HTML special characters (fallback when DOMPurify unavailable)
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHTML(text) {
        if (typeof text !== 'string') return '';

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Safely set innerHTML with sanitization
     * @param {HTMLElement} element - Target element
     * @param {string} html - HTML content to set
     * @param {object} config - DOMPurify configuration
     */
    safeSetInnerHTML(element, html, config = {}) {
        if (!element) {
            console.error('Invalid element provided to safeSetInnerHTML');
            return;
        }
        element.innerHTML = this.sanitizeHTML(html, config);
    },

    /**
     * Validate and sanitize user input
     * @param {string} input - User input
     * @param {object} options - Validation options
     * @returns {string} Sanitized input
     */
    sanitizeInput(input, options = {}) {
        const {
            maxLength = 1000,
            allowHTML = false,
            trim = true,
            allowNewlines = false,
        } = options;

        if (typeof input !== 'string') return '';

        let sanitized = input;

        // Trim if needed
        if (trim) {
            sanitized = sanitized.trim();
        }

        // Remove newlines if not allowed
        if (!allowNewlines) {
            sanitized = sanitized.replace(/[\r\n]+/g, ' ');
        }

        // Truncate to max length
        if (maxLength && sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        // Sanitize HTML if not allowed
        if (!allowHTML) {
            sanitized = this.escapeHTML(sanitized);
        } else {
            sanitized = this.sanitizeHTML(sanitized);
        }

        return sanitized;
    },

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @param {array} allowedProtocols - Allowed protocols
     * @returns {boolean} True if valid
     */
    isValidURL(url, allowedProtocols = ['http:', 'https:']) {
        try {
            const urlObj = new URL(url);
            return allowedProtocols.includes(urlObj.protocol);
        } catch {
            return false;
        }
    },

    /**
     * Sanitize URL to prevent javascript: and data: protocols
     * @param {string} url - URL to sanitize
     * @returns {string} Safe URL or empty string
     */
    sanitizeURL(url) {
        if (!url || typeof url !== 'string') return '';

        const trimmed = url.trim().toLowerCase();

        // Block dangerous protocols
        const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
        for (const protocol of dangerousProtocols) {
            if (trimmed.startsWith(protocol)) {
                console.warn(`Blocked dangerous URL protocol: ${protocol}`);
                return '';
            }
        }

        return url.trim();
    },

    /**
     * Create safe text node (prevents XSS)
     * @param {string} text - Text content
     * @returns {Text} Text node
     */
    createSafeTextNode(text) {
        return document.createTextNode(text || '');
    },

    /**
     * Safely append text to element
     * @param {HTMLElement} element - Target element
     * @param {string} text - Text to append
     */
    safeAppendText(element, text) {
        if (!element) return;
        element.appendChild(this.createSafeTextNode(text));
    },

    /**
     * Validate search query input
     * @param {string} query - Search query
     * @returns {string} Sanitized query
     */
    sanitizeSearchQuery(query) {
        if (typeof query !== 'string') return '';
        return query
            .normalize('NFKC')
            .replace(/[\u0000-\u001F\u007F]/g, ' ')
            .replace(/[<>`"'\\]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 200);
    },

    /**
     * Generate Content Security Policy nonce
     * @returns {string} Random nonce
     */
    generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Check if localStorage is available and safe to use
     * @returns {boolean} True if safe
     */
    isLocalStorageSafe() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Safely store data in localStorage with basic encryption
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     */
    safeLocalStorageSet(key, value) {
        if (!this.isLocalStorageSafe()) {
            console.warn('localStorage not available');
            return false;
        }

        try {
            const sanitizedKey = this.sanitizeInput(key, { maxLength: 100 });
            const jsonValue = JSON.stringify(value);
            // Basic obfuscation (not cryptographic encryption, but better than plain text)
            const encoded = btoa(encodeURIComponent(jsonValue));
            localStorage.setItem(sanitizedKey, encoded);
            return true;
        } catch (error) {
            console.error('Error storing in localStorage:', error);
            return false;
        }
    },

    /**
     * Safely retrieve data from localStorage
     * @param {string} key - Storage key
     * @returns {any} Retrieved value or null
     */
    safeLocalStorageGet(key) {
        if (!this.isLocalStorageSafe()) return null;

        try {
            const sanitizedKey = this.sanitizeInput(key, { maxLength: 100 });
            const encoded = localStorage.getItem(sanitizedKey);
            if (!encoded) return null;

            const jsonValue = decodeURIComponent(atob(encoded));
            return JSON.parse(jsonValue);
        } catch (error) {
            console.error('Error retrieving from localStorage:', error);
            return null;
        }
    },

    /**
     * Rate limiting helper
     * @param {string} action - Action identifier
     * @param {number} maxAttempts - Max attempts allowed
     * @param {number} windowMs - Time window in milliseconds
     * @returns {boolean} True if action is allowed
     */
    checkRateLimit(action, maxAttempts = 10, windowMs = 60000, minIntervalMs = 0) {
        const key = `ratelimit_${action}`;
        const now = Date.now();
        const minGapKey = `${key}_last`;

        let attempts = this.safeLocalStorageGet(key) || [];

        // Remove old attempts outside the window
        attempts = attempts.filter(timestamp => now - timestamp < windowMs);

        // Optional burst guard: reject if calls are too close together
        if (minIntervalMs > 0) {
            const lastTs = Number(this.safeLocalStorageGet(minGapKey)) || 0;
            if (lastTs && (now - lastTs) < minIntervalMs) {
                console.warn(`Rate limit interval exceeded for action: ${action}`);
                return false;
            }
        }

        if (attempts.length >= maxAttempts) {
            console.warn(`Rate limit exceeded for action: ${action}`);
            return false;
        }

        attempts.push(now);
        this.safeLocalStorageSet(key, attempts);
        this.safeLocalStorageSet(minGapKey, now);
        return true;
    },

    /**
     * Debounce function to prevent excessive function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
};

// Make SecurityUtils available globally
if (typeof window !== 'undefined') {
    window.SecurityUtils = SecurityUtils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityUtils;
}
