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

  return suggestions;
}
