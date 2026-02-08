# Security Quick Reference Guide
**GBS Learning Hub - Quick Security Cheat Sheet**

---

## 🚨 Before You Code

**Golden Rule:** Never trust user input. Always sanitize, validate, and escape.

---

## Common Patterns

### ✅ Safe HTML Injection

```javascript
// ❌ NEVER DO THIS
element.innerHTML = userInput;

// ✅ ALWAYS DO THIS
SecurityUtils.safeSetInnerHTML(element, userInput);
```

### ✅ Safe Text Content

```javascript
// ✅ For plain text (best)
element.textContent = userInput;

// ✅ Or use helper
SecurityUtils.safeAppendText(element, userInput);
```

### ✅ Sanitize Search Queries

```javascript
// ❌ NEVER DO THIS
performSearch(userQuery);

// ✅ ALWAYS DO THIS
const safeQuery = SecurityUtils.sanitizeSearchQuery(userQuery);
performSearch(safeQuery);
```

### ✅ Validate URLs

```javascript
// ❌ NEVER DO THIS
window.location.href = userURL;

// ✅ ALWAYS DO THIS
const safeURL = SecurityUtils.sanitizeURL(userURL);
if (SecurityUtils.isValidURL(safeURL)) {
    window.location.href = safeURL;
} else {
    console.error('Invalid URL');
}
```

### ✅ Validate Email

```javascript
if (SecurityUtils.isValidEmail(email)) {
    sendEmail(email);
} else {
    alert('Invalid email address');
}
```

### ✅ Rate Limiting

```javascript
// Limit to 10 requests per 60 seconds
if (SecurityUtils.checkRateLimit('action-name', 10, 60000)) {
    performAction();
} else {
    alert('Too many requests. Please wait.');
}
```

### ✅ Debounce Input

```javascript
const debouncedFunction = SecurityUtils.debounce(yourFunction, 300);
input.addEventListener('input', debouncedFunction);
```

### ✅ Safe localStorage

```javascript
// ❌ NEVER DO THIS
localStorage.setItem('data', JSON.stringify(value));

// ✅ ALWAYS DO THIS (encoded)
SecurityUtils.safeLocalStorageSet('data', value);
const data = SecurityUtils.safeLocalStorageGet('data');
```

---

## HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Page</title>

    <!-- REQUIRED: DOMPurify for XSS protection -->
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
        integrity="sha384-4H0KEY16H/RgZTVx9vNEz5PQZbQ/1LDz9Jl8tN0FKYxjBfUOcYhJ3k+xhWLxqUqK"
        crossorigin="anonymous"></script>

    <!-- REQUIRED: Security utilities -->
    <script src="shared/scripts/utils/security.js" defer></script>
</head>
<body>
    <!-- Your content -->

    <script>
        // Your secure code here
    </script>
</body>
</html>
```

---

## SecurityUtils API

### HTML Sanitization

| Method | Purpose | Example |
|--------|---------|---------|
| `sanitizeHTML(html)` | Remove dangerous HTML | `SecurityUtils.sanitizeHTML(userHTML)` |
| `escapeHTML(text)` | Escape HTML characters | `SecurityUtils.escapeHTML(userText)` |
| `safeSetInnerHTML(el, html)` | Safely set innerHTML | `SecurityUtils.safeSetInnerHTML(div, html)` |

### Input Validation

| Method | Purpose | Example |
|--------|---------|---------|
| `sanitizeInput(input, opts)` | General input sanitization | `SecurityUtils.sanitizeInput(text, {maxLength: 100})` |
| `sanitizeSearchQuery(query)` | Sanitize search queries | `SecurityUtils.sanitizeSearchQuery(q)` |
| `isValidEmail(email)` | Validate email | `SecurityUtils.isValidEmail('test@example.com')` |
| `isValidURL(url)` | Validate URL | `SecurityUtils.isValidURL('https://example.com')` |
| `sanitizeURL(url)` | Sanitize URL | `SecurityUtils.sanitizeURL(userURL)` |

### Security Helpers

| Method | Purpose | Example |
|--------|---------|---------|
| `checkRateLimit(action, max, window)` | Rate limiting | `SecurityUtils.checkRateLimit('search', 10, 60000)` |
| `debounce(func, wait)` | Debounce function | `SecurityUtils.debounce(fn, 300)` |
| `safeLocalStorageSet(key, val)` | Safe localStorage write | `SecurityUtils.safeLocalStorageSet('key', data)` |
| `safeLocalStorageGet(key)` | Safe localStorage read | `SecurityUtils.safeLocalStorageGet('key')` |

---

## Server Headers (Choose Your Platform)

### Netlify
✅ Already configured in `netlify.toml`

### Vercel
✅ Already configured in `vercel.json`

### Apache
✅ Upload `.htaccess` to root directory

### Nginx
Add to `nginx.conf`:
```nginx
add_header Content-Security-Policy "default-src 'self'..." always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
```

### Node.js/Express
```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## Testing Checklist

