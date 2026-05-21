import { Note, RAGChunk } from '../types';

/**
 * Stopwords to filter out for efficient keyword extraction and indexing.
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'i', 'my', 'me', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them'
]);

/**
 * Tokenizes text, converts to lowercase, and filters out non-alphanumeric characters and stopwords.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Helper: Computes word frequencies (TF) for a set of tokens.
 */
function getTermFrequencies(tokens: string[]): Record<string, number> {
  const tf: Record<string, number> = {};
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });
  return tf;
}

/**
 * Local-First text chunker that splits longer markdown files into coherent snippets.
 */
export function chunkNoteContent(note: Note, maxChunkSizeCharacters = 300): RAGChunk[] {
  const content = note.content;
  // Split content by paragraphs or sections
  const paragraphs = content.split(/\n{2,}/);
  const chunks: RAGChunk[] = [];

  let currentChunkText = '';

  paragraphs.forEach(p => {
    const trimmed = p.trim();
    if (!trimmed) return;

    // Skip short metadata lines or code block wrappers if they don't contain real context
    if (trimmed.length < 15) return;

    if ((currentChunkText + '\n\n' + trimmed).length > maxChunkSizeCharacters) {
      if (currentChunkText) {
        chunks.push({
          noteId: note.id,
          noteTitle: note.title,
          text: currentChunkText.trim(),
        });
      }
      currentChunkText = trimmed;
    } else {
      currentChunkText = currentChunkText ? `${currentChunkText}\n\n${trimmed}` : trimmed;
    }
  });

  if (currentChunkText) {
    chunks.push({
      noteId: note.id,
      noteTitle: note.title,
      text: currentChunkText.trim(),
    });
  }

  return chunks;
}

/**
 * NoteFlow local context retrieval engine.
 * Computes cosine-like keyword term overlap (TF-IDF approximation) 
 * between the active note text and the collection of all past database notes.
 */
export function queryLocalKnowledgeBase(
  activeNoteId: string,
  activeNoteText: string,
  allNotes: Note[],
  maxSnippets = 3
): { matchedChunks: RAGChunk[]; debugLog: string } {
  const startTime = performance.now();
  const queryTokens = tokenize(activeNoteText);
  const queryTF = getTermFrequencies(queryTokens);

  if (queryTokens.length === 0) {
    return {
      matchedChunks: [],
      debugLog: 'RAG context engine bypassed: active note is empty or lacks queryable tags.'
    };
  }

  // Get other notes (exclude current active note)
  const poolNotes = allNotes.filter(n => n.id !== activeNoteId);
  const allChunks: RAGChunk[] = [];

  poolNotes.forEach(note => {
    const noteChunks = chunkNoteContent(note);
    allChunks.push(...noteChunks);
  });

  if (allChunks.length === 0) {
    return {
      matchedChunks: [],
      debugLog: 'RAG context engine finished: No other notes exist in local database pool.'
    };
  }

  // Score each chunk based on Cosine Overlap / TF Match
  const scoredChunks = allChunks.map(chunk => {
    const chunkTokens = tokenize(chunk.text);
    const chunkTF = getTermFrequencies(chunkTokens);

    // Compute Term Intersection (Dot Product)
    let dotProduct = 0;
    let queryMagnitude = 0;
    let chunkMagnitude = 0;

    // Calculate sum of squares
    Object.keys(queryTF).forEach(term => {
      queryMagnitude += queryTF[term] * queryTF[term];
    });
    Object.keys(chunkTF).forEach(term => {
      chunkMagnitude += chunkTF[term] * chunkTF[term];
    });

    queryMagnitude = Math.sqrt(queryMagnitude);
    chunkMagnitude = Math.sqrt(chunkMagnitude);

    // Intersection
    Object.keys(queryTF).forEach(term => {
      if (chunkTF[term]) {
        dotProduct += queryTF[term] * chunkTF[term];
      }
    });

    const cosineScore = (queryMagnitude && chunkMagnitude) 
      ? dotProduct / (queryMagnitude * chunkMagnitude) 
      : 0;

    // Apply scaling boost if tags or title has explicit overlaps
    let tagBoost = 0;
    const titleTokens = tokenize(chunk.noteTitle);
    titleTokens.forEach(t => {
      if (queryTF[t]) tagBoost += 0.2; // title match boost
    });

    const score = cosineScore + tagBoost;

    return {
      ...chunk,
      score: Math.min(Number(score.toFixed(4)), 1.0)
    };
  });

  // Sort and filter non-zero matches
  const matches = scoredChunks
    .filter(c => (c.score || 0) > 0.05)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  const resultChunks = matches.slice(0, maxSnippets);
  const elapsedMs = (performance.now() - startTime).toFixed(3);

  const debugLog = `RAG COMPILATION TRACE (${elapsedMs}ms):
- Stopword cleanup left ${queryTokens.length} active query tokens.
- Pool indexed: ${poolNotes.length} notes, parsed into ${allChunks.length} content chunks.
- Score profile: High-overlap threshold established at > 0.05.
- Results selected: Top ${resultChunks.length} qualifying blocks.
${resultChunks.map((c, i) => `  [#${i + 1}] Score: ${c.score} | Note: "${c.noteTitle}" | Snippet: "${c.text.substring(0, 50)}..."`).join('\n')}`;

  return {
    matchedChunks: resultChunks,
    debugLog
  };
}
