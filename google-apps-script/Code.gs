const RESPONSE_SHEET = 'Responses';

function doPost(event) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(RESPONSE_SHEET) || spreadsheet.insertSheet(RESPONSE_SHEET);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Submitted at', 'Name', 'Role', 'Response', 'Message']);
    sheet.setFrozenRows(1);
  }

  const data = JSON.parse(event.postData.contents);
  sheet.appendRow([
    data.submittedAt || new Date().toISOString(),
    data.name || '',
    data.role || '',
    data.response || 'Joyfully accepts',
    data.note || '',
  ]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
