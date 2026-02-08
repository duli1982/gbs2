# Contact Form - Quick Start Guide

## 🚀 Super Quick Setup (4 Steps)

### ✅ Step 1: Create Sheet (5 minutes)
```
1. Go to: https://script.google.com
2. New Project
3. Paste code from: 1-SETUP-CreateSheet.gs
4. Run > createContactFormSheet
5. Authorize when asked
6. COPY the Sheet ID from logs
```

### ✅ Step 2: Create Web App (5 minutes)
```
1. Go to: https://script.google.com (NEW project!)
2. New Project
3. Paste code from: 2-WEBAPP-ReceiveSubmissions.gs
4. Replace 'YOUR_SHEET_ID_HERE' with your Sheet ID
5. Deploy > New deployment > Web app
   - Execute as: Me
   - Who has access: Anyone ⚠️
6. COPY the Web App URL
```

### ✅ Step 3: Update Website (1 minute)
```
1. Open: contact-us/index.html
2. Find line ~470:
   const APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
3. Replace with your Web App URL
4. Save
```

### ✅ Step 4: Deploy & Test (2 minutes)
```
1. Push to GitHub (if using Vercel)
2. Test the form on your website
3. Check your Google Sheet - submissions appear!
```

---

## 📁 Files You Need

| File | Purpose | Where to Use |
|------|---------|--------------|
| `1-SETUP-CreateSheet.gs` | Creates Google Sheet | Google Apps Script (Project 1) |
| `2-WEBAPP-ReceiveSubmissions.gs` | Receives form data | Google Apps Script (Project 2) |
| `README-SETUP-GUIDE.md` | Detailed instructions | Read this for full guide |

---

## ⚠️ Common Mistakes

❌ **Using same Apps Script project for both scripts**
✅ Create TWO separate projects

❌ **Setting "Who has access" to "Only myself"**
✅ Must be set to "Anyone"

❌ **Forgetting to copy Sheet ID**
✅ Copy from logs or Sheet URL

❌ **Not updating the Web App URL in HTML**
✅ Replace the placeholder in contact-us/index.html

---

## 🎯 What Gets Saved in Sheet

Every contact form submission saves:
- ⏰ Timestamp
- 👤 Name
- 📧 Email
- 🏷️ Inquiry Type
- 📝 Subject
- 💬 Message
- 🏢 Company
- 💼 Department/Role

---

## 🔄 When You Update the Script

After editing `2-WEBAPP-ReceiveSubmissions.gs`:

```
1. Deploy > Manage deployments
2. Click pencil icon (edit)
3. Version: New version
4. Deploy
```

**URL stays the same** - no need to update website!

---

## 📧 Enable Email Notifications (Optional)

In `2-WEBAPP-ReceiveSubmissions.gs`, find this:
```javascript
/*
var adminEmail = 'your-admin-email@company.com';
sendEmailNotification(adminEmail, params);
*/
```

Remove `/*` and `*/`, add your email, re-deploy!

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Sheet not found | Check Sheet ID is correct |
| Authorization error | Set "Anyone" can access |
| Form doesn't submit | Check Web App URL in HTML |
| No data in sheet | Check Apps Script > Executions tab |

---

## ✨ You're Done!

Once set up:
- ✅ Automatic contact form handling
- ✅ All data in Google Sheets
- ✅ Optional email notifications
- ✅ Easy to export/analyze

Need detailed help? Read: **README-SETUP-GUIDE.md**