- [ ] DOMPurify loaded? → Check console: `typeof DOMPurify`
- [ ] SecurityUtils loaded? → Check console: `typeof SecurityUtils`
- [ ] CSP headers? → DevTools → Network → Headers tab
- [ ] XSS protection? → Try: `SecurityUtils.sanitizeHTML('<script>alert(1)</script>')`
- [ ] URL validation? → Try: `SecurityUtils.sanitizeURL('javascript:alert(1)')`
- [ ] No console.log in code?

---

## Quick Security Audit

Run this in browser console on any page:

```javascript
// Check if security is loaded
console.log('DOMPurify:', typeof DOMPurify !== 'undefined' ? '✅' : '❌');
console.log('SecurityUtils:', typeof SecurityUtils !== 'undefined' ? '✅' : '❌');

// Find unsafe innerHTML usage
const scripts = document.querySelectorAll('script');
let unsafeHTML = 0;
scripts.forEach(script => {
    if (script.textContent.includes('.innerHTML =')) {
        unsafeHTML++;
    }
});
console.log('Unsafe .innerHTML found:', unsafeHTML);

// Test XSS protection
if (typeof SecurityUtils !== 'undefined') {
    const testHTML = '<script>alert("XSS")</script>';
    const sanitized = SecurityUtils.sanitizeHTML(testHTML);
    console.log('XSS Test:', !sanitized.includes('<script') ? '✅ Protected' : '❌ Vulnerable');
}
```

---

## Common Mistakes to Avoid

### ❌ Don't Do This

```javascript
// Direct innerHTML
element.innerHTML = userInput;

// Unescaped user data
element.innerHTML = `<div>${userInput}</div>`;

// Unvalidated URLs
window.location.href = userURL;

// Direct eval
eval(userCode);

// Trusting URL parameters
const userId = new URLSearchParams(location.search).get('id');
fetch(`/api/user/${userId}`); // No validation!
```

### ✅ Do This Instead

```javascript
// Safe innerHTML
SecurityUtils.safeSetInnerHTML(element, userInput);

// Escaped data
element.textContent = userInput;

// Validated URLs
const url = SecurityUtils.sanitizeURL(userURL);
if (SecurityUtils.isValidURL(url)) window.location.href = url;

// Never use eval
// Use JSON.parse or other safe alternatives

// Validate URL parameters
const userId = new URLSearchParams(location.search).get('id');
const safeId = SecurityUtils.sanitizeInput(userId, {maxLength: 50});
if (/^[0-9]+$/.test(safeId)) fetch(`/api/user/${safeId}`);
```

---

## Emergency: XSS Found

If you discover an XSS vulnerability:

1. **Identify the input source**
   ```javascript
   // Where does the unsafe data come from?
   // - User form input?
   // - URL parameters?
   // - localStorage?
   ```

2. **Sanitize immediately**
   ```javascript
   // Before
   element.innerHTML = userInput;

   // After
   SecurityUtils.safeSetInnerHTML(element, userInput);
   ```

3. **Test the fix**
   ```javascript
   // Try to inject
   const testInput = '<script>alert("XSS")</script>';
   SecurityUtils.safeSetInnerHTML(element, testInput);
   // Should NOT execute alert
   ```

4. **Document it**
   - Add comment in code
   - Update SECURITY.md
   - Add to CHANGELOG.md

---

## Need More Help?

📖 **Full Documentation:** [`SECURITY.md`](SECURITY.md)
🔧 **Code Examples:** [`secure-template.html`](secure-template.html)
💻 **Source Code:** [`shared/scripts/utils/security.js`](shared/scripts/utils/security.js)

---

**Remember:** Security is not optional. Every line of code that handles user input must be protected.
