# How to Import Benchmark Notes into PatternBook

## ✅ Setup Complete!

Your PatternBook app can now import the exact same 25 benchmark notes that you'll import into Lightpage.

## 📝 Files Ready

### For Lightpage:
- **Folder:** `benchmark_for_lightpage_notes/`
- **Format:** 25 individual markdown files (just title + content)
- **Action:** Drag the folder into Lightpage

### For PatternBook:
- **File:** `benchmark_for_patternbook.json`
- **Format:** JSON array with title and content fields
- **Action:** Use the app's built-in import feature

## 🚀 How to Import into PatternBook

### Method 1: Using the App (Recommended)

1. **Open PatternBook**
2. **Go to Settings** (⚙️ icon)
3. **Tap "Import Test Notes"**
4. **Choose "Benchmark Notes (25)"**
5. **Enter how many notes to import** (1-25)
   - For full benchmarking: Enter `25`
6. **Tap "Import"**

The notes will import **quickly** because they already have titles (no AI generation needed).

### Method 2: Manual JSON Import (If needed)

If you need to manually replace the test data:

```bash
# Backup original test data
cp test_data_notes_only.json test_data_notes_only.json.backup

# Copy benchmark notes
cp benchmark_for_patternbook.json test_data_notes_only.json

# Now when you import "Test Notes" in the app, you'll get benchmark notes
```

## 📋 What You'll Get

All 25 notes will import with:
- ✅ **Exact same titles** as Lightpage
- ✅ **Exact same content** as Lightpage
- ✅ **No metadata** (just title + content)
- ✅ **Fast import** (no AI title generation)

## 🎯 Ready for Benchmarking!

Once you've imported the notes into both apps:

1. ✅ **Lightpage**: 25 notes imported from `benchmark_for_lightpage_notes/` folder
2. ✅ **PatternBook**: 25 notes imported using Settings → Import Benchmark Notes

Now both apps have **identical content** and you can start comparing!

## 📊 Next Steps

1. Open `benchmark_evaluation_template.csv`
2. Follow `BENCHMARKING_CHECKLIST.md`
3. Test each query in both apps
4. Compare and document results

---

## 🔧 Technical Details

### PatternBook Import Format

The benchmark notes are formatted as:
```json
[
  {
    "title": "Recipe for chocolate chip cookies",
    "content": "I perfected my chocolate chip cookie recipe..."
  },
  ...
]
```

### Key Differences from Test Notes

| Feature | Test Notes | Benchmark Notes |
|---------|------------|-----------------|
| File | test_data_notes_only.json | benchmark_for_patternbook.json |
| Count | 100 notes | 25 notes |
| Titles | Auto-generated | Pre-defined |
| Import Speed | ~1 sec/note | ~0.1 sec/note |
| Purpose | General testing | Benchmarking vs Lightpage |

### How It Works

The updated import function (`handleImportTestNotes` in `App.js`):
1. Accepts a third parameter: `useBenchmark` (true/false)
2. Loads from `benchmark_for_patternbook.json` if `useBenchmark === true`
3. Uses existing titles instead of generating them
4. Imports much faster (100ms delay vs 1000ms)

---

**Ready to benchmark? Import the notes and start testing! 🚀**

