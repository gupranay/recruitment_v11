const fs = require('fs');
const { parse } = require('csv-parse/sync');

function parseCSV(filePath) {
  // Read the CSV file
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });

  // Parse the CSV content
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  return records;
}

function accessField(record, fieldName) {
  return record.hasOwnProperty(fieldName) ? record[fieldName] : "Field not found";
}

// Example usage
const filePath = 'Cohort Application Submissions June 9 2024.csv';
const result = parseCSV(filePath);

// Access specific fields using custom variables
const fieldToAccess1 = "Full Name"; // Replace with actual field name from your CSV
const fieldToAccess2 = "Email"; // Replace with actual field name from your CSV

// console.log("\nAccessing specific fields:");
// result.forEach((record, index) => {
//   console.log(`Record ${index + 1}:`);
//   console.log(`${fieldToAccess1}: ${accessField(record, fieldToAccess1)}`);
//   console.log(`${fieldToAccess2}: ${accessField(record, fieldToAccess2)}`);
//   console.log("---");
// });
