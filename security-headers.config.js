/**
 * Security Headers Configuration for GBS Learning Hub
 *
 * This configuration should be implemented in your web server or hosting platform:
 * - For Apache: Use .htaccess file
 * - For Nginx: Add to nginx.conf
 * - For Node.js/Express: Use helmet middleware
 * - For Netlify/Vercel: Use netlify.toml or vercel.json
 * - For Cloudflare: Use Page Rules or Workers
 */

const securityHeaders = {
    /**
     * Content Security Policy (CSP)
     * Prevents XSS attacks by controlling which resources can be loaded
     */
    'Content-Security-Policy': [
        // Default: Only allow resources from same origin
        "default-src 'self'",

        // Scripts: Allow self, inline scripts with nonces, and trusted CDNs
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net",

        // Styles: Allow self, inline styles, and Google Fonts
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

        // Fonts: Allow self and Google Fonts
        "font-src 'self' https://fonts.gstatic.com",

        // Images: Allow self, data URIs, and common image CDNs
        "img-src 'self' data: https:",

        // Frames: Allow self and Google Drive/Docs for video embedding
        "frame-src 'self' https://drive.google.com https://docs.google.com",

        // Connect (AJAX/fetch): Allow self and API endpoints
        "connect-src 'self' https://generativelanguage.googleapis.com",

        // Frame ancestors: Prevent clickjacking
        "frame-ancestors 'none'",

        // Base URI: Restrict base tag
        "base-uri 'self'",

        // Form actions: Restrict where forms can submit
        "form-action 'self'",

        // Upgrade insecure requests
        "upgrade-insecure-requests",
    ].join('; '),

    /**
     * X-Frame-Options
     * Prevents clickjacking attacks by controlling iframe embedding
     */
    'X-Frame-Options': 'DENY',

    /**
     * X-Content-Type-Options
     * Prevents MIME type sniffing
     */
    'X-Content-Type-Options': 'nosniff',

    /**
     * Referrer-Policy
     * Controls how much referrer information is sent
     */
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    /**
     * Permissions-Policy (formerly Feature-Policy)
     * Controls which browser features can be used
     */
    'Permissions-Policy': [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
    ].join(', '),

    /**
     * Strict-Transport-Security (HSTS)
     * Forces HTTPS connections (only use in production with HTTPS)
     */
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    /**
     * X-XSS-Protection
     * Legacy header for older browsers (mostly deprecated)
     */
    'X-XSS-Protection': '1; mode=block',
};

// Export for different platforms
module.exports = securityHeaders;

/**
 * IMPLEMENTATION EXAMPLES:
 *
 * 1. APACHE (.htaccess):
 *
 * <IfModule mod_headers.c>
 *     Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
 *     Header set X-Frame-Options "DENY"
 *     Header set X-Content-Type-Options "nosniff"
 *     Header set Referrer-Policy "strict-origin-when-cross-origin"
 *     Header set Permissions-Policy "geolocation=(), microphone=(), camera=()"
 * </IfModule>
 *
 *
 * 2. NGINX (nginx.conf):
 *
 * add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com" always;
 * add_header X-Frame-Options "DENY" always;
 * add_header X-Content-Type-Options "nosniff" always;
 * add_header Referrer-Policy "strict-origin-when-cross-origin" always;
 * add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
 *
 *
 * 3. NETLIFY (netlify.toml):
 *
 * [[headers]]
 *   for = "/*"
 *   [headers.values]
 *     Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
 *     X-Frame-Options = "DENY"
 *     X-Content-Type-Options = "nosniff"
 *     Referrer-Policy = "strict-origin-when-cross-origin"
 *     Permissions-Policy = "geolocation=(), microphone=(), camera=()"
 *
 *
 * 4. VERCEL (vercel.json):
 *
 * {
 *   "headers": [
 *     {
 *       "source": "/(.*)",
 *       "headers": [
 *         {
 *           "key": "Content-Security-Policy",
 *           "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
 *         },
 *         {
 *           "key": "X-Frame-Options",
 *           "value": "DENY"
 *         },
 *         {
 *           "key": "X-Content-Type-Options",
 *           "value": "nosniff"
 *         },
 *         {
 *           "key": "Referrer-Policy",
 *           "value": "strict-origin-when-cross-origin"
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 *
 * 5. NODE.JS/EXPRESS (server.js):
 *
 * const helmet = require('helmet');
 *
 * app.use(helmet({
 *     contentSecurityPolicy: {
 *         directives: {
 *             defaultSrc: ["'self'"],
 *             scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
 *             styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
 *             fontSrc: ["'self'", "https://fonts.gstatic.com"],
 *             imgSrc: ["'self'", "data:", "https:"],
 *             connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
 *             frameAncestors: ["'none'"],
 *         },
 *     },
 *     frameguard: { action: 'deny' },
 * }));
 */
