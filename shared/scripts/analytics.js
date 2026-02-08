/**
 * GDPR-Compliant Google Analytics Configuration
 * GBS EMEA Learning Hub
 *
 * This script only initializes Google Analytics after user consent is obtained.
 * It respects the cookie consent settings and complies with GDPR requirements.
 */

// Initialize dataLayer
window.dataLayer = window.dataLayer || [];
function gtag() {
    dataLayer.push(arguments);
}

// Capture this script's URL while document.currentScript is still available.
const ANALYTICS_SCRIPT_SRC = (document.currentScript && document.currentScript.src) ? String(document.currentScript.src) : '';

// Google Analytics ID
const GA_TRACKING_ID = 'G-RGZJ52VXFF';

// Flag to track if GA has been initialized
let analyticsInitialized = false;

// Default to disabled until explicit consent (important if gtag.js is loaded in the HTML head).
window['ga-disable-' + GA_TRACKING_ID] = true;

// Google Consent Mode v2: default to denied until the user consents.
// This is safe even if GA is never loaded; if GA is loaded, it stays in restricted mode until update.
try {
    gtag('consent', 'default', {
        ad_storage: 'denied',
        analytics_storage: 'denied',
        functionality_storage: 'denied',
        personalization_storage: 'denied',
        security_storage: 'granted',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500
    });
} catch { }

// Queue events until analytics is initialized (after consent)
const pendingTelemetry = [];
const PENDING_TELEMETRY_MAX = 200;

function enqueueTelemetry(item) {
    pendingTelemetry.push({ ...item, queuedAt: Date.now() });
    if (pendingTelemetry.length > PENDING_TELEMETRY_MAX) pendingTelemetry.shift();
}

function safeString(value, maxLen = 120) {
    if (value == null) return '';
    const text = String(value);
    return text.length > maxLen ? text.slice(0, maxLen) : text;
}

function safePath(urlString) {
    try {
        const u = new URL(urlString, window.location.origin);
        return `${u.origin}${u.pathname}`;
    } catch {
        return safeString(urlString, 200);
    }
}

function sendUsageEvent(name, data) {
    try {
        fetch('/api/analytics/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, data: data, ts: Date.now() }),
            keepalive: true
        }).catch(function() { });
    } catch { }
}

function flushTelemetryQueue() {
    if (!analyticsInitialized) return;
    while (pendingTelemetry.length) {
        const item = pendingTelemetry.shift();
        if (!item) continue;
        if (item.type === 'event') {
            gtag('event', item.name, item.params || {});
        } else if (item.type === 'page_view') {
            gtag('config', GA_TRACKING_ID, {
                page_path: item.pagePath,
                page_title: item.pageTitle
            });
        }
    }
}

