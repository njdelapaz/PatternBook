# Benchmarking Scripts

This directory contains scripts to help you benchmark PatternBook against Lightpage.

## Scripts

### 1. `create-benchmark-dataset.js`

Creates a curated dataset of 25 notes specifically designed for qualitative benchmarking.

**Usage:**
```bash
node scripts/create-benchmark-dataset.js [output-file] [num-notes]
```

**Examples:**
```bash
# Create 25-note benchmark dataset (recommended)
node scripts/create-benchmark-dataset.js benchmark_notes.json 25

# Create smaller 15-note dataset for quick testing
node scripts/create-benchmark-dataset.js benchmark_quick.json 15
```

**Output:**
- JSON file with structured benchmark notes
- Includes test queries for each note
- Organized by test scenario categories

### 2. `export-for-lightpage.js`

Exports PatternBook notes to various formats for importing into Lightpage.

**Usage:**
```bash
node scripts/export-for-lightpage.js [format] [input-file] [output-file]
```

**Supported Formats:**
- `json` - Clean JSON array (most compatible)
- `csv` - CSV with proper escaping
- `markdown` - Markdown files (combined + individual)
- `txt` - Plain text format
- `frontmatter` - Markdown with YAML frontmatter

**Examples:**
```bash
# Export to JSON (most common)
node scripts/export-for-lightpage.js json test_data_notes_only.json lightpage_import.json

# Export to CSV
node scripts/export-for-lightpage.js csv test_data_notes_only.json lightpage_import.csv

# Export to Markdown
node scripts/export-for-lightpage.js markdown test_data_notes_only.json lightpage_import.md

# Export benchmark dataset
node scripts/export-for-lightpage.js json benchmark_notes.json benchmark_for_lightpage.json
```

## Quick Start Guide

### Step 1: Create Benchmark Dataset
```bash
cd /Users/amudh/Documents/CS4501\ -\ LLMs/PatternBook/PatternBook
node scripts/create-benchmark-dataset.js benchmark_notes.json 25
```

### Step 2: Check Lightpage's Import Format

Open Lightpage → Settings → Import → Note the accepted format(s)

### Step 3: Export in Correct Format

If Lightpage accepts JSON:
```bash
node scripts/export-for-lightpage.js json benchmark_notes.json lightpage_import.json
```

If Lightpage accepts CSV:
```bash
node scripts/export-for-lightpage.js csv benchmark_notes.json lightpage_import.csv
```

If Lightpage accepts Markdown:
```bash
node scripts/export-for-lightpage.js markdown benchmark_notes.json lightpage_import.md
```

### Step 4: Import into Lightpage

Follow Lightpage's import instructions with your exported file.

### Step 5: Run Benchmarks

See `BENCHMARKING_GUIDE.md` in the root directory for detailed testing instructions.

## File Structures

### Benchmark Dataset JSON Structure
```json
{
  "description": "Benchmark dataset for comparing PatternBook and Lightpage",
  "totalNotes": 25,
  "categories": ["simple-factual", "technical", "personal", ...],
  "testScenarios": [
    {
      "name": "Simple Factual Retrieval",
      "description": "Can the app find and return specific facts?",
      "exampleQueries": ["What is my cookie recipe?"],
      "expectedBehavior": "Should return relevant note with accurate info"
    }
  ],
  "notes": [
    {
      "id": "bench_...",
      "title": "Recipe for chocolate chip cookies",
      "content": "...",
      "createdAt": 1699564800000,
      "updatedAt": 1699564800000,
      "pinned": false,
      "category": "simple-factual",
      "testQueries": ["What is my cookie recipe?", ...]
    }
  ]
}
```

### Exported JSON Structure
```json
[
  {
    "title": "Note Title",
    "content": "Note content...",
    "createdAt": "2024-11-15T00:00:00.000Z",
    "updatedAt": "2024-11-15T00:00:00.000Z",
    "pinned": false,
    "tags": [],
    "summary": "Optional summary"
  }
]
```

## Troubleshooting

### "Cannot find module"
Make sure you're in the project root directory:
```bash
cd /Users/amudh/Documents/CS4501\ -\ LLMs/PatternBook/PatternBook
```

### "Input file not found"
Check that the input file exists:
```bash
ls test_data_notes_only.json
```

### Import fails in Lightpage
Try a different format:
1. Start with JSON (most compatible)
2. Try CSV if JSON doesn't work
3. Try Markdown as last resort

### Character encoding issues
If you see weird characters, ensure you're using UTF-8:
- The scripts output UTF-8 by default
- Check Lightpage's import settings for encoding options

## Notes

- The benchmark dataset is designed to test specific AI capabilities
- It includes notes with varying complexity, topics, and formats
- Each note includes suggested test queries
- The `testQueries` field can be removed if Lightpage doesn't support custom metadata

## See Also

- `BENCHMARKING_GUIDE.md` - Complete benchmarking methodology
- `test_data_notes_only.json` - Existing test data (100 notes)
- `test_data_comprehensive_user.json` - Test data with user profile

