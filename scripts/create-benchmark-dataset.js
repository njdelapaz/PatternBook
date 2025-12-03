/**
 * Create a focused benchmark dataset for comparing PatternBook vs Lightpage
 * 
 * This generates a curated set of notes designed to test specific capabilities:
 * - Simple retrieval
 * - Complex queries
 * - Multi-note synthesis
 * - Temporal queries
 * - Ambiguous queries
 * - Different content types (short, long, technical, personal)
 * 
 * Usage:
 *   node scripts/create-benchmark-dataset.js [output-file] [num-notes]
 * 
 * Example:
 *   node scripts/create-benchmark-dataset.js benchmark_notes.json 25
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const outputFile = args[0] || 'benchmark_notes.json';
const numNotes = parseInt(args[1]) || 25;

// Base timestamp (3 months ago)
const baseDate = Date.now() - (90 * 24 * 60 * 60 * 1000);

// Benchmark note templates
const benchmarkNotes = [
  // 1. Simple factual retrieval
  {
    category: 'simple-factual',
    title: 'Recipe for chocolate chip cookies',
    content: 'I perfected my chocolate chip cookie recipe today. The key is: 2 cups flour, 1 cup butter, 3/4 cup brown sugar, 2 eggs, 1 tsp vanilla extract, 1 tsp baking soda, 1/2 tsp salt, and 2 cups chocolate chips. Bake at 375°F for 10-12 minutes. The secret is using room temperature butter and not over-mixing the dough.',
    daysAgo: 5,
    queries: [
      'What is my chocolate chip cookie recipe?',
      'How much butter do I need for cookies?',
      'What temperature should I bake cookies?'
    ]
  },

  // 2. Technical content
  {
    category: 'technical',
    title: 'Setting up React Native development environment',
    content: 'Today I set up React Native on my Mac. Steps: 1) Install Node.js and Watchman using Homebrew (brew install node && brew install watchman). 2) Install Xcode from App Store and accept license. 3) Install CocoaPods (sudo gem install cocoapods). 4) Create new project with npx react-native init MyApp. 5) For iOS, run "cd ios && pod install". Common issue: if build fails, try "cd ios && pod install --repo-update".',
    daysAgo: 15,
    queries: [
      'How do I set up React Native?',
      'What are the steps to install React Native on Mac?',
      'What should I do if React Native build fails?'
    ]
  },

  // 3. Personal reflection
  {
    category: 'personal',
    title: 'Thoughts on work-life balance',
    content: "I've been thinking about work-life balance lately. I realized I've been working 60-hour weeks and feeling burned out. I need to set better boundaries - maybe stop checking email after 7 PM and take real lunch breaks. Sarah mentioned the importance of protecting personal time, and she's right. Quality of work matters more than quantity of hours.",
    daysAgo: 3,
    queries: [
      'What are my thoughts on work-life balance?',
      'How many hours have I been working?',
      'What did Sarah say about personal time?'
    ]
  },

  // 4. Multi-concept note
  {
    category: 'multi-concept',
    title: 'Trip to Portland - Food, Coffee, and Bookstores',
    content: "Visited Portland last weekend. Best experiences: Had amazing coffee at Stumptown (their cold brew is incredible), visited Powell's City of Books (spent 3 hours there!), tried Voodoo Doughnuts (overrated but fun), and hiked at Forest Park. The city has such a great vibe - relaxed, creative, lots of indie shops. Also went to Portland Art Museum which had a great contemporary exhibit. Would definitely go back.",
    daysAgo: 20,
    queries: [
      'Where did I get good coffee in Portland?',
      'What bookstores did I visit?',
      'What did I do in Portland?'
    ]
  },

  // 5. Project planning
  {
    category: 'project',
    title: 'Side project idea - Meal planning app',
    content: 'Idea for a side project: A meal planning app that integrates with your calendar. Features: 1) AI suggests meals based on dietary preferences, 2) Auto-generates shopping lists, 3) Learns from your favorites over time, 4) Considers what ingredients you already have. Tech stack: React Native for mobile, Node.js backend, PostgreSQL database, OpenAI API for suggestions. Target launch: 3 months. Potential name: MealFlow or DishScheduler.',
    daysAgo: 10,
    queries: [
      'What is my meal planning app idea?',
      'What tech stack should I use for my app?',
      'What features should the meal app have?'
    ]
  },

  // 6. Book notes
  {
    category: 'learning',
    title: 'Key takeaways from "Atomic Habits"',
    content: 'Reading Atomic Habits by James Clear. Main ideas: 1) Habits compound over time - 1% better each day = 37x better in a year. 2) Focus on systems, not goals. 3) Four laws of behavior change: Make it obvious, attractive, easy, and satisfying. 4) Identity-based habits work better than outcome-based. Example: "I am a runner" vs "I want to run a marathon". 5) Environment design is crucial - make good habits easy and bad habits hard.',
    daysAgo: 7,
    queries: [
      'What are the main ideas from Atomic Habits?',
      'What are the four laws of behavior change?',
      'What did I learn about habits?'
    ]
  },

  // 7. Meeting notes
  {
    category: 'work',
    title: 'Q4 Planning Meeting Notes - October 15',
    content: 'Q4 planning meeting with team. Key decisions: 1) Launch new feature by Nov 30 (lead: Alex). 2) Focus on improving performance - target 50% reduction in load time (lead: Jamie). 3) Customer feedback priority: better mobile experience and dark mode. 4) Budget approved for 2 new hires. 5) Weekly sprints continue, but moving stand-ups to 10 AM instead of 9 AM. Action items: I need to prepare technical spec by Friday and review Jamie\'s performance doc.',
    daysAgo: 18,
    queries: [
      'What were the Q4 planning decisions?',
      'When is the new feature launch?',
      'What are my action items from the planning meeting?'
    ]
  },

  // 8. Related concept #1 (for synthesis testing)
  {
    category: 'health-exercise',
    title: 'Starting a running routine',
    content: "Decided to start running regularly. Plan: Run 3x per week, starting with 20 minutes each. Week 1-2: Run/walk intervals (2 min run, 1 min walk). Week 3-4: Increase to 25 minutes, reduce walk breaks. Week 5+: Full 30-minute runs. Got new Nike running shoes (they're really comfortable). Best time for me is early morning before work - it energizes me for the day.",
    daysAgo: 25,
    queries: [
      'What is my running plan?',
      'How often should I run?',
      'When do I prefer to run?'
    ]
  },

  // 9. Related concept #2 (for synthesis testing)
  {
    category: 'health-diet',
    title: 'New meal prep strategy',
    content: "Starting meal prep on Sundays to eat healthier during the week. Plan: Prep 5 lunches and 5 dinners. Focus on: lean proteins (chicken, fish, tofu), lots of vegetables, complex carbs (quinoa, brown rice, sweet potato). Also cutting back on processed foods and added sugar. Goal is to feel more energetic and support my new running routine. Budget: $80/week for groceries.",
    daysAgo: 24,
    queries: [
      'What is my meal prep strategy?',
      'How much do I spend on groceries?',
      'What foods am I focusing on?'
    ]
  },

  // 10. Related concept #3 (for synthesis testing)
  {
    category: 'health-sleep',
    title: 'Improving sleep quality',
    content: "Noticed I've been sleeping poorly. Making changes: 1) No screens 1 hour before bed (reading instead). 2) Keep bedroom cool (65-68°F). 3) Blackout curtains installed. 4) No caffeine after 2 PM. 5) Consistent bedtime at 10:30 PM. These changes along with my running routine should help. Already feeling more rested after 3 days.",
    daysAgo: 22,
    queries: [
      'What am I doing to improve sleep?',
      'What time should I stop drinking coffee?',
      'What is my target bedtime?'
    ]
  },

  // 11. Python programming note
  {
    category: 'technical-python',
    title: 'Python list comprehensions cheat sheet',
    content: 'Useful Python list comprehension patterns: 1) Basic: [x*2 for x in range(10)] - doubles numbers. 2) With condition: [x for x in range(20) if x % 2 == 0] - even numbers only. 3) Nested: [x+y for x in [1,2] for y in [3,4]] - gives [4,5,5,6]. 4) With function: [len(word) for word in ["hello", "world"]] - word lengths. 5) Dictionary comp: {x: x**2 for x in range(5)} - numbers to squares dict.',
    daysAgo: 12,
    queries: [
      'How do I use Python list comprehensions?',
      'What is the syntax for list comprehension with condition?',
      'How do I create a dictionary comprehension?'
    ]
  },

  // 12. JavaScript programming note
  {
    category: 'technical-javascript',
    title: 'JavaScript array methods I always forget',
    content: 'Array methods I need to remember: 1) .map() - transforms each element. 2) .filter() - keeps elements that pass test. 3) .reduce() - combines all elements into single value. 4) .find() - returns first match. 5) .some() - checks if any element passes test. 6) .every() - checks if all elements pass test. Example: const doubled = [1,2,3].map(x => x * 2); // [2,4,6]',
    daysAgo: 8,
    queries: [
      'What JavaScript array methods should I use?',
      'How does reduce work in JavaScript?',
      'What is the difference between find and filter?'
    ]
  },

  // 13. Short reflection
  {
    category: 'personal-short',
    title: 'Grateful today',
    content: "Beautiful weather today. Feeling grateful for: my health, supportive friends, challenging work, and the ability to learn new things. Sometimes it's good to just notice the good stuff.",
    daysAgo: 1,
    queries: [
      'What am I grateful for?',
      'What did I feel grateful about recently?'
    ]
  },

  // 14. Complex problem-solving
  {
    category: 'problem-solving',
    title: 'Debugging the memory leak in production',
    content: 'Spent all day tracking down a memory leak. Problem: App memory usage grew from 100MB to 2GB over 6 hours. Investigation: 1) Used Chrome DevTools heap profiler. 2) Found event listeners weren\'t being cleaned up. 3) Issue was in WebSocket connection handler - created new listener each reconnection but never removed old ones. Solution: Added proper cleanup in componentWillUnmount and connection.close(). Also implemented WeakMap for references. Memory now stable at 120MB. Lesson: Always clean up event listeners and subscriptions!',
    daysAgo: 4,
    queries: [
      'How did I fix the memory leak?',
      'What was causing the memory leak?',
      'What tools did I use to debug?'
    ]
  },

  // 15. Travel planning
  {
    category: 'planning',
    title: 'Japan trip planning - March 2024',
    content: "Planning Japan trip for March 2024. Itinerary: Days 1-4: Tokyo (Shibuya, Harajuku, teamLab Borderless, Senso-ji Temple). Days 5-7: Kyoto (Fushimi Inari, Bamboo Grove, Golden Pavilion). Days 8-10: Osaka (street food, Osaka Castle, day trip to Nara). Budget: $3000 total ($150/day). Need to: Book flights (aim for under $800), get JR Pass ($280), reserve hotels via Booking.com. Best time: Late March for cherry blossoms.",
    daysAgo: 30,
    queries: [
      'When am I planning to go to Japan?',
      'What is my Japan trip budget?',
      'What places should I visit in Kyoto?'
    ]
  },

  // 16. Ambiguous content (tests handling of vague queries)
  {
    category: 'vague',
    title: 'That conversation with Mike',
    content: "Had an interesting talk with Mike about that situation at work. He thinks we should address it directly rather than waiting. Made some good points about communication and transparency. Going to think about his advice and probably bring it up in next week's meeting. Also, he recommended that book everyone's been talking about - should check it out.",
    daysAgo: 6,
    queries: [
      'What did Mike say?',
      'What situation at work?',
      'What book did Mike recommend?'
    ]
  },

  // 17. Financial note
  {
    category: 'finance',
    title: 'Monthly budget review - September',
    content: 'September spending: Rent: $1800, Groceries: $450, Eating out: $280 (too high!), Transportation: $120, Entertainment: $150, Subscriptions: $65 (Netflix, Spotify, gym). Total: $2,865. Income: $5,200 after tax. Savings: $2,335. Goal: Reduce eating out to $150/month. Currently saving 45% of income - on track for emergency fund goal of $15,000 by December.',
    daysAgo: 35,
    queries: [
      'How much did I spend on groceries?',
      'What is my savings rate?',
      'When will I reach my emergency fund goal?'
    ]
  },

  // 18. Creative writing
  {
    category: 'creative',
    title: 'Story idea - Time Loop Mystery',
    content: 'Story idea: Detective stuck in a time loop solving a murder that resets every 24 hours. Each loop, she remembers everything but everyone else resets. She has to piece together clues across multiple loops. Twist: The killer is also stuck in the loop and remembers too - it becomes a game of cat and mouse across infinite days. Working title: "Infinite Tuesday". Main character: Sarah Chen, 35, homicide detective, coffee addict, dry sense of humor.',
    daysAgo: 14,
    queries: [
      'What is my story idea about?',
      'Who is the main character in my story?',
      'What is the twist in the time loop story?'
    ]
  },

  // 19. Learning goals
  {
    category: 'goals',
    title: 'Q4 Learning Goals',
    content: 'Learning goals for Oct-Dec: 1) Complete TypeScript course on Udemy (10 hours). 2) Read "Designing Data-Intensive Applications" (595 pages - 20 pages/day = 30 days). 3) Build full-stack project using Next.js and PostgreSQL. 4) Contribute to 2 open source projects. 5) Write 4 technical blog posts. 6) Learn basics of Rust (at least complete the book through chapter 10). Why: Want to level up backend skills and systems programming knowledge.',
    daysAgo: 28,
    queries: [
      'What are my learning goals?',
      'What book am I reading about data systems?',
      'Why do I want to learn Rust?'
    ]
  },

  // 20. Product review
  {
    category: 'review',
    title: 'AirPods Pro 2 - Worth the upgrade?',
    content: 'Upgraded from AirPods 2 to AirPods Pro 2. Differences: 1) Active noise cancellation is amazing - blocks out plane/train noise completely. 2) Transparency mode feels natural. 3) Better fit with silicone tips (comes with XS, S, M, L). 4) Longer battery life (6 hours vs 5). 5) USB-C charging (finally!). 6) Spatial audio is cool but gimmicky. Verdict: Worth $249 if you travel or work in noisy environments. Not worth it if you only use in quiet places.',
    daysAgo: 11,
    queries: [
      'Should I upgrade to AirPods Pro 2?',
      'What is the battery life of AirPods Pro 2?',
      'Is noise cancellation good on AirPods Pro 2?'
    ]
  },

  // 21. Conversation synthesis test
  {
    category: 'conversation',
    title: 'Career advice from mentor Sarah',
    content: "Had coffee with Sarah (my mentor). Her advice: 1) Don't wait for the perfect opportunity - create it. 2) Build relationships before you need them. 3) Say yes to stretch assignments even if they're scary. 4) Document your wins for performance reviews. 5) It's okay to leave a job after 2 years if you're not growing. She shared her experience changing careers at 35 - took a pay cut but much happier now. Really inspiring.",
    daysAgo: 9,
    queries: [
      'What career advice did Sarah give me?',
      'When did Sarah change careers?',
      'Should I take stretch assignments?'
    ]
  },

  // 22. Recipe variant (for testing similar content retrieval)
  {
    category: 'simple-factual',
    title: 'Mom\'s banana bread recipe',
    content: "Finally got mom's banana bread recipe! Ingredients: 3 ripe bananas (mashed), 1/3 cup melted butter, 3/4 cup sugar, 1 egg (beaten), 1 tsp vanilla, 1 tsp baking soda, pinch of salt, 1.5 cups flour. Optional: 1/2 cup chocolate chips or walnuts. Instructions: Mix butter and bananas, stir in sugar/egg/vanilla, add baking soda and salt, fold in flour gently, pour into greased loaf pan, bake 350°F for 60 minutes. The secret is using very ripe bananas (brown spots) and not over-mixing!",
    daysAgo: 16,
    queries: [
      'What is the banana bread recipe?',
      'How ripe should bananas be for banana bread?',
      'How long to bake banana bread?'
    ]
  },

  // 23. Dream/reflection (tests abstract content)
  {
    category: 'abstract',
    title: 'Weird dream about the library',
    content: 'Had the strangest dream last night. I was in an infinite library where each book contained a different version of my life - different choices I could have made. The librarian (who looked like my high school teacher) said I could only read one book but had to choose carefully. I couldn\'t decide and woke up feeling anxious. Maybe it\'s about fear of commitment or imposter syndrome? Or just anxiety about the new project at work.',
    daysAgo: 2,
    queries: [
      'What was my dream about?',
      'What does my library dream mean?',
      'Why did I feel anxious?'
    ]
  },

  // 24. Multi-topic daily log
  {
    category: 'daily-log',
    title: 'Friday thoughts - Good day overall',
    content: 'Good Friday. Morning: Productive work session - finished the API refactoring finally! Lunch: Tried new Thai place (Orchid Kitchen) - their Pad See Ew was excellent. Afternoon: 1:1 with manager went well, got approval for conference attendance. Evening: Gym session (leg day, ugh), then read for an hour (currently on page 187 of Project Hail Mary). Weekend plans: Farmers market, maybe hiking if weather is good, need to do laundry.',
    daysAgo: 13,
    queries: [
      'What did I do on Friday?',
      'What book am I reading?',
      'Did I finish the API refactoring?'
    ]
  },

  // 25. Contradictory info test (later note contradicts earlier one)
  {
    category: 'contradiction',
    title: 'Update on running routine',
    content: "Revising my running plan. Original plan of 3x per week wasn't sustainable with my work schedule. New plan: 2x per week (Saturday and Wednesday mornings), but longer runs (45 minutes instead of 30). Also switching from early morning to evening runs - turns out I'm not a morning person after all. Already feels more sustainable after 2 weeks.",
    daysAgo: 17,
    queries: [
      'How often do I run?',
      'When do I prefer to run?',
      'Did I change my running routine?'
    ]
  }
];

// Generate notes with timestamps
const notes = benchmarkNotes.slice(0, numNotes).map((template, index) => {
  const createdAt = baseDate + (template.daysAgo * 24 * 60 * 60 * 1000);
  return {
    id: `bench_${Date.now()}_${index}`,
    title: template.title,
    content: template.content,
    createdAt: createdAt,
    updatedAt: createdAt,
    pinned: index < 3, // Pin first 3 notes
    category: template.category,
    // Optional: Include test queries as metadata
    testQueries: template.queries
  };
});

// Create benchmark guide
const benchmarkGuide = {
  description: 'Benchmark dataset for comparing PatternBook and Lightpage',
  totalNotes: notes.length,
  categories: [...new Set(notes.map(n => n.category))],
  testScenarios: [
    {
      name: 'Simple Factual Retrieval',
      description: 'Can the app find and return specific facts from notes?',
      exampleQueries: [
        'What is my chocolate chip cookie recipe?',
        'What is the banana bread recipe?'
      ],
      expectedBehavior: 'Should return relevant recipe note with accurate information'
    },
    {
      name: 'Multi-Note Synthesis',
      description: 'Can the app combine information from multiple related notes?',
      exampleQueries: [
        'What am I doing to improve my health?',
        'Summarize all my thoughts on programming'
      ],
      expectedBehavior: 'Should synthesize info from running, diet, and sleep notes'
    },
    {
      name: 'Temporal Queries',
      description: 'Can the app understand time-based queries?',
      exampleQueries: [
        'What did I do recently?',
        'What are my long-term goals?'
      ],
      expectedBehavior: 'Should prioritize recent notes or identify goal-oriented content'
    },
    {
      name: 'Ambiguous Queries',
      description: 'How does the app handle vague or unclear questions?',
      exampleQueries: [
        'Tell me about that conversation',
        'What was that book?'
      ],
      expectedBehavior: 'Should ask for clarification or return most relevant matches'
    },
    {
      name: 'Technical Content',
      description: 'Can the app handle code and technical information?',
      exampleQueries: [
        'How do I use Python list comprehensions?',
        'What JavaScript array methods should I remember?'
      ],
      expectedBehavior: 'Should accurately return technical details and code examples'
    },
    {
      name: 'Contradiction Handling',
      description: 'How does the app handle conflicting information?',
      exampleQueries: [
        'How often do I run?',
        'When do I prefer to run?'
      ],
      expectedBehavior: 'Should recognize updated information and prioritize recent notes'
    }
  ],
  notes: notes
};

// Write output
const outputPath = path.resolve(__dirname, '..', outputFile);
fs.writeFileSync(outputPath, JSON.stringify(benchmarkGuide, null, 2));

console.log(`\n✅ Created benchmark dataset: ${outputFile}`);
console.log(`\n📊 Summary:`);
console.log(`   - Total notes: ${notes.length}`);
console.log(`   - Categories: ${benchmarkGuide.categories.length}`);
console.log(`   - Test scenarios: ${benchmarkGuide.testScenarios.length}`);
console.log(`\n📝 Test Scenarios:`);
benchmarkGuide.testScenarios.forEach((scenario, i) => {
  console.log(`   ${i + 1}. ${scenario.name}`);
});

console.log(`\n💡 Next steps:`);
console.log(`   1. Import this into both PatternBook and Lightpage`);
console.log(`   2. Run the test queries from each scenario`);
console.log(`   3. Compare responses side-by-side`);
console.log(`   4. Document differences in quality, accuracy, and relevance\n`);

