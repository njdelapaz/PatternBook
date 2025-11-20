/**
 * Note Retrieval Service
 * Implements RAG (Retrieval-Augmented Generation) for finding relevant notes
 * Uses keyword-based TF-IDF search (Phase 1)
 * Designed with strategy pattern for future embeddings upgrade (Phase 2)
 */

import { chunkNotes } from '../utils/noteChunking';

/**
 * Recency weighting configuration
 */
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const RECENCY_HALF_LIFE_DAYS = 21; // light bias toward recent notes (~3 weeks)
const RECENCY_BONUS_MAX = 0.3; // cap boost so older notes remain relevant

/**
 * Calculate a recency weight for a chunk based on its note timestamps
 * Uses exponential decay with a configurable half-life and floor
 * @param {Object} chunk - Note chunk metadata
 * @returns {number} Weight multiplier >= 1 (only boosts recency)
 */
function calculateRecencyWeight(chunk) {
  const timestamp = chunk.noteUpdatedAt || chunk.noteCreatedAt;
  if (!timestamp) {
    return 1;
  }

  const chunkTime = new Date(timestamp).getTime();
  if (Number.isNaN(chunkTime)) {
    return 1;
  }

  const now = Date.now();
  const ageMs = now - chunkTime;

  if (ageMs <= 0) {
    return 1;
  }

  const ageDays = ageMs / MS_IN_DAY;
  const lambda = Math.log(2) / RECENCY_HALF_LIFE_DAYS;
  const decay = Math.exp(-lambda * ageDays);

  const bonus = decay * RECENCY_BONUS_MAX;
  return 1 + bonus;
}

/**
 * Common English stopwords to filter out
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
  'what', 'when', 'where', 'who', 'which', 'why', 'how', 'or', 'can',
]);

/**
 * Basic stemming to align simple morphological variants
 * (e.g., "productive" vs "productivity")
 * @param {string} token
 * @returns {string}
 */
