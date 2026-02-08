# Google Form Setup Instructions for AppScript Idea Bank

## Step 1: Create Google Form

1. Go to [forms.google.com](https://forms.google.com)
2. Create new form: "GBS EMEA - AppScript Idea Bank"
3. Add these questions in exact order:

### Question 1: Idea Title (Short answer, Required)
Description: "Brief title for your automation idea"

### Question 2: Description (Paragraph, Required)
Description: "Explain the problem this idea solves, how it would work, and its potential benefits"

### Question 3: Business Unit (Multiple choice, Required)
Options:
- RPO
- MSP
- Admin
- Compliance
- Interview Scheduling
- Other

## Step 2: Get Form Action URL

1. Click "Send" button in your form
2. Click the link icon (<>)
3. Copy the form URL (looks like: https://docs.google.com/forms/d/e/FORM_ID/viewform)
4. Replace `/viewform` with `/formResponse` to get action URL

## Step 3: Get Entry IDs

1. Go to your form's preview/live version
2. Right-click and select "View Page Source"
3. Search for "entry." to find field names like:
   - entry.123456789 (for idea title)
   - entry.987654321 (for description)
   - entry.555666777 (for business unit)

## Step 4: Update HTML Form

Replace these placeholders in appscript-bank/index.html:

- `YOUR_GOOGLE_FORM_ACTION_URL` → Your form's /formResponse URL
- `IDEA_TITLE_ENTRY_ID` → entry ID for idea title question
- `DESCRIPTION_ENTRY_ID` → entry ID for description question
- `BUSINESS_UNIT_ENTRY_ID` → entry ID for business unit question

## Step 5: Connect to Google Sheets

1. In your Google Form, click "Responses" tab
2. Click the Google Sheets icon to create a connected spreadsheet
3. All form submissions will automatically appear in this sheet

## Example Entry IDs (yours will be different):

```
entry.1234567890 - Idea Title
entry.0987654321 - Description
entry.1122334455 - Business Unit
```

## Testing

1. After updating the form, test it by submitting an idea
2. Check that the success message appears
3. Verify the submission appears in your Google Sheets