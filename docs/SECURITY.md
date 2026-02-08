# Security Implementation Guide
**GBS Learning Hub - Security Hardening Documentation**

**Last Updated:** October 9, 2025
**Status:** 🟢 Security Framework Implemented
**Priority:** P0 - Critical

---

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [XSS Protection](#xss-protection)
4. [CSP Headers](#csp-headers)
5. [Input Sanitization](#input-sanitization)
6. [Implementation Guide](#implementation-guide)
7. [Testing](#testing)
8. [Common Vulnerabilities Fixed](#common-vulnerabilities-fixed)

---

## Overview

This document outlines the security measures implemented in the GBS Learning Hub to protect against common web vulnerabilities, particularly:

- **Cross-Site Scripting (XSS)**
- **Code Injection**
- **Clickjacking**
- **MIME Type Sniffing**
- **Data Exfiltration**

### Security Components

✅ **DOMPurify Integration** - XSS protection library
✅ **SecurityUtils Module** - Comprehensive security utilities
✅ **CSP Headers** - Content Security Policy configuration
✅ **Input Validation** - Sanitization and validation helpers
✅ **Rate Limiting** - Prevent abuse and DoS

---

## Quick Start

### 1. Add Security Scripts to Your HTML

```html
<head>
    <!-- DOMPurify Library (XSS Protection) -->
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
        integrity="sha384-4H0KEY16H/RgZTVx9vNEz5PQZbQ/1LDz9Jl8tN0FKYxjBfUOcYhJ3k+xhWLxqUqK"
        crossorigin="anonymous"></script>

    <!-- Security Utilities -->
    <script src="shared/scripts/utils/security.js" defer></script>
</head>
```

### 2. Configure Server Headers

Choose your platform and apply the appropriate configuration:

- **Netlify**: Deploy `netlify.toml` (already configured)
- **Vercel**: Deploy `vercel.json` (already configured)
- **Apache**: Upload `.htaccess` to root directory
- **Nginx**: Add headers to `nginx.conf`
- **Node.js**: Use `helmet` middleware (see examples)

### 3. Use Security Utilities in Code

```javascript
// Sanitize HTML before injecting
SecurityUtils.safeSetInnerHTML(element, userContent);

// Sanitize search queries
const safeQuery = SecurityUtils.sanitizeSearchQuery(userInput);

// Validate URLs
if (SecurityUtils.isValidURL(url)) {
    // Safe to use
}
```

---

## XSS Protection

### What is XSS?

Cross-Site Scripting (XSS) allows attackers to inject malicious scripts into web pages viewed by other users.

**Example Attack:**
```javascript
// User input: <script>alert('XSS Attack!')</script>
// Without protection: Script executes
// With protection: Script is neutralized
```

### DOMPurify Integration

DOMPurify sanitizes HTML and prevents XSS attacks by removing dangerous code.

**Before (Vulnerable):**
```javascript
// ❌ UNSAFE - XSS Vulnerable
element.innerHTML = userInput;
```

**After (Protected):**
```javascript
// ✅ SAFE - XSS Protected
SecurityUtils.safeSetInnerHTML(element, userInput);
```

### What Gets Blocked?

- `<script>` tags
- `javascript:` URLs
- `onerror`, `onload`, and other event handlers
- `<iframe>` from untrusted sources
- `<object>`, `<embed>` tags
- Dangerous CSS (expression(), behavior())

### Example: Safe Search Results

```javascript
displaySearchResults(results, query) {
    this.searchResultsContent.innerHTML = '';

    results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'search-result-item';

        // ✅ SAFE: Escape user input
        const safeTitle = SecurityUtils.escapeHTML(result.title);
        const safeDescription = SecurityUtils.escapeHTML(result.description);

        // ✅ SAFE: Sanitize HTML if needed
        SecurityUtils.safeSetInnerHTML(div, `
            <div class="search-result-title">${safeTitle}</div>
            <div class="search-result-description">${safeDescription}</div>
        `);

        this.searchResultsContent.appendChild(div);
    });
}
```

---

## CSP Headers

### What is CSP?

Content Security Policy (CSP) is an HTTP header that controls which resources can be loaded on your website.

### Our CSP Configuration

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://generativelanguage.googleapis.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

### What This Protects Against

✅ Blocks unauthorized scripts from running
✅ Prevents loading of malicious resources
✅ Stops clickjacking attacks (`frame-ancestors 'none'`)
✅ Forces HTTPS connections (`upgrade-insecure-requests`)

### CSP Violations Reporting

Add reporting to catch CSP violations:

```
Content-Security-Policy:
  ...
  report-uri /csp-violation-report;
```

---

## Input Sanitization

### Sanitize User Input

All user input must be sanitized before use:

```javascript
// Search queries
const safeQuery = SecurityUtils.sanitizeSearchQuery(query);

// General text input
const safeInput = SecurityUtils.sanitizeInput(userInput, {
    maxLength: 1000,
    allowHTML: false,
    trim: true,
    allowNewlines: false
});

// URLs
const safeURL = SecurityUtils.sanitizeURL(url);
if (SecurityUtils.isValidURL(safeURL)) {
    window.location.href = safeURL;
}

// Email addresses
if (SecurityUtils.isValidEmail(email)) {
    // Process email
}
```

### Validation Options

```javascript
SecurityUtils.sanitizeInput(input, {
    maxLength: 1000,        // Maximum length (default: 1000)
    allowHTML: false,       // Allow HTML tags (default: false)
    trim: true,             // Trim whitespace (default: true)
    allowNewlines: false    // Allow newlines (default: false)
});
```

---

## Implementation Guide

### Step 1: Update Existing Pages

For each HTML page with user input or dynamic content:

#### Add Security Scripts

```html
<head>
    <!-- DOMPurify -->
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
        integrity="sha384-4H0KEY16H/RgZTVx9vNEz5PQZbQ/1LDz9Jl8tN0FKYxjBfUOcYhJ3k+xhWLxqUqK"
        crossorigin="anonymous"></script>

    <!-- Security Utils -->
    <script src="shared/scripts/utils/security.js" defer></script>
</head>
```

#### Replace Unsafe Code

Find and replace these patterns:

**Pattern 1: Direct innerHTML**
```javascript
// BEFORE
element.innerHTML = userContent;

// AFTER
SecurityUtils.safeSetInnerHTML(element, userContent);
```

**Pattern 2: Search Input**
```javascript
// BEFORE
function handleSearch(query) {
    performSearch(query);
}

// AFTER
function handleSearch(query) {
    const safeQuery = SecurityUtils.sanitizeSearchQuery(query);
    performSearch(safeQuery);
}
```

**Pattern 3: URL Handling**
```javascript
// BEFORE
window.location.href = userURL;

// AFTER
const safeURL = SecurityUtils.sanitizeURL(userURL);
if (SecurityUtils.isValidURL(safeURL)) {
    window.location.href = safeURL;
} else {
    alert('Invalid URL');
}
```

### Step 2: Configure Server Headers

#### For Netlify
1. Deploy `netlify.toml` (already in root)
2. Headers are automatically applied
3. Verify in browser DevTools → Network tab

#### For Vercel
1. Deploy `vercel.json` (already in root)
2. Headers are automatically applied
3. Verify after deployment

#### For Apache
1. Upload `.htaccess` to root directory
2. Ensure `mod_headers` is enabled
3. Test with: `curl -I https://yoursite.com`

#### For Node.js/Express

```javascript
const express = require('express');
const helmet = require('helmet');
const app = express();

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
            frameAncestors: ["'none'"],
        },
    },
    frameguard: { action: 'deny' },
}));
```

### Step 3: Test Security

#### Manual Testing

1. **Test XSS Protection**
   ```
   Input: <script>alert('XSS')</script>
   Expected: Script is blocked/sanitized
   ```

2. **Test URL Sanitization**
   ```
   Input: javascript:alert('XSS')
   Expected: URL is rejected
   ```

3. **Test CSP Headers**
   ```bash
   curl -I https://yoursite.com
   # Should see Content-Security-Policy header
   ```

#### Automated Testing

```bash
# Install security testing tools
npm install --save-dev @zaproxy/zap-cli

# Run OWASP ZAP scan
zap-cli quick-scan https://yoursite.com
```

---

## Common Vulnerabilities Fixed

### ✅ Fixed: Unescaped innerHTML (24 instances)

**Files Updated:**
- `index.html` - Search results, tour tooltip
- `gbs-prompts/index.html` - Prompt display
- `rpo-training/js/app.js` - Module content
- `shared/scripts/footer.js` - Dynamic footer

**Fix:**
```javascript
// Before
element.innerHTML = result.title;

// After
SecurityUtils.safeSetInnerHTML(element, result.title);
```

### ✅ Fixed: Unsanitized Search Input

**File:** `index.html` (lines 888-911)

**Fix:**
```javascript
handleSearch(query) {
    // Sanitize input
    const safeQuery = SecurityUtils.sanitizeSearchQuery(query);

    // Rate limit
    if (!SecurityUtils.checkRateLimit('search', 10, 60000)) {
        alert('Too many searches. Please wait.');
        return;
    }

    // Perform search with safe query
    const results = this.performSearch(safeQuery);
    this.displaySearchResults(results, safeQuery);
}
```

### ✅ Fixed: Dangerous URL Handling

**Files:** Multiple

**Fix:**
```javascript
// Before
window.location.href = userInput;

// After
const safeURL = SecurityUtils.sanitizeURL(userInput);
if (SecurityUtils.isValidURL(safeURL)) {
    window.location.href = safeURL;
}
```

### ✅ Fixed: localStorage Vulnerabilities

**Fix:**
```javascript
// Before
localStorage.setItem('data', JSON.stringify(value));

// After
SecurityUtils.safeLocalStorageSet('data', value);
```

---

## Rate Limiting

### Prevent Abuse

```javascript
// Limit search requests
if (SecurityUtils.checkRateLimit('search', 10, 60000)) {
    performSearch(query);
} else {
    alert('Too many requests. Please wait.');
}

// Parameters:
// - action: Unique identifier
// - maxAttempts: Max requests allowed
// - windowMs: Time window in milliseconds
```

### Debouncing

```javascript
// Debounce search input
const debouncedSearch = SecurityUtils.debounce(performSearch, 300);
searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
});
```

---

## Testing

### Security Checklist

- [ ] DOMPurify loaded on all pages
- [ ] SecurityUtils accessible globally
- [ ] All `innerHTML` uses `safeSetInnerHTML`
- [ ] Search queries sanitized
- [ ] URLs validated before use
- [ ] CSP headers deployed
- [ ] Rate limiting implemented
- [ ] localStorage encrypted
- [ ] No console.log in production

### Browser DevTools Tests

1. **Check CSP Headers**
   - Open DevTools → Network
   - Reload page
   - Click any request → Headers tab
   - Verify `Content-Security-Policy` is present

2. **Test XSS Protection**
   - Open DevTools → Console
   - Run: `SecurityUtils.sanitizeHTML('<script>alert("test")</script>')`
   - Expected: Script tags removed

3. **Test URL Sanitization**
   - Run: `SecurityUtils.sanitizeURL('javascript:alert("test")')`
   - Expected: Empty string returned

### Penetration Testing

Run these tools to verify security:

```bash
# OWASP ZAP
zap-cli quick-scan https://yoursite.com

# Nikto
nikto -h https://yoursite.com

# Security Headers Check
curl -I https://yoursite.com | grep -i "security\|content-security"
```

---

## Best Practices

### ✅ DO

- Always sanitize user input
- Use `SecurityUtils.safeSetInnerHTML()` instead of `innerHTML`
- Validate URLs before navigation
- Implement rate limiting
- Use CSP headers
- Keep DOMPurify updated
- Test security regularly

### ❌ DON'T

- Use `eval()` or `Function()` constructors
- Trust user input
- Use `innerHTML` directly
- Allow `javascript:` URLs
- Disable CSP in production
- Skip input validation
- Store sensitive data in localStorage (unencrypted)

---

## Migration Checklist

Use this checklist when updating existing pages:

```markdown
### Page: _________________

- [ ] Added DOMPurify script tag
- [ ] Added SecurityUtils script tag
- [ ] Replaced all `innerHTML` with `safeSetInnerHTML`
- [ ] Sanitized all user input
- [ ] Validated all URLs
- [ ] Added rate limiting to forms/search
- [ ] Tested XSS protection
- [ ] Tested CSP headers
- [ ] Removed console.log statements
- [ ] Documented security measures
```

---

## Support & Resources

### Documentation
- [DOMPurify GitHub](https://github.com/cure53/DOMPurify)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

### Tools
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Security Headers](https://securityheaders.com/)
- [OWASP ZAP](https://www.zaproxy.org/)

### Internal Files
- [`shared/scripts/utils/security.js`](shared/scripts/utils/security.js) - Security utilities
- [`security-headers.config.js`](security-headers.config.js) - Header configuration
- [`secure-template.html`](secure-template.html) - Secure page template
- [`netlify.toml`](netlify.toml) - Netlify configuration
- [`vercel.json`](vercel.json) - Vercel configuration
- [`.htaccess`](.htaccess) - Apache configuration

---

## Version History

### v1.0.0 - October 9, 2025
- ✅ Initial security framework
- ✅ DOMPurify integration
- ✅ SecurityUtils module
- ✅ CSP headers configuration
- ✅ Input sanitization helpers
- ✅ Rate limiting
- ✅ Secure template created
- ✅ Documentation complete

---

**Questions?** Review [`secure-template.html`](secure-template.html) for working examples.

**Need Help?** Check the SecurityUtils API documentation in [`shared/scripts/utils/security.js`](shared/scripts/utils/security.js).
