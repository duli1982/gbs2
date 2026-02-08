/**
 * CONTACT FORM WEB APP SCRIPT
 * ============================
 *
 * This script receives contact form submissions from your website
 * and saves them to a Google Sheet.
 *
 * HOW TO SET UP:
 * 1. First, run the "1-SETUP-CreateSheet.gs" script to create your Google Sheet
 * 2. Copy the Sheet ID from step 1
 * 3. Open a NEW Google Apps Script project: https://script.google.com
 * 4. Copy this entire script and paste it
 * 5. Replace 'YOUR_SHEET_ID_HERE' below with your actual Sheet ID
 * 6. Click "Deploy" > "New deployment"
 * 7. Click "Select type" > "Web app"
 * 8. Fill in:
 *    - Description: "Contact Form Handler"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (important!)
 * 9. Click "Deploy"
 * 10. Copy the Web App URL
 * 11. Paste the URL into your contact-us/index.html file (replace APPS_SCRIPT_URL)
 *
 * IMPORTANT: After making changes to this script:
 * - Click "Deploy" > "Manage deployments"
 * - Click the edit icon (pencil)
 * - Change "Version" to "New version"
 * - Click "Deploy"
 */

// ============================================
// CONFIGURATION - CHANGE THIS!
// ============================================
var SHEET_ID = 'YOUR_SHEET_ID_HERE'; // Replace with your Sheet ID from step 1
var SHEET_NAME = 'Submissions'; // Name of the tab in your sheet

// ============================================
// MAIN FUNCTION - Receives POST requests
// ============================================
function doPost(e) {
  try {
    // Log the incoming request for debugging
    Logger.log('📨 Received POST request');

    // Get the form data
    var params = e.parameter;

    // Validate required fields
    if (!params.name || !params.email || !params.inquiryType || !params.subject || !params.message) {
      Logger.log('❌ Missing required fields');
      return ContentService.createTextOutput(JSON.stringify({
        'status': 'error',
        'message': 'Missing required fields'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Open the spreadsheet and sheet
    var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      Logger.log('❌ Sheet not found: ' + SHEET_NAME);
      return ContentService.createTextOutput(JSON.stringify({
        'status': 'error',
        'message': 'Sheet not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Get current timestamp
    var timestamp = new Date();

    // Prepare the row data (must match header order in setup script)
    var rowData = [
      timestamp,                        // Timestamp
      params.name || '',                // Name
      params.email || '',               // Email
      params.inquiryType || '',         // Inquiry Type
      params.subject || '',             // Subject
      params.message || '',             // Message
      params.company || '',             // Company
      params.role || ''                 // Department/Role
    ];

    // Append the row to the sheet
    sheet.appendRow(rowData);

    // Log success
    Logger.log('✅ Contact form submission saved successfully');
    Logger.log('From: ' + params.name + ' (' + params.email + ')');
    Logger.log('Type: ' + params.inquiryType);

    // Optional: Send email notification to admin
    // Uncomment the following lines if you want to receive email notifications
    /*
    var adminEmail = 'your-admin-email@company.com'; // Replace with your email
    sendEmailNotification(adminEmail, params);
    */

    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'message': 'Contact form submitted successfully'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Log the error
    Logger.log('❌ Error in doPost: ' + error.message);

    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// OPTIONAL: Email Notification Function
// ============================================
function sendEmailNotification(adminEmail, params) {
  try {
    var subject = '📧 New Contact Form Submission: ' + params.inquiryType;

    var body = 'You have received a new contact form submission.\n\n' +
               '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
               'CONTACT DETAILS\n' +
               '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
               'Name: ' + params.name + '\n' +
               'Email: ' + params.email + '\n' +
               'Company: ' + (params.company || 'Not provided') + '\n' +
               'Role: ' + (params.role || 'Not provided') + '\n\n' +
               '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
               'INQUIRY DETAILS\n' +
               '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
               'Type: ' + params.inquiryType + '\n' +
               'Subject: ' + params.subject + '\n\n' +
               'Message:\n' + params.message + '\n\n' +
               '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
               'View all submissions in your Google Sheet:\n' +
               SpreadsheetApp.openById(SHEET_ID).getUrl() + '\n' +
               '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
               'This is an automated message from GBS EMEA Contact Form.';

    MailApp.sendEmail(adminEmail, subject, body);
    Logger.log('📧 Email notification sent to: ' + adminEmail);

  } catch (error) {
    Logger.log('❌ Error sending email: ' + error.message);
  }
}

// ============================================
// TEST FUNCTION - For testing the script
// ============================================
function doGet(e) {
  // This function handles GET requests (for testing in browser)
  var html = '<html><body>' +
             '<h1>GBS EMEA Contact Form Handler</h1>' +
             '<p>✅ Web App is running successfully!</p>' +
             '<p>This endpoint accepts POST requests from the contact form.</p>' +
             '<p>Sheet ID: ' + SHEET_ID + '</p>' +
             '<p>Current Time: ' + new Date() + '</p>' +
             '</body></html>';

  return HtmlService.createHtmlOutput(html);
}

// ============================================
// UTILITY: Manual Test Submission
// ============================================
function testSubmission() {
  // Create a fake submission to test if everything works
  var testData = {
    parameter: {
      formType: 'contact',
      name: 'Test User',
      email: 'test@example.com',
      inquiryType: 'General Support',
      subject: 'Test Submission',
      message: 'This is a test message to verify the contact form is working correctly.',
      company: 'Test Company',
      role: 'Tester'
    }
  };

  var result = doPost(testData);
  Logger.log('Test Result: ' + result.getContent());
}
