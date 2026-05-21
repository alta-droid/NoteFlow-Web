export interface Note {
  id: string;
  title: string;
  content: string;
  isEncrypted: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama';

export interface KeyConfig {
  geminiKey: string;
  openAIKey: string;
  anthropicKey: string;
  ollamaUrl: string;
  activeProvider: AIProvider;
  activeModel: string;
}

export interface FocusObjective {
  id: string;
  text: string;
  completed: boolean;
}

export interface RAGChunk {
  noteId: string;
  noteTitle: string;
  text: string;
  score?: number;
}