function normalizeToken(token) {
  if (!token) {
    return '';
  }
  
  const suffixes = [
    'ization',
    'isation',
    'iveness',
    'fulness',
    'tional',
    'ational',
    'ities',
    'ility',
    'ivity',
    'ness',
    'ment',
    'tion',
    'sion',
    'ously',
    'fully',
    'edly',
    'ingly',
    'able',
    'ible',
    'ive',
    'ity',
    'ing',
    'ed',
    'ly',
    's',
  ];
  
  let normalized = token;
  
  for (const suffix of suffixes) {
    if (normalized.length - suffix.length >= 3 && normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }
  
  return normalized;
}

/**
 * Tokenize text into words
 * @param {string} text - Text to tokenize
 * @returns {Array} Array of tokens (lowercase, normalized)
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map(token => normalizeToken(token))
    .filter(token => token.length > 0 && !STOPWORDS.has(token));
  
  return tokens;
}

/**
 * Calculate term frequency for a document
 * @param {Array} tokens - Array of tokens
 * @returns {Object} Map of term to frequency
 */
function calculateTermFrequency(tokens) {
  const tf = {};
  const totalTokens = tokens.length;
  
  if (totalTokens === 0) {
    return tf;
  }
  
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  
  // Normalize by total tokens
  for (const token in tf) {
    tf[token] = tf[token] / totalTokens;
  }
  
  return tf;
}

/**
 * Calculate inverse document frequency for all terms
 * @param {Array} chunks - Array of chunk objects with tokens
 * @returns {Object} Map of term to IDF score
 */
function calculateIDF(chunks) {
  const idf = {};
  const totalDocs = chunks.length;
  
  if (totalDocs === 0) {
    return idf;
  }
  
  // Count document frequency for each term
  const df = {};
  for (const chunk of chunks) {
    const uniqueTokens = new Set(chunk.tokens);
    for (const token of uniqueTokens) {
      df[token] = (df[token] || 0) + 1;
    }
  }
  
  // Calculate IDF: log(total_docs / doc_freq)
  for (const token in df) {
    idf[token] = Math.log(totalDocs / df[token]);
  }
  
  return idf;
}

/**
 * Score a chunk against a query using TF-IDF
 * @param {Array} queryTokens - Tokenized query
 * @param {Object} chunk - Chunk object with tokens and tf
 * @param {Object} idfScores - IDF scores for all terms
 * @returns {number} Relevance score
 */
function scoreChunk(queryTokens, chunk, idfScores) {
  let score = 0;
  
  for (const token of queryTokens) {
    if (chunk.tf[token] && idfScores[token]) {
      // TF-IDF score for this term
      score += chunk.tf[token] * idfScores[token];
    }
  }
  
  return score;
}

const RAG_DEBUG = process.env.RAG_DEBUG === '1';

/**
 * Keyword-based retriever using TF-IDF
 */
class KeywordRetriever {
  constructor() {
    this.index = null;
  }
  
  /**
   * Build search index from notes
   * @param {Array} notes - Array of note objects
   */
  buildIndex(notes) {
    // Create chunks from all notes
    const chunks = chunkNotes(notes);
    
    // Tokenize and calculate TF for each chunk
    const indexedChunks = chunks.map(chunk => {
      const tokens = tokenize(chunk.text);
      const tf = calculateTermFrequency(tokens);
      const recencyWeight = calculateRecencyWeight(chunk);
      
      return {
        ...chunk,
        tokens,
        tf,
        recencyWeight,
      };
    });
    
    // Calculate IDF across all chunks
    const idfScores = calculateIDF(indexedChunks);
    
    this.index = {
      chunks: indexedChunks,
      idfScores,
      noteCount: notes.length,
      chunkCount: indexedChunks.length,
    };
  }
  
  /**
   * Retrieve relevant chunks for a query
   * @param {string} query - Search query
   * @param {number} topK - Number of chunks to return
   * @param {number} minScore - Minimum relevance score threshold
   * @returns {Array} Array of relevant chunks with scores
   */
  retrieve(query, topK = 5, minScore = 0.01) {
    if (!this.index || !query) {
      return [];
    }
    
    // Tokenize query
    const queryTokens = tokenize(query);
    
    if (queryTokens.length === 0) {
      return [];
    }
    
    // Score all chunks
    const scoredChunks = this.index.chunks.map(chunk => {
      const baseScore = scoreChunk(queryTokens, chunk, this.index.idfScores);
      const recencyWeight = chunk.recencyWeight || 1;

      return {
        ...chunk,
        score: baseScore * recencyWeight,
        baseScore,
        recencyWeight,
      };
    });
    
    const relevantChunks = scoredChunks
      .filter(chunk => chunk.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (RAG_DEBUG) {
      console.log('[RetrievalService] Query:', query);
      console.log(
        '[RetrievalService] Results:',
        relevantChunks.map(chunk => ({
          noteId: chunk.noteId,
          score: Number(chunk.score.toFixed(4)),
          baseScore: Number((chunk.baseScore || 0).toFixed(4)),
          weight: Number((chunk.recencyWeight || 1).toFixed(3)),
        }))
      );
    }
    
    return relevantChunks;
  }
  
  /**
   * Get index statistics
   * @returns {Object} Index statistics
   */
  getStats() {
    if (!this.index) {
      return { noteCount: 0, chunkCount: 0, indexed: false };
    }
    
    return {
      noteCount: this.index.noteCount,
      chunkCount: this.index.chunkCount,
      indexed: true,
    };
  }
}

/**
 * Retrieval Service (singleton)
 * Strategy pattern allows swapping retrieval algorithms
 */
class RetrievalService {
  constructor() {
    this.retriever = new KeywordRetriever();
    this.notes = [];
  }
  
  /**
   * Initialize/update the index with current notes
   * @param {Array} notes - Array of note objects
   */
  indexNotes(notes) {
    if (!Array.isArray(notes)) {
      notes = [];
    }
    
    this.notes = notes;
    this.retriever.buildIndex(notes);
    
    console.log('[RetrievalService] Indexed notes:', this.retriever.getStats());
  }
  
  /**
   * Retrieve relevant notes for a query
   * @param {string} query - Search query
   * @param {Object} options - Retrieval options
   * @param {number} options.topK - Number of chunks to return
   * @param {number} options.minScore - Minimum relevance score
   * @param {string} options.excludeNoteId - Note ID to exclude from results
   * @returns {Array} Array of relevant chunks with metadata
   */
  retrieve(query, options = {}) {
    const {
      topK = 5,
      minScore = 0.01,
      excludeNoteId = null,
    } = options;
    const minScoreProvided = Object.prototype.hasOwnProperty.call(options, 'minScore');
    
    let results = this.retriever.retrieve(query, topK * 2, minScore);
    
    if (results.length === 0 && !minScoreProvided) {
      results = this.retriever.retrieve(query, topK * 2, 0);
    }
    
    // Filter out excluded note if specified
    if (excludeNoteId) {
      results = results.filter(chunk => chunk.noteId !== excludeNoteId);
    }
    
    // Take top K after filtering
    results = results.slice(0, topK);
    
    return results;
  }
  
  /**
   * Get retrieval statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return this.retriever.getStats();
  }
  
  /**
   * Check if service is ready
   * @returns {boolean} True if indexed
   */
  isReady() {
    const stats = this.getStats();
    return stats.indexed;
  }
}

// Export singleton instance
const retrievalService = new RetrievalService();
export default retrievalService;

// Export for testing
export { KeywordRetriever, tokenize, calculateTermFrequency, calculateIDF };

