/**
 * CONTACT FORM SETUP SCRIPT
 * ========================
 *
 * This script creates a Google Sheet to store contact form submissions.
 *
 * HOW TO USE:
 * 1. Open Google Apps Script: https://script.google.com
 * 2. Click "New Project"
 * 3. Copy this entire script and paste it
 * 4. Click the disk icon to save (name it "Contact Form Setup")
 * 5. Click "Run" button (▶) and select "createContactFormSheet"
 * 6. Authorize the script when prompted
 * 7. Check your Google Drive - a new sheet called "Contact Form Submissions" will be created
 * 8. Open that sheet and note the URL - you'll need the Sheet ID later
 */

function createContactFormSheet() {
  // Create a new spreadsheet
  var spreadsheet = SpreadsheetApp.create('Contact Form Submissions');

  // Get the active sheet
  var sheet = spreadsheet.getActiveSheet();
  sheet.setName('Submissions');

  // Set up headers
  var headers = [
    'Timestamp',
    'Name',
    'Email',
    'Inquiry Type',
    'Subject',
    'Message',
    'Company',
    'Department/Role'
  ];

  // Add headers to the first row
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format the header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4A90E2');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setHorizontalAlignment('center');

  // Set column widths for better readability
  sheet.setColumnWidth(1, 150);  // Timestamp
  sheet.setColumnWidth(2, 150);  // Name
  sheet.setColumnWidth(3, 200);  // Email
  sheet.setColumnWidth(4, 150);  // Inquiry Type
  sheet.setColumnWidth(5, 250);  // Subject
  sheet.setColumnWidth(6, 400);  // Message
  sheet.setColumnWidth(7, 150);  // Company
  sheet.setColumnWidth(8, 150);  // Department/Role

  // Freeze the header row
  sheet.setFrozenRows(1);

  // Add a filter to the sheet
  sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).createFilter();

  // Log success message
  Logger.log('✅ Contact Form Sheet created successfully!');
  Logger.log('📊 Sheet Name: Contact Form Submissions');
  Logger.log('🔗 URL: ' + spreadsheet.getUrl());
  Logger.log('📝 Sheet ID: ' + spreadsheet.getId());
  Logger.log('\n⚠️ IMPORTANT: Copy the Sheet ID above - you will need it for the Web App script!');

  // Show alert with information
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    '✅ Success!',
    'Contact Form Sheet created successfully!\n\n' +
    'Sheet ID: ' + spreadsheet.getId() + '\n\n' +
    'Please copy this Sheet ID - you will need it for the Web App script.\n\n' +
    'You can find the sheet in your Google Drive.',
    ui.ButtonSet.OK
  );

  // Return the spreadsheet for reference
  return spreadsheet;
}

/**
 * Optional: Function to test if the sheet was created correctly
 */
function testSheetCreation() {
  var sheetId = 'YOUR_SHEET_ID_HERE'; // Replace with your sheet ID

  try {
    var spreadsheet = SpreadsheetApp.openById(sheetId);
    var sheet = spreadsheet.getSheetByName('Submissions');

    if (sheet) {
      Logger.log('✅ Sheet found and accessible!');
      Logger.log('📊 Headers: ' + sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues());
    } else {
      Logger.log('❌ Sheet "Submissions" not found!');
    }
  } catch (e) {
    Logger.log('❌ Error accessing sheet: ' + e.message);
  }
}
