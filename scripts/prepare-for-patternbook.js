/**
 * Prepare benchmark notes for PatternBook import
 * 
 * PatternBook expects an array of notes with these fields:
 * - content: The note content
 * - title: The note title
 * 
 * Usage:
 *   node scripts/prepare-for-patternbook.js [input-file] [output-file]
 * 
 * Example:
 *   node scripts/prepare-for-patternbook.js benchmark_notes.json benchmark_for_patternbook.json
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const inputFile = args[0] || 'benchmark_notes.json';
const outputFile = args[1] || 'benchmark_for_patternbook.json';

// Read input file
const inputPath = path.resolve(__dirname, '..', inputFile);
let data;

try {
  const fileContent = fs.readFileSync(inputPath, 'utf8');
  data = JSON.parse(fileContent);
} catch (error) {
  console.error(`Error reading input file: ${error.message}`);
  process.exit(1);
}

// Extract notes array (from benchmark format)
const notes = data.notes || [];

if (notes.length === 0) {
  console.error('No notes found in input file');
  process.exit(1);
}

console.log(`Found ${notes.length} notes to prepare for PatternBook`);

// Convert to PatternBook format (just title and content)
const patternBookNotes = notes.map(note => ({
  title: note.title,
  content: note.content
}));

// Write output
const outputPath = path.resolve(__dirname, '..', outputFile);
fs.writeFileSync(outputPath, JSON.stringify(patternBookNotes, null, 2));

console.log(`\n✅ Successfully prepared ${notes.length} notes for PatternBook import`);
console.log(`Output file: ${outputFile}`);
console.log(`\n📝 To import into PatternBook:`);
console.log(`   1. Replace the content of test_data_notes_only.json with this file`);
console.log(`   2. Or update handleImportTestNotes to read from ${outputFile}`);
console.log(`   3. Use the import feature in PatternBook's Settings`);

