/**
 * Export PatternBook notes to various formats for importing into Lightpage
 * 
 * Usage:
 *   node scripts/export-for-lightpage.js [format] [input-file] [output-file]
 * 
 * Formats: json, csv, markdown, txt
 * 
 * Example:
 *   node scripts/export-for-lightpage.js json test_data_notes_only.json lightpage_import.json
 *   node scripts/export-for-lightpage.js csv test_data_notes_only.json lightpage_import.csv
 *   node scripts/export-for-lightpage.js markdown test_data_notes_only.json lightpage_import.md
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const format = (args[0] || 'json').toLowerCase();
const inputFile = args[1] || 'test_data_notes_only.json';
const outputFile = args[2] || `lightpage_import.${format === 'markdown' ? 'md' : format}`;

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

// Extract notes array (handles both formats)
const notes = Array.isArray(data) ? data : (data.notes || []);

if (notes.length === 0) {
  console.error('No notes found in input file');
  process.exit(1);
}

console.log(`Found ${notes.length} notes to export`);

// Export functions for different formats
const exporters = {
  json: (notes) => {
    // Clean JSON format (common for imports)
    const cleanNotes = notes.map(note => ({
      title: note.title,
      content: note.content,
      createdAt: new Date(note.createdAt).toISOString(),
      updatedAt: new Date(note.updatedAt).toISOString(),
      pinned: note.pinned || false,
      tags: note.tags || [],
      // Optional fields
      ...(note.summary && { summary: note.summary }),
      ...(note.questions && { questions: note.questions })
    }));
    
    return JSON.stringify(cleanNotes, null, 2);
  },

  csv: (notes) => {
    // CSV format with proper escaping
    const escapeCSV = (str) => {
      if (!str) return '';
      const needsQuotes = str.includes(',') || str.includes('"') || str.includes('\n');
      const escaped = str.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };

    const headers = ['title', 'content', 'createdAt', 'updatedAt', 'pinned', 'summary'];
    const rows = notes.map(note => [
      escapeCSV(note.title),
      escapeCSV(note.content),
      new Date(note.createdAt).toISOString(),
      new Date(note.updatedAt).toISOString(),
      note.pinned || false,
      escapeCSV(note.summary || '')
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  },

  markdown: (notes) => {
    // Individual markdown files approach - create a directory
    const outputDir = outputFile.replace('.md', '_notes');
    const absoluteOutputDir = path.resolve(__dirname, '..', outputDir);
    
    if (!fs.existsSync(absoluteOutputDir)) {
      fs.mkdirSync(absoluteOutputDir, { recursive: true });
    }

    // Create clean markdown files (just title and content)
    const combined = notes.map((note, index) => {
      const content = [
        `# ${note.title}`,
        '',
        note.content,
        ''
      ].join('\n');

      // Save individual file
      const filename = `${String(index + 1).padStart(3, '0')}_${note.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.md`;
      fs.writeFileSync(path.join(absoluteOutputDir, filename), content);

      return content;
    }).join('\n\n');

    console.log(`\nAlso created individual markdown files in: ${outputDir}/`);
    return combined;
  },

  txt: (notes) => {
    // Plain text format - one note per section
    return notes.map(note => {
      const date = new Date(note.createdAt).toISOString().split('T')[0];
      return [
        '='.repeat(80),
        note.title,
        '='.repeat(80),
        `Date: ${date}`,
        note.pinned ? 'Pinned: Yes' : '',
        '',
        note.content,
        '',
        note.summary ? `Summary: ${note.summary}` : '',
        ''
      ].filter(Boolean).join('\n');
    }).join('\n\n');
  },

  // Specialized format for apps that accept frontmatter
  frontmatter: (notes) => {
    return notes.map(note => {
      const date = new Date(note.createdAt).toISOString();
      const frontmatter = [
        '---',
        `title: ${note.title}`,
        `date: ${date}`,
        `pinned: ${note.pinned || false}`,
        note.tags && note.tags.length > 0 ? `tags: [${note.tags.join(', ')}]` : '',
        '---',
        '',
        note.content
      ].filter(Boolean).join('\n');
      return frontmatter;
    }).join('\n\n---\n\n');
  }
};

// Export based on format
if (!exporters[format]) {
  console.error(`Unknown format: ${format}`);
  console.error(`Supported formats: ${Object.keys(exporters).join(', ')}`);
  process.exit(1);
}

try {
  const output = exporters[format](notes);
  const outputPath = path.resolve(__dirname, '..', outputFile);
  
  fs.writeFileSync(outputPath, output);
  console.log(`\n✅ Successfully exported ${notes.length} notes to: ${outputFile}`);
  console.log(`Format: ${format.toUpperCase()}`);
  console.log(`\nYou can now import this file into Lightpage!`);
} catch (error) {
  console.error(`Error exporting: ${error.message}`);
  process.exit(1);
}

