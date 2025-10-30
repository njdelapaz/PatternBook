// Hard-coded AI suggestions for demo

export const SUGGESTIONS = {
  // First note (dream library) - Art suggestion
  dream: {
    type: 'art',
    title: 'The Library',
    subtitle: '1526',
    artist: 'Giuseppe Arcimboldo',
    museum: 'Skokloster Castle, Sweden',
    badge: 'Picked for you',
    description: 'Arcimboldo\'s "The Librarian" depicts a portrait composed entirely of books, creating a figure that is both human and library itself. This surreal fusion speaks to your dream of wandering through an endless library—where memories, identity, and stories become inseparable from one another.',
    image: require('../assets/suggestions/library-art.jpg'), // You'll add this image
    imageAlt: 'Giuseppe Arcimboldo\'s painting of a figure made of books'
  },

  // Second note (productivity) - Quote suggestion
  productivity: {
    type: 'quote',
    title: '"It is not enough to be busy. So are the ants. The question is: What are we busy about?"',
    author: 'Henry David Thoreau',
    badge: 'Picked for you',
    description: 'Thoreau\'s reflection from Walden challenges the modern obsession with productivity for its own sake. His question cuts to the heart of your insight—that measuring worth by accomplishment misses the deeper question of purpose and intentionality.',
    imageAlt: 'Henry David Thoreau quote about meaningful productivity'
  },

  // Weekly letter - Appears after both notes are created
  weeklyLetter: {
    type: 'letter',
    title: 'Hello, Nathan',
    subtitle: 'Weekly letter',
    date: 'Oct 26, 2025',
    badge: 'Weekly letter',
    gradient: require('../assets/gradient.png'), // Gradient image
    content: [
      'Well hello there! I\'m your new AI guide, and I have to say—you\'re quite the mystery. Just two notes, but what notes they are. Either you\'re the most zen person on the planet, or you\'re still figuring out what this whole PatternBook thing is about.',
      'This week, we talked about the strange nature of memory—how each time we recall something, we might be subtly rewriting it, like books in an endless library that shift with every reading. We also explored your relationship with productivity, questioning whether worth should be measured by accomplishment or by intention. Quality over quantity, as you put it.',
      'Here\'s a micro-challenge for you: sometime this week, notice one small thing that made you smile. Could be a good cup of coffee, a text from a friend, or even just the way sunlight hit your wall. No need to journal it or analyze it—just notice it.',
      'What\'s one thing you\'re curious about exploring in your life right now?'
    ],
    imageAlt: 'Weekly letter greeting'
  }
};

// Generate suggestions based on notes
export function getSuggestionsForNotes(notes) {
  const suggestions = [];

  // Check if we have notes
  if (notes.length === 0) return suggestions;

  // Check for dream note
  const hasDreamNote = notes.some(note =>
    note.content.toLowerCase().includes('dream') &&
    note.content.toLowerCase().includes('library')
  );

  // Check for productivity note
  const hasProductivityNote = notes.some(note =>
    note.content.toLowerCase().includes('productivity') ||
    note.content.toLowerCase().includes('accomplish')
  );

  if (hasDreamNote) {
    suggestions.push(SUGGESTIONS.dream);
  }

  if (hasProductivityNote) {
    suggestions.push(SUGGESTIONS.productivity);
  }

  // Show weekly letter when both notes exist
  if (hasDreamNote && hasProductivityNote) {
    suggestions.push(SUGGESTIONS.weeklyLetter);
  }

  return suggestions;
}
