# Benchmarking Checklist

Print this or keep it open while you work!

## 📋 Pre-Test Setup

### ☐ Step 1: Check Lightpage Import Format
- [ ] Open Lightpage
- [ ] Go to Settings → Import
- [ ] Note accepted format: _______________

### ☐ Step 2: Export for Lightpage
**If JSON (most common):**
```bash
# Already done! Use: benchmark_for_lightpage.json
```

**If CSV:**
```bash
cd /Users/amudh/Documents/CS4501\ -\ LLMs/PatternBook/PatternBook
node scripts/export-for-lightpage.js csv benchmark_notes.json lightpage.csv
```

**If Markdown:**
```bash
node scripts/export-for-lightpage.js markdown benchmark_notes.json lightpage.md
```

### ☐ Step 3: Import into Lightpage
- [ ] Import the exported file
- [ ] Verify all 25 notes imported
- [ ] Check that content looks correct

### ☐ Step 4: Open Tracking Sheet
- [ ] Open `benchmark_evaluation_template.csv`
- [ ] Save a copy to work with
- [ ] Keep it visible while testing

---

## 🧪 Testing Checklist

For EACH test query, complete:

### Test #1: Simple Factual - Cookie Recipe
- [ ] Query: "What is my chocolate chip cookie recipe?"
- [ ] Ask PatternBook → Record response & score (1-5)
- [ ] Ask Lightpage → Record response & score (1-5)
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #2: Simple Factual - Butter Amount
- [ ] Query: "How much butter do I need for cookies?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #3: Simple Factual - Banana Bread
- [ ] Query: "What is the banana bread recipe?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #4: Technical - React Native
- [ ] Query: "How do I set up React Native?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #5: Technical - Python
- [ ] Query: "How do I use Python list comprehensions?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #6: Technical - JavaScript
- [ ] Query: "What JavaScript array methods should I remember?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #7: Technical - Debugging
- [ ] Query: "How did I fix the memory leak?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #8: Multi-Note Synthesis - Health
- [ ] Query: "What am I doing to improve my health?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note if it combines running + diet + sleep notes
- [ ] Record in spreadsheet

### Test #9: Multi-Note Synthesis - Programming
- [ ] Query: "Summarize all my thoughts on programming"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note if it combines Python + JavaScript notes
- [ ] Record in spreadsheet

### Test #10: Multi-Note Synthesis - Self-Improvement
- [ ] Query: "What are my self-improvement efforts?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #11: Temporal - Recent
- [ ] Query: "What did I do recently?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note if it prioritizes recent notes
- [ ] Record in spreadsheet

### Test #12: Temporal - Long-term
- [ ] Query: "What are my long-term goals?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #13: Temporal - Last Month
- [ ] Query: "What did I plan last month?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #14: Ambiguous - Conversation
- [ ] Query: "Tell me about that conversation"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note how it handles ambiguity
- [ ] Record in spreadsheet

### Test #15: Ambiguous - Book
- [ ] Query: "What was that book?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note how it handles ambiguity
- [ ] Record in spreadsheet

### Test #16: Ambiguous - Work Situation
- [ ] Query: "What situation at work?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note how it handles ambiguity
- [ ] Record in spreadsheet

### Test #17: Contradiction - Running Frequency
- [ ] Query: "How often do I run?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note if it recognizes the update (3x→2x)
- [ ] Record in spreadsheet

### Test #18: Contradiction - Running Time
- [ ] Query: "When do I prefer to run?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note if it recognizes the change (morning→evening)
- [ ] Record in spreadsheet

### Test #19: Conversation - Turn 1
- [ ] Query: "What are my learning goals?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #20: Conversation - Turn 2
- [ ] Query: "Why do I want to learn that?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note if it maintains context
- [ ] Record in spreadsheet

### Test #21: Conversation - Turn 3
- [ ] Query: "When did I plan to finish?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note if it still maintains context
- [ ] Record in spreadsheet

### Test #22: Complex Query
- [ ] Query: "Compare my technical skills to my goals"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #23: Personal Reflection
- [ ] Query: "What insights have I had about work-life balance?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #24: Planning
- [ ] Query: "What are my Japan trip plans?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

### Test #25: Creative Content
- [ ] Query: "What is my story idea about?"
- [ ] Ask PatternBook → Record response & score
- [ ] Ask Lightpage → Record response & score
- [ ] Note key differences
- [ ] Record in spreadsheet

---

## 📊 Post-Test Analysis

### ☐ Step 1: Calculate Scores
- [ ] Average score for PatternBook: _____
- [ ] Average score for Lightpage: _____
- [ ] Overall winner: _____________

### ☐ Step 2: Identify Patterns
- [ ] What does PatternBook do best?
  - _______________________________
  - _______________________________
  - _______________________________

- [ ] What does Lightpage do best?
  - _______________________________
  - _______________________________
  - _______________________________

### ☐ Step 3: Note Surprises
- [ ] What surprised you?
  - _______________________________
  - _______________________________

### ☐ Step 4: Feature Gaps
- [ ] Features Lightpage has that PatternBook doesn't:
  - _______________________________
  - _______________________________

- [ ] Features PatternBook has that Lightpage doesn't:
  - _______________________________
  - _______________________________

### ☐ Step 5: Improvement Priorities
- [ ] Top 3 things to improve in PatternBook:
  1. _______________________________
  2. _______________________________
  3. _______________________________

### ☐ Step 6: Document Findings
- [ ] Write summary of results
- [ ] Save screenshots of interesting examples
- [ ] Share findings with team (if applicable)

---

## ✅ Completion Checklist

- [ ] All 25 tests completed
- [ ] Spreadsheet filled out
- [ ] Scores calculated
- [ ] Patterns identified
- [ ] Improvement priorities documented
- [ ] Key findings summarized

---

## 🎯 Quick Scoring Reference

**5** = Perfect, exactly what was needed
**4** = Good, minor issues
**3** = Okay, found info but could be better
**2** = Poor, missing key details
**1** = Failed, wrong or no answer

---

## ⏱️ Progress Tracker

**Started:** _______________
**Completed:** _______________
**Total Time:** _______________

**Tests Completed:** ____ / 25

---

## 💡 Remember

- Be objective
- Document everything
- Take breaks
- Screenshot interesting results
- Note response times
- Record actual responses, not summaries

---

**Good luck! 🚀**