let autoTrackingInitialized = false;
function initAutoTracking() {
    if (autoTrackingInitialized) return;
    autoTrackingInitialized = true;

    // UTM attribution (captured once per session)
    try {
        const params = new URLSearchParams(window.location.search);
        const utm_source = params.get('utm_source');
        const utm_medium = params.get('utm_medium');
        const utm_campaign = params.get('utm_campaign');
        const utm_content = params.get('utm_content');
        const utm_term = params.get('utm_term');
        const hasAny = Boolean(utm_source || utm_medium || utm_campaign || utm_content || utm_term);
        const sent = sessionStorage.getItem('utm_attribution_sent') === '1';
        if (hasAny && !sent) {
            window.trackEvent('utm_attribution', {
                utm_source: safeString(utm_source, 80),
                utm_medium: safeString(utm_medium, 80),
                utm_campaign: safeString(utm_campaign, 120),
                utm_content: safeString(utm_content, 120),
                utm_term: safeString(utm_term, 120)
            });
            sessionStorage.setItem('utm_attribution_sent', '1');
        }
    } catch { }

    // Simple 404/route-not-found detection
    try {
        const path = window.location.pathname || '';
        const title = (document.title || '').toLowerCase();
        const looks404 = path.includes('404') || title.includes('404') || title.includes('not found');
        if (looks404) {
            window.trackEvent('route_not_found', {
                page_path: safeString(path, 200),
                page_title: safeString(document.title, 120)
            });
        }
    } catch { }

    // Outbound click tracking + file download tracking
    document.addEventListener('click', function (event) {
        const target = event.target && event.target.closest ? event.target.closest('a') : null;
        if (!target || !target.href) return;

        let url;
        try {
            url = new URL(target.href, window.location.href);
        } catch {
            return;
        }

        const isExternal = url.origin !== window.location.origin;
        const pathname = url.pathname || '';
        const fileMatch = pathname.match(/\.([a-z0-9]{2,6})$/i);
        const isDownload = Boolean(target.hasAttribute('download') || fileMatch);

        if (isDownload) {
            window.trackEvent('file_download', {
                file_path: safeString(pathname, 200),
                file_extension: fileMatch ? safeString(fileMatch[1].toLowerCase(), 10) : ''
            });
            return;
        }

        if (isExternal) {
            window.trackEvent('outbound_click', {
                link_url: safePath(url.toString())
            });
        }
    }, true);

    // Scroll depth tracking (25/50/75/90)
    const thresholds = [25, 50, 75, 90];
    const seen = new Set();
    let scrollTicking = false;
    function onScroll() {
        if (scrollTicking) return;
        scrollTicking = true;
        window.requestAnimationFrame(() => {
            scrollTicking = false;
            const doc = document.documentElement;
            const scrollTop = window.scrollY || doc.scrollTop || 0;
            const height = Math.max(1, (doc.scrollHeight || 0) - (window.innerHeight || 0));
            const percent = Math.min(100, Math.round((scrollTop / height) * 100));
            for (const t of thresholds) {
                if (percent >= t && !seen.has(t)) {
                    seen.add(t);
                    window.trackEvent('scroll_depth', { percent: t });
                }
            }
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Error tracking (respect consent by queueing until GA is ready)
    window.addEventListener('error', function (e) {
        try {
            window.trackEvent('js_error', {
                message: safeString(e.message, 200),
                source: safeString(e.filename, 160),
                lineno: e.lineno || 0,
                colno: e.colno || 0,
                page_path: safeString(window.location.pathname, 200)
            });
        } catch { }
    });

    window.addEventListener('unhandledrejection', function (e) {
        try {
            const reason = e.reason;
            const message = (reason && reason.message) ? reason.message : String(reason);
            window.trackEvent('promise_rejection', {
                message: safeString(message, 200),
                page_path: safeString(window.location.pathname, 200)
            });
        } catch { }
    });
}

let cookieConsentLoadAttempted = false;
function ensureCookieConsentLoaded() {
    if (typeof CookieConsentManager !== 'undefined' || window.cookieConsentManager) return;
    if (cookieConsentLoadAttempted) return;
    cookieConsentLoadAttempted = true;

    try {
        const candidates = [];
        if (ANALYTICS_SCRIPT_SRC) {
            candidates.push(new URL('./cookie-consent.js', ANALYTICS_SCRIPT_SRC).toString());
        }
        // Fallback for simple local servers that serve files from project root.
        candidates.push('/shared/scripts/cookie-consent.js');
        candidates.push('./shared/scripts/cookie-consent.js');
        candidates.push('./cookie-consent.js');

        const tryLoadAt = (idx) => {
            if (idx >= candidates.length) {
                console.warn('Failed to load cookie-consent.js; analytics will remain disabled until consent is available.');
                return;
            }

            const script = document.createElement('script');
            script.src = candidates[idx];
            script.async = true;
            script.onload = function () {
                checkAnalyticsConsent();
            };
            script.onerror = function () {
                tryLoadAt(idx + 1);
            };
            document.head.appendChild(script);
        };

        tryLoadAt(0);
    } catch {
        // ignore
    }
}

/**
 * Enable Google Analytics after consent
 */
window.enableAnalytics = function() {
    // Prevent double initialization
    if (analyticsInitialized) {
        console.log('Google Analytics already initialized');
        return;
    }

    console.log('Initializing Google Analytics with user consent');
    window['ga-disable-' + GA_TRACKING_ID] = false;

    // Consent Mode v2: grant analytics storage (keep ads denied).
    try {
        gtag('consent', 'update', {
            ad_storage: 'denied',
            analytics_storage: 'granted',
            functionality_storage: 'granted',
            personalization_storage: 'denied',
            security_storage: 'granted',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
    } catch { }

    // Configure Google Analytics (queued until gtag.js loads).
    gtag('js', new Date());
    gtag('config', GA_TRACKING_ID, {
        anonymize_ip: true, // Anonymize IP addresses for privacy
        cookie_flags: 'SameSite=Lax;Secure', // Secure cookie settings
        cookie_expires: 63072000 // 2 years in seconds (GA default)
    });

    // Load Google Analytics script (only after consent)
    const existing = document.querySelector(`script[src^="https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}"]`);
    if (!existing) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
        script.onerror = function() {
            console.error('Failed to load Google Analytics');
        };
        document.head.appendChild(script);
    }

    analyticsInitialized = true;
    console.log('Google Analytics initialized successfully');

    flushTelemetryQueue();
    initAutoTracking();

    // Dispatch event for other scripts to know GA is ready
    window.dispatchEvent(new CustomEvent('analyticsReady'));
};

/**
 * Disable Google Analytics
 */
window.disableAnalytics = function() {
    // Set Google Analytics opt-out property
    window['ga-disable-' + GA_TRACKING_ID] = true;
    console.log('Google Analytics disabled');

    try {
        gtag('consent', 'update', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            functionality_storage: 'denied',
            personalization_storage: 'denied',
            security_storage: 'granted',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
    } catch { }
};

/**
 * Check if analytics consent has been given and enable if so
 */
function checkAnalyticsConsent() {
    ensureCookieConsentLoaded();

    // Check if cookie consent exists
    if (typeof window.cookieConsent !== 'undefined' && window.cookieConsent.analytics) {
        window.enableAnalytics();
    } else if (typeof CookieConsentManager !== 'undefined' && CookieConsentManager.hasAnalyticsConsent()) {
        window.enableAnalytics();
    }
}

/**
 * Listen for cookie consent updates
 */
window.addEventListener('cookieConsentUpdate', function(event) {
    const preferences = event.detail;

    if (preferences.analytics && !analyticsInitialized) {
        // User consented to analytics
        window.enableAnalytics();
    } else if (!preferences.analytics && analyticsInitialized) {
        // User revoked consent
        window.disableAnalytics();
    }
});

/**
 * Custom event tracking function (only works if consent given)
 */
window.trackEvent = function(eventName, eventParams = {}) {
    if (!analyticsInitialized) {
        enqueueTelemetry({ type: 'event', name: eventName, params: eventParams });
        return;
    }

    gtag('event', eventName, eventParams);
    console.log('Event tracked:', eventName, eventParams);
};

/**
 * Custom page view tracking
 */
window.trackPageView = function(pagePath, pageTitle) {
    if (!analyticsInitialized) {
        enqueueTelemetry({ type: 'page_view', pagePath: pagePath || window.location.pathname, pageTitle: pageTitle || document.title });
        return;
    }

    gtag('config', GA_TRACKING_ID, {
        'page_path': pagePath || window.location.pathname,
        'page_title': pageTitle || document.title
    });
};

/**
 * Standardized API error tracking helper
 * (Never include request bodies/user-entered text in params.)
 */
window.trackApiFailure = function({ endpoint = '', status = 0, attempt = 0, kind = '' } = {}) {
    window.trackEvent('api_failure', {
        endpoint: safeString(endpoint, 120),
        status: Number(status) || 0,
        attempt: Number(attempt) || 0,
        kind: safeString(kind, 40),
        page_path: safeString(window.location.pathname, 200)
    });
};

/**
 * Retrieval quality telemetry for chatbot/search grounding.
 * Never include raw queries or message bodies.
 */
window.trackRetrievalQuality = function({
    kind = '',
    sourceCount = 0,
    sourceHits = 0,
    noSource = false,
    cycles = 0,
    retries = 0,
    latencyMs = 0,
    candidateCount = 0,
    cache = ''
} = {}) {
    var payload = {
        kind: safeString(kind, 40),
        source_count: Number(sourceCount) || 0,
        source_hits: Number(sourceHits) || 0,
        no_source: Boolean(noSource),
        cycles: Number(cycles) || 0,
        retries: Number(retries) || 0,
        latency_ms: Number(latencyMs) || 0,
        candidate_count: Number(candidateCount) || 0,
        cache: safeString(cache, 20),
        page_path: safeString(window.location.pathname, 200)
    };

    window.trackEvent('retrieval_quality', payload);
    if (analyticsInitialized) {
        sendUsageEvent('retrieval_quality', payload);
    }
};

// Check for existing consent on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAnalyticsConsent);
} else {
    // DOM already loaded
    checkAnalyticsConsent();
}

// Also check periodically in case cookie consent loads later
let consentCheckAttempts = 0;
const consentCheckInterval = setInterval(function() {
    if (analyticsInitialized || consentCheckAttempts > 20) {
        // Stop checking if analytics initialized or after 10 seconds
        clearInterval(consentCheckInterval);
        return;
    }

    checkAnalyticsConsent();
    consentCheckAttempts++;
}, 500);

// Export for debugging
window.analyticsDebug = {
    isInitialized: () => analyticsInitialized,
    hasConsent: () => window.cookieConsent && window.cookieConsent.analytics,
    trackingId: GA_TRACKING_ID
};

function shouldLoadChatbotAssets() {
    if (window.GBS_DISABLE_CHATBOT) return false;
    if (!document.body) return true;
    return document.body.getAttribute('data-chatbot') !== 'off';
}

function loadChatbotAssets() {
    if (!shouldLoadChatbotAssets()) return;
    if (document.querySelector('script[data-gbs-chatbot="1"]')) return;

    const scriptCandidates = [];
    const styleCandidates = [];

    if (ANALYTICS_SCRIPT_SRC) {
        try {
            scriptCandidates.push(new URL('./components/chatbot.js', ANALYTICS_SCRIPT_SRC).toString());
            styleCandidates.push(new URL('../styles/chatbot.css', ANALYTICS_SCRIPT_SRC).toString());
        } catch { }
    }

    scriptCandidates.push('/shared/scripts/components/chatbot.js');
    styleCandidates.push('/shared/styles/chatbot.css');

    const loadStyle = (idx) => {
        if (idx >= styleCandidates.length) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = styleCandidates[idx];
        link.onerror = function () {
            loadStyle(idx + 1);
        };
        document.head.appendChild(link);
    };

    const loadScript = (idx) => {
        if (idx >= scriptCandidates.length) return;
        const script = document.createElement('script');
        script.src = scriptCandidates[idx];
        script.defer = true;
        script.dataset.gbsChatbot = '1';
        script.onerror = function () {
            loadScript(idx + 1);
        };
        document.head.appendChild(script);
    };

    loadStyle(0);
    loadScript(0);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadChatbotAssets);
} else {
    loadChatbotAssets();
}

console.log('Analytics script loaded - waiting for user consent');
