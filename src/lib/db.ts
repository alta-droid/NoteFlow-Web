import { Note } from '../types';
import { encryptText, decryptText } from '../utils/crypto';

/**
 * NoteFlow Database Schema representing Isar/Hive/Room equivalents.
 * Implements local-first transactions, indices, and Zero-Knowledge integration.
 */
export const NOTEFLOW_SCHEMA = {
  version: 1,
  tables: {
    notes: {
      name: 'notes',
      primaryKey: 'id',
      indices: ['tags', 'createdAt', 'updatedAt'],
      columns: {
        id: 'TEXT (UUID)',
        title: 'TEXT (Plaintext preview)',
        content: 'TEXT (Encrypted in AES-GCM base64 if isEncrypted)',
        isEncrypted: 'INTEGER (Boolean flag)',
        tags: 'TEXT_ARRAY (Index queryable)',
        createdAt: 'TIMESTAMP (ISO8601 String)',
        updatedAt: 'TIMESTAMP (ISO8601 String)',
      }
    },
    keyConfig: {
      name: 'key_config',
      primaryKey: 'id',
      columns: {
        geminiKey: 'TEXT (Encrypted or masked local store)',
        openAIKey: 'TEXT (Encrypted or masked local store)',
        anthropicKey: 'TEXT (Encrypted or masked local store)',
        ollamaUrl: 'TEXT (Ollama endpoint)',
        activeProvider: 'TEXT (Active)',
        activeModel: 'TEXT (Model identifier)',
      }
    }
  }
};

// Initial notes template
const DEFAULT_NOTES: Note[] = [
  {
    id: 'note-1',
    title: '☀️ 5:00 AM Focus Routine',
    content: `# morning checklist

- [x] Clear brain-dump
- [x] Review current projects
- [x] Outline 3 critical daily objectives
- [ ] Implement local vector caching indexes

This NoteFlow space is locked and encrypted locally using **AES-256-GCM**. Work on high-level architecture tasks cleanly before daily noise begins.`,
    isEncrypted: false,
    tags: ['morning', 'productivity', 'archived'],
    createdAt: '2026-05-20T05:00:00.000Z',
    updatedAt: '2026-05-20T05:15:00.000Z',
  },
  {
    id: 'note-2',
    title: '🧠 Local RAG Core Ideas',
    content: `# noteflow local rag context injection

To execute context-aware local injection (Local RAG) without a centralized database, NoteFlow runs a lightweight tf-idf tag matching query and keyword relation extractor on the client.

## Core Flow:
1. Extract keyword tags from active note text (e.g., using slash command triggers).
2. Query localized database index for related notes matching those tags.
3. Compute quick TF-IDF overlap across content chunks.
4. Select top 3 snippets and bundle them into prompt:
   \`\`\`markdown
   --- LOCAL KNOWLEDGE CONTEXT CONTEXT ---
   [Snippet contents...]
   ---------------------------------------
   \`\`\`
5. Push payload to the user's selected LLM.`,
    isEncrypted: false,
    tags: ['ai', 'architecture', 'rag'],
    createdAt: '2026-05-20T09:30:00.000Z',
    updatedAt: '2026-05-20T10:00:00.000Z',
  },
  {
    id: 'note-3',
    title: '⚙️ Flutter Isar DB Schema Definition',
    content: `# Flutter Isar implementation template

\`\`\`dart
import 'package:isar/isar.dart';

part 'note.g.dart';

@collection
class NoteCollection {
  Id id = Isar.autoIncrement; // local auto index

  @Index(type: IndexType.hash)
  late String uuid;

  late String title;
  
  // Stored as encrypted AES string in local storage
  late String encryptedContent;

  late bool isEncrypted;

  late List<String> tags;

  late DateTime createdAt;
  late DateTime updatedAt;
}
\`\`\`

*This is secure by default since all decryption keys exist memory-only inside active runtime state.*`,
    isEncrypted: false,
    tags: ['mobile', 'dart', 'code'],
    createdAt: '2026-05-20T14:45:00.000Z',
    updatedAt: '2026-05-20T15:10:00.000Z',
  }
];

export class LocalNoteDatabase {
  private static STORAGE_KEY = 'noteflow_local_notes';

  static getNotes(): Note[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(DEFAULT_NOTES));
      return DEFAULT_NOTES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_NOTES;
    }
  }

  static saveNotes(notes: Note[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notes));
  }

  /**
   * Loads a note. If encrypted and masterPassword provided, decrypts it.
   */
  static async loadNoteWithDecryption(note: Note, password?: string): Promise<Note> {
    if (!note.isEncrypted || !password) {
      return note;
    }

    const { plaintext, success } = await decryptText(note.content, password);
    if (success) {
      return {
        ...note,
        content: plaintext,
      };
    } else {
      // Return note with error placeholder content or locked state
      return {
        ...note,
        content: `🔒 [Note Content remains encrypted, please supply correct Master Password to decrypt]`,
      };
    }
  }

  /**
   * Saves or updates a note. Encrypts content if masterPassword is saved/provided.
   */
  static async upsertNote(
    note: Omit<Note, 'createdAt' | 'updatedAt'> & { createdAt?: string },
    password?: string
  ): Promise<{ note: Note; success: boolean; error?: string }> {
    const notes = this.getNotes();
    const existingIndex = notes.findIndex(n => n.id === note.id);
    const now = new Date().toISOString();

    let contentToSave = note.content;
    let encryptFlag = !!password;

    if (encryptFlag && password) {
      const { ciphertext, success, error } = await encryptText(note.content, password);
      if (!success) {
        return {
          note: notes[existingIndex] || (note as Note),
          success: false,
          error: error || 'Encrypted packing failed',
        };
      }
      contentToSave = ciphertext;
    }

    const finalNote: Note = {
      id: note.id,
      title: note.title || 'Untitled Note',
      content: contentToSave,
      isEncrypted: encryptFlag,
      tags: note.tags || [],
      createdAt: note.createdAt || (existingIndex >= 0 ? notes[existingIndex].createdAt : now),
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      notes[existingIndex] = finalNote;
    } else {
      notes.unshift(finalNote);
    }

    this.saveNotes(notes);

    // Return the decrypted representation back so editor can continue editing seamlessly
    return {
      note: {
        ...finalNote,
        content: note.content, // keep the clean text in memory
      },
      success: true,
    };
  }

  static deleteNote(id: string): Note[] {
    const notes = this.getNotes();
    const filtered = notes.filter(n => n.id !== id);
    this.saveNotes(filtered);
    return filtered;
  }
}
