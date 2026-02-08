# Contact Form - Google Apps Script Setup Guide

This guide will help you connect your contact form to Google Sheets using Google Apps Script.

## 📋 What You'll Need
- Google Account
- 10-15 minutes
- The two script files in this folder

---

## 🎯 STEP 1: Create the Google Sheet

### 1.1 Open Google Apps Script
1. Go to https://script.google.com
2. Click **"New project"**
3. You'll see an empty code editor

### 1.2 Copy the Setup Script
1. Open the file: `1-SETUP-CreateSheet.gs`
2. Copy **ALL** the code
3. Paste it into the Google Apps Script editor
4. Delete any existing code first

### 1.3 Save and Run
1. Click the **💾 Save** icon (or press `Ctrl+S`)
2. Name your project: **"Contact Form Setup"**
3. Click the **▶️ Run** button at the top
4. Select function: **`createContactFormSheet`**
5. Click **Run**

### 1.4 Authorize the Script
First time running, you'll need to authorize:
1. Click **"Review permissions"**
2. Choose your Google account
3. Click **"Advanced"** (bottom left)
4. Click **"Go to Contact Form Setup (unsafe)"**
5. Click **"Allow"**

### 1.5 Get Your Sheet ID
After running successfully:
1. Check the **Logs** (View > Logs or `Ctrl+Enter`)
2. You'll see something like:
   ```
   ✅ Contact Form Sheet created successfully!
   📊 Sheet Name: Contact Form Submissions
   📝 Sheet ID: 1a2b3c4d5e6f7g8h9i0j...
   ```
3. **COPY THE SHEET ID** - you'll need it in Step 2!

You can also:
- Check your Google Drive - a new sheet called **"Contact Form Submissions"** was created
- Open the sheet and copy the ID from the URL:
  ```
  https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_SHEET_ID]/edit
  ```

---

## 🌐 STEP 2: Create the Web App

### 2.1 Create a NEW Apps Script Project
1. Go to https://script.google.com
2. Click **"New project"** again (yes, a NEW one!)
3. This will be a separate project for the web app

### 2.2 Copy the Web App Script
1. Open the file: `2-WEBAPP-ReceiveSubmissions.gs`
2. Copy **ALL** the code
3. Paste it into the new Apps Script editor
4. Delete any existing code first

### 2.3 Configure the Sheet ID
1. Find this line near the top:
   ```javascript
   var SHEET_ID = 'YOUR_SHEET_ID_HERE';
   ```
2. Replace `'YOUR_SHEET_ID_HERE'` with your actual Sheet ID from Step 1.5
3. Example:
   ```javascript
   var SHEET_ID = '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t';
   ```

### 2.4 Save the Script
1. Click **💾 Save** (or press `Ctrl+S`)
2. Name it: **"Contact Form Web App"**

### 2.5 Deploy as Web App
1. Click **"Deploy"** > **"New deployment"**
2. Click the gear icon ⚙️ next to "Select type"
3. Select **"Web app"**
4. Fill in the settings:
   - **Description:** "Contact Form Handler"
   - **Execute as:** "Me" (your email)
   - **Who has access:** **"Anyone"** ⚠️ (IMPORTANT!)
5. Click **"Deploy"**

### 2.6 Authorize the Web App
1. Click **"Authorize access"**
2. Choose your Google account
3. Click **"Advanced"** > **"Go to Contact Form Web App (unsafe)"**
4. Click **"Allow"**

### 2.7 Get Your Web App URL
After deployment:
1. You'll see a **"Web app URL"** - something like:
   ```
   https://script.google.com/macros/s/AKfycbz.../exec
   ```
2. **COPY THIS ENTIRE URL** - you'll need it for Step 3!
3. Click **"Done"**

---

## 🔗 STEP 3: Connect to Your Website

### 3.1 Update the Contact Form
1. Open your file: `contact-us/index.html`
2. Find this line (around line 470):
   ```javascript
   const APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
3. Replace it with your Web App URL from Step 2.7:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz.../exec';
   ```
4. Save the file

### 3.2 Deploy to Vercel
If your site is on Vercel:
1. Commit and push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Add Google Apps Script URL for contact form"
   git push
   ```
2. Vercel will automatically deploy the changes

---

## ✅ STEP 4: Test Your Contact Form

### 4.1 Test in Apps Script First
1. Go back to your Web App project in Apps Script
2. Click **Run** > **`testSubmission`**
3. Check your Google Sheet - you should see a test entry!

### 4.2 Test on Your Website
1. Go to your contact form page
2. Fill out the form completely
3. Click **"Send Message"**
4. You should see a success message
5. Check your Google Sheet - the submission should appear!

### 4.3 Test the Web App URL Directly
1. Paste your Web App URL in a browser
2. You should see:
   ```
   ✅ Web App is running successfully!
   This endpoint accepts POST requests from the contact form.
   ```

---

## 🔧 Troubleshooting

### ❌ Error: "Sheet not found"
- Make sure you copied the correct Sheet ID in Step 2.3
- Check that the sheet name is exactly "Submissions"

### ❌ Error: "Authorization required"
- Make sure you set "Who has access" to **"Anyone"** in Step 2.5
- Re-deploy the web app with the correct settings

### ❌ Form submits but nothing appears in Sheet
- Check the Apps Script logs: `View > Executions`
- Make sure the Web App URL in your HTML is correct
- Try running `testSubmission()` in Apps Script

### ❌ CORS Error
- This shouldn't happen with the hidden form method
- Make sure you're using the POST method, not fetch/AJAX

### 📧 Want Email Notifications?
In `2-WEBAPP-ReceiveSubmissions.gs`, find this section:
```javascript
// Optional: Send email notification to admin
// Uncomment the following lines if you want to receive email notifications
/*
var adminEmail = 'your-admin-email@company.com'; // Replace with your email
sendEmailNotification(adminEmail, params);
*/
```

1. Remove the `/*` and `*/`
2. Replace `'your-admin-email@company.com'` with your actual email
3. Re-deploy the web app (Step 2.5, but choose "Manage deployments" > Edit > New version)

---

## 🎉 Success!

Your contact form is now connected to Google Sheets!

Every submission will be automatically saved with:
- Timestamp
- Name
- Email
- Inquiry Type
- Subject
- Message
- Company
- Department/Role

You can:
- Sort and filter submissions
- Export to Excel/CSV
- Set up email notifications
- Create charts and analytics

---

## 📝 Important Notes

### When You Make Changes to the Web App Script:
1. Edit your code
2. Click **"Deploy"** > **"Manage deployments"**
3. Click the edit icon (pencil) next to your deployment
4. Change **"Version"** to **"New version"**
5. Click **"Deploy"**
6. The URL stays the same - no need to update your website!

### Sheet Columns Match Form Fields:
The order in the sheet matches the form:
1. Timestamp
2. Name
3. Email
4. Inquiry Type
5. Subject
6. Message
7. Company
8. Department/Role

Don't change the column order in the sheet or the setup script!

---

## 🆘 Need Help?

Common issues:
- **Authorization errors:** Make sure "Anyone" can access the web app
- **Sheet ID errors:** Double-check you copied the entire ID correctly
- **Form not submitting:** Check browser console for errors (F12)

Good luck! 🚀
