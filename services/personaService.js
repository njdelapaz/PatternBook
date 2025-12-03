/**
 * Persona Service
 * Loads pre-built persona snapshots for instant note loading
 */

// Import persona data
import softwareEngineerPersona from '../data/personas/software-engineer.json';
import therapistPersona from '../data/personas/therapist.json';
import doctorPersona from '../data/personas/doctor.json';

/**
 * Load persona snapshot and return ready-to-use note objects
 * @param {string} personaType - 'software-engineer' | 'therapist' | 'doctor' | 'blank-slate'
 * @returns {Promise<Array>} Array of complete note objects
 */
export async function loadPersonaSnapshot(personaType) {
  console.log('[PersonaService] Loading persona:', personaType);

  try {
    let notes = [];

    switch (personaType) {
      case 'software-engineer':
        notes = softwareEngineerPersona;
        break;
      case 'therapist':
        notes = therapistPersona;
        break;
      case 'doctor':
        notes = doctorPersona;
        break;
      case 'blank-slate':
        notes = [];
        break;
      default:
        console.warn('[PersonaService] Unknown persona type, returning blank slate:', personaType);
        notes = [];
    }

    console.log('[PersonaService] Loaded', notes.length, 'notes for persona:', personaType);
    return notes;
  } catch (error) {
    console.error('[PersonaService] Error loading persona:', error);
    // Fall back to blank slate on error
    return [];
  }
}

/**
 * Get persona metadata (for display in selection screen)
 */
export function getPersonaMetadata() {
  return {
    'software-engineer': {
      title: 'Software Engineer',
      description: '30 notes about coding, projects, and tech insights',
      icon: '💻',
      noteCount: 30,
    },
    'therapist': {
      title: 'Therapist',
      description: '30 notes about therapy, mindfulness, and healing',
      icon: '🧠',
      noteCount: 30,
    },
    'doctor': {
      title: 'Doctor',
      description: '30 notes about medicine, patient care, and health',
      icon: '⚕️',
      noteCount: 30,
    },
    'blank-slate': {
      title: 'Blank Slate',
      description: 'Start fresh with no preloaded notes',
      icon: '📝',
      noteCount: 0,
    },
  };
}

/**
 * Get all available persona types
 * @returns {Array<string>} Array of persona type IDs
 */
export function getAvailablePersonas() {
  return ['software-engineer', 'therapist', 'doctor', 'blank-slate'];
}
