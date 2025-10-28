// Hard-coded AI suggestions for demo

export const SUGGESTIONS = {
  // First note (dream library) - Art suggestion
  dream: {
    type: 'art',
    title: 'Turtle in a Lotus Pond',
    subtitle: '1700 - 1799',
    artist: 'Edo period Japanese artist',
    museum: 'Cleveland Museum of Art',
    badge: 'Picked for you',
    description: 'This gentle turtle gazing upward beside a floating lotus leaf captures a moment of quiet resilience and patient contemplation that might mirror your own need for peaceful reflection right now.',
    image: require('../assets/suggestions/turtle-lotus.jpg'), // You'll add this image
    imageAlt: 'Japanese ink painting of a turtle next to a lotus leaf'
  },

  // Second note (productivity) - Quote suggestion
  productivity: {
    type: 'quote',
    title: '"If you\'re going through hell, keep going."',
    author: 'Winston Churchill',
    badge: 'Picked for you',
    description: 'Commonly attributed to Winston Churchill, this pithy line is a blunt encouragement to persist through hardship rather than stop or surrender. It\'s often used when steady endurance is needed most.',
    imageAlt: 'Winston Churchill quote about perseverance'
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
