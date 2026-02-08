# Security Update Guide
**Step-by-Step Instructions for Updating All Pages**

---

## ✅ What Was Already Updated

### index.html - COMPLETE ✅
- Added DOMPurify script
- Added SecurityUtils script
- Updated search functionality with sanitization
- Added rate limiting (20 searches/min)
- Added safe URL handling

---

## 🔄 Pages That Need Updating

Based on the XSS vulnerability audit, these pages use `innerHTML` and need security updates:

### High Priority (User Input Pages)
1. `gbs-prompts/index.html` - Prompt library with search
2. `appscript-bank/index.html` - User submissions
3. `feedback/get-entry-ids.html` - Form processing
4. `onboarding/results.html` - Dynamic results
5. `onboarding/index.html` - User assessment

### Medium Priority (Dynamic Content Pages)
6. `use-cases/index.html` - Success stories display
7. `daily-focus/index.html` - Dynamic card loading
8. `ai-help/ai-help.html` - AI examples
9. `ai-simulations/ai-simulations.html` - Interactive content
10. `gbs-ai-workshop/index.html` - Workshop content
11. `onboarding-flow/results.html` - Assessment results

### Medium Priority (Training Modules)
12. `rpo-training/ai-tools-lab.html` - Tools with user input
13. `rpo-training/pathways/advanced.html` - Module navigation
14. `rpo-training/pathways/intermediate.html` - Module navigation
15. `rpo-training/pathways/beginner.html` - Module navigation
16. `rpo-training/pathways/modules/beginner-3-simulation.html` - Simulation
17. `rpo-training/pathways/modules/beginner-4.html` - Module content
18. `rpo-training/pathways/modules/intermediate-1.html` - Module content
19. `rpo-training/pathways/modules/intermediate-4.html` - Module content

### Low Priority (Utility Scripts)
20. `shared/scripts/footer.js` - Dynamic footer
21. `rpo-training/js/app.js` - App functionality

---

## 📋 Update Template

For **each HTML page**, follow these steps:

### Step 1: Add Security Scripts to `<head>`

Add this code **before** the Tailwind CSS script:

```html
<!-- Add this BEFORE Tailwind -->
<!-- Security: DOMPurify for XSS Protection -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
    integrity="sha384-4H0KEY16H/RgZTVx9vNEz5PQZbQ/1LDz9Jl8tN0FKYxjBfUOcYhJ3k+xhWLxqUqK"
    crossorigin="anonymous"></script>

<script src="https://cdn.tailwindcss.com"></script>
```

### Step 2: Add SecurityUtils Script

Add this **before** your page scripts (usually before `</body>`):

```html
<!-- Security Utilities -->
<script src="../shared/scripts/utils/security.js"></script>

<!-- Your page scripts -->
<script src="your-script.js"></script>
```

**Note:** Adjust the path based on folder depth:
- Root level: `shared/scripts/utils/security.js`
- One level deep: `../shared/scripts/utils/security.js`
- Two levels deep: `../../shared/scripts/utils/security.js`

### Step 3: Update Code Patterns

Find and replace these unsafe patterns:

#### Pattern 1: Direct innerHTML Assignment

```javascript
// ❌ BEFORE (Unsafe)
element.innerHTML = userContent;

// ✅ AFTER (Safe)
if (typeof SecurityUtils !== 'undefined') {
    SecurityUtils.safeSetInnerHTML(element, userContent);
} else {
    element.innerHTML = userContent; // Fallback
}
```

#### Pattern 2: Search/Input Handling

```javascript
// ❌ BEFORE (Unsafe)
function handleSearch(query) {
    performSearch(query);
}

// ✅ AFTER (Safe)
function handleSearch(query) {
    // Sanitize input
    const safeQuery = typeof SecurityUtils !== 'undefined'
        ? SecurityUtils.sanitizeSearchQuery(query)
        : query.trim();

    // Rate limiting
    if (typeof SecurityUtils !== 'undefined') {
        if (!SecurityUtils.checkRateLimit('search', 10, 60000)) {
            alert('Too many requests. Please wait.');
            return;
        }
    }

    performSearch(safeQuery);
}
```

#### Pattern 3: URL Navigation

```javascript
// ❌ BEFORE (Unsafe)
window.location.href = userUrl;

// ✅ AFTER (Safe)
if (typeof SecurityUtils !== 'undefined') {
    const safeUrl = SecurityUtils.sanitizeURL(userUrl);
    if (safeUrl) {
        window.location.href = safeUrl;
    }
} else {
    window.location.href = userUrl; // Fallback
}
```

#### Pattern 4: Form Input Processing

```javascript
// ❌ BEFORE (Unsafe)
const email = document.getElementById('email').value;
sendEmail(email);

// ✅ AFTER (Safe)
const emailInput = document.getElementById('email').value;
if (typeof SecurityUtils !== 'undefined') {
    if (SecurityUtils.isValidEmail(emailInput)) {
        sendEmail(emailInput);
    } else {
        alert('Invalid email address');
    }
} else {
    sendEmail(emailInput);
}
```

---

## 🎯 Specific File Updates

### gbs-prompts/index.html

This file has a search function and displays prompt content.

**Changes needed:**
1. Add security scripts to `<head>`
2. Add SecurityUtils script
3. Find the search function and add sanitization:

```javascript
// In your search function
function searchPrompts(query) {
    const safeQuery = SecurityUtils.sanitizeSearchQuery(query);
    // ... rest of search logic
}
```

4. Find where prompts are displayed (innerHTML) and wrap with:

```javascript
SecurityUtils.safeSetInnerHTML(promptElement, promptHTML);
```

### rpo-training/ai-tools-lab.html

This file has user input tools.

**Changes needed:**
1. Add security scripts
2. Find all form inputs and validate:

```javascript
const userInput = document.getElementById('input').value;
const safeInput = SecurityUtils.sanitizeInput(userInput, {
    maxLength: 5000,
    allowHTML: false
});
```

3. Update any innerHTML usage with SecurityUtils

### onboarding/results.html

This file displays personalized results.

**Changes needed:**
1. Add security scripts
2. Sanitize any data from localStorage:

```javascript
// Instead of:
const userData = JSON.parse(localStorage.getItem('userData'));

// Use:
const userData = SecurityUtils.safeLocalStorageGet('userData');
```

3. Sanitize before displaying results

---

## ⚡ Quick Update Script

You can use this pattern for faster updates:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Page</title>

    <!-- STEP 1: Add DOMPurify -->
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
        integrity="sha384-4H0KEY16H/RgZTVx9vNEz5PQZbQ/1LDz9Jl8tN0FKYxjBfUOcYhJ3k+xhWLxqUqK"
        crossorigin="anonymous"></script>

    <!-- Other head content -->
</head>
<body>
    <!-- Page content -->

    <!-- STEP 2: Add SecurityUtils BEFORE other scripts -->
    <script src="../shared/scripts/utils/security.js"></script>

    <!-- Your page scripts -->
    <script>
        // STEP 3: Use SecurityUtils in your code
        // Example:
        function displayContent(html) {
            const container = document.getElementById('container');
            SecurityUtils.safeSetInnerHTML(container, html);
        }
    </script>
</body>
</html>
```

---

## ✅ Testing Checklist

After updating each page:

### Browser Console Test
```javascript
// 1. Check if loaded
console.log(typeof SecurityUtils); // Should be "object"
console.log(typeof DOMPurify);     // Should be "object"

// 2. Test XSS protection
SecurityUtils.sanitizeHTML('<script>alert("XSS")</script>');
// Should return empty string or safe HTML

// 3. Test input sanitization
SecurityUtils.sanitizeSearchQuery('<script>test</script>');
// Should return sanitized text
```

### Manual Testing
- [ ] Page loads without errors
- [ ] Search works (if applicable)
- [ ] Forms submit correctly (if applicable)
- [ ] No JavaScript console errors
- [ ] Try injecting `<script>alert('XSS')</script>` - should be blocked

### Visual Testing
- [ ] Page looks normal
- [ ] All functionality works
- [ ] No broken features

---

## 📊 Progress Tracker

Track your updates here:

### High Priority
- [ ] gbs-prompts/index.html
- [ ] appscript-bank/index.html
- [ ] feedback/get-entry-ids.html
- [ ] onboarding/results.html
- [ ] onboarding/index.html

### Medium Priority (Dynamic Content)
- [ ] use-cases/index.html
- [ ] daily-focus/index.html
- [ ] ai-help/ai-help.html
- [ ] ai-simulations/ai-simulations.html
- [ ] gbs-ai-workshop/index.html
- [ ] onboarding-flow/results.html

### Medium Priority (Training)
- [ ] rpo-training/ai-tools-lab.html
- [ ] rpo-training/pathways/advanced.html
- [ ] rpo-training/pathways/intermediate.html
- [ ] rpo-training/pathways/beginner.html
- [ ] rpo-training/pathways/modules/*.html (8 files)

### Low Priority
- [ ] shared/scripts/footer.js
- [ ] rpo-training/js/app.js

---

## 🚨 Common Issues

### Issue: SecurityUtils is undefined
**Solution:** Make sure you load `security.js` before using it. Add it before your page scripts.

### Issue: DOMPurify is undefined
**Solution:** Check that the DOMPurify script loads successfully. Check browser console for errors.

### Issue: Content not displaying
**Solution:** Check console for errors. The safeSetInnerHTML might be too restrictive. Try using `escapeHTML` instead for plain text.

### Issue: Rate limiting blocks legitimate use
**Solution:** Adjust the parameters in `checkRateLimit()`. Increase the max attempts or time window.

---

## 💡 Pro Tips

1. **Test as you go** - Update one page, test it, then move to the next
2. **Keep fallbacks** - Always include `else` clause for when SecurityUtils isn't loaded
3. **Check console** - Browser console will show security errors
4. **Use the template** - Copy from `secure-template.html` for examples
5. **Document changes** - Add comments explaining why you're using SecurityUtils

---

## 📞 Need Help?

- **Examples:** See `secure-template.html`
- **API Reference:** Check `shared/scripts/utils/security.js`
- **Quick Reference:** Read `SECURITY-QUICK-REFERENCE.md`
- **Full Guide:** Review `SECURITY.md`

---

## 🎯 Goal

✅ All pages protected against XSS
✅ All user input sanitized
✅ All URLs validated
✅ Rate limiting on search/forms
✅ No security warnings in console

---

**Start with high-priority pages and work your way down. Good luck!** 🚀
