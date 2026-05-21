import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, RAGChunk } from '../types';
import { queryLocalKnowledgeBase } from '../lib/rag';
import { BYOKService } from '../lib/byok';
import { Eye, Edit2, Play, Cpu, Sparkles, Check, HelpCircle, Copy, AlertCircle, RefreshCw } from 'lucide-react';

interface NoteEditorProps {
  note: Note;
  onSave: (noteId: string, title: string, content: string, tags: string[]) => void;
  allNotes: Note[];
  masterPassword?: string;
}

const SLASH_COMMANDS = [
  {
    cmd: '/summarize',
    title: '📝 Auto-Summarize',
    desc: 'Generate a clean, high-level summary of active thoughts.',
    prompt: 'Analyze this note content and generate a crisp, clean bulleted executive summary of the core concepts.'
  },
  {
    cmd: '/action-items',
    title: '✅ Action Items Extraction',
    desc: 'Extract actionable checklist bullets from this text.',
    prompt: 'Scan the active note, detect loose tasks or plans, and extract them into a clean markdown checklist task sequence.'
  },
  {
    cmd: '/connect-nodes',
    title: '🔗 Connect Past Nodes',
    desc: 'Identify conceptual overlaps with other files and write backlinks.',
    prompt: 'Compare this note against local context, specify references, identify gaps, and compile a list of backlink recommendations.'
  },
  {
    cmd: '/brainstorm',
    title: '💡 Brainstorm Adjacent Ideas',
    desc: 'Synthesize adjacent perspectives to expand your drafts.',
    prompt: 'Expand on these note details. Brainstorm 5 helpful adjacent ideas or engineering directions related to this.'
  },
  {
    cmd: '/improve-writing',
    title: '✨ Polish Sentence Clarity',
    desc: 'Enhance structure and tone for professional layouts.',
    prompt: 'Rewrite the note text, improving syntax, grammar, flowing cadence, and professional developer vocabulary.'
  }
];

export default function NoteEditor({ note, onSave, allNotes, masterPassword }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tagsInput, setTagsInput] = useState(note.tags.join(', '));
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'split'>('split');
  
  // RAG / AI states
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [searchCmd, setSearchCmd] = useState('');
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<{ text: string; matchedChunks: RAGChunk[]; debugLog: string } | null>(null);
  const [copiedNote, setCopiedNote] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when active note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTagsInput(note.tags.join(', '));
    setAiResult(null);
    setShowSlashMenu(false);
  }, [note]);

  // Handle saving
  const handleContentChange = (val: string) => {
    setContent(val);
    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    onSave(note.id, title, val, parsedTags);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    onSave(note.id, val, content, parsedTags);
  };

  const handleTagsChange = (val: string) => {
    setTagsInput(val);
    const parsedTags = val
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    onSave(note.id, title, content, parsedTags);
  };

  // Capture "/" key triggers to activate slash command popover
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '/') {
      setShowSlashMenu(true);
      setSearchCmd('/');
    } else if (e.key === 'Escape') {
      setShowSlashMenu(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    handleContentChange(val);

    if (showSlashMenu) {
      // Find the last "/" typed
      const lastSlashIdx = val.lastIndexOf('/');
      if (lastSlashIdx >= 0) {
        const query = val.slice(lastSlashIdx);
        setSearchCmd(query);
      } else {
        setShowSlashMenu(false);
      }
    }
  };

  // Run selected slash command (triggers actual RAG contextual pipelines)
  const triggerSlashCommand = async (command: typeof SLASH_COMMANDS[0]) => {
    setShowSlashMenu(false);
    setAiRunning(true);
    setAiResult(null);

    try {
      // 1. Locally query RAG intersections
      const { matchedChunks, debugLog } = queryLocalKnowledgeBase(note.id, content, allNotes, 3);
      
      // Inject chunks into string layout
      const localContextString = matchedChunks.length > 0
        ? matchedChunks.map((c, i) => `[Snippet #${i+1}] (From note: "${c.noteTitle}")\n${c.text}`).join('\n\n')
        : 'No related notes found in offline database.';

      // 2. Format LLM prompts
      const userPrompt = `ACTIVE NOTE CONTENT TO PROCESS AS TARGET:
--------------------
${content}
--------------------

TASK INSTRUCTION:
${command.prompt}

Generate standard Markdown outputs without self-referential greetings. Clean prose only.`;

      // 3. Dispatch directly to user BYOK active channel
      const response = await BYOKService.queryAI({
        prompt: userPrompt,
        context: localContextString,
        systemInstruction: 'You are NoteFlow AI, a secure client-side markdown co-pilot utilizing local RAG buffers.'
      });

      if (response.success) {
        setAiResult({
          text: response.text,
          matchedChunks,
          debugLog: `RAG INJECTION AUDITED SUCCESS\nProvider: ${response.providerUsed} (${response.modelUsed})\nLatency: ${response.latencyMs}ms\n\n${debugLog}`
        });
      } else {
        throw new Error(response.error);
      }
    } catch (err: any) {
      setAiResult({
        text: `Error Processing BYOK Pipeline:\n${err?.message || 'General connection lock. Check Settings Key configuration.'}`,
        matchedChunks: [],
        debugLog: `BYOK FAIL-TRIP:\n${err?.stack || err?.message}`
      });
    } finally {
      setAiRunning(false);
    }
  };

  const appendAiResult = () => {
    if (!aiResult) return;
    const addedContent = `${content}\n\n## 🤖 note co-pilot injection\n\n${aiResult.text}`;
    handleContentChange(addedContent);
    setAiResult(null);
  };

  const replaceWithAiResult = () => {
    if (!aiResult) return;
    handleContentChange(aiResult.text);
    setAiResult(null);
  };

  const copyToClipboard = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult.text);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  // Clean Markdown Renderer CSS wrapping
  const renderCodeBlock = (props: any) => {
    const { children, className } = props;
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1] : 'code';

    return (
      <div className="my-4 border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="bg-gray-50 border-b border-gray-200/60 px-4 py-1.5 flex items-center justify-between text-2xs font-mono text-gray-500 font-medium">
          <span>{lang.toUpperCase()}</span>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
            }}
            className="hover:text-indigo-600 transition-colors cursor-pointer"
          >
            Copy snippet
          </button>
        </div>
        <pre className="p-4 bg-gray-950 text-indigo-50 font-mono text-xs overflow-x-auto leading-relaxed">
          <code>{children}</code>
        </pre>
      </div>
    );
  };

  // Filter commands
  const filteredCommands = SLASH_COMMANDS.filter(cmd => 
    cmd.cmd.toLowerCase().includes(searchCmd.toLowerCase()) || 
    cmd.title.toLowerCase().includes(searchCmd.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-6" id="note-editor-container">
      {/* Settings bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex-1 space-y-1">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled Node..."
            className="w-full text-xl font-sans font-semibold text-gray-900 border-0 p-0 focus:ring-0 placeholder-gray-300"
            id="note-title-input"
          />
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="tags (e.g., productivity, ideas)"
              className="text-2xs font-mono text-indigo-600 border-0 p-0 focus:ring-0 placeholder-gray-400 max-w-sm"
              id="note-tags-input"
            />
            {note.isEncrypted && (
              <span className="text-3xs font-mono font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                AES SECURED
              </span>
            )}
          </div>
        </div>

        {/* View Toggles */}
        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 self-start shrink-0">
          <button
            onClick={() => setEditorMode('edit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium hover:text-gray-900 transition-colors flex items-center gap-1.5 ${
              editorMode === 'edit' ? 'bg-white text-indigo-600 shadow-3xs' : 'text-gray-500'
            }`}
            id="btn-ctrl-edit"
          >
            <Edit2 className="h-3.5 w-3.5" /> Source
          </button>
          <button
            onClick={() => setEditorMode('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium hover:text-gray-900 transition-colors flex items-center gap-1.5 ${
              editorMode === 'preview' ? 'bg-white text-indigo-600 shadow-3xs' : 'text-gray-500'
            }`}
            id="btn-ctrl-preview"
          >
            <Eye className="h-3.5 w-3.5" /> Render
          </button>
          <button
            onClick={() => setEditorMode('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium hover:text-gray-900 transition-colors hidden md:flex items-center gap-1.5 ${
              editorMode === 'split' ? 'bg-white text-indigo-600 shadow-3xs' : 'text-gray-500'
            }`}
            id="btn-ctrl-split"
          >
            <Sparkles className="h-3.5 w-3.5" /> Split Screen
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 relative">
        {/* EDIT FRAME (Left/Single) */}
        {(editorMode === 'edit' || editorMode === 'split') && (
          <div className="flex flex-col border border-gray-200/70 rounded-2xl bg-white p-4 h-full relative group">
            <span className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-wider mb-2 block select-none">
              Markdown Source Buffer
            </span>
            <span className="text-3xs font-sans text-indigo-400 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              Type <strong className="font-bold font-mono">/</strong> to activate AI co-pilot commands
            </span>
            
            <textarea
              ref={textareaRef}
              value={content}
              onKeyDown={handleKeyDown}
              onChange={handleTextareaChange}
              placeholder="Begin typing Markdown nodes, type '/' for AI commands..."
              className="flex-1 w-full h-full resize-none border-0 p-0 text-sm font-sans focus:ring-0 focus:outline-hidden text-gray-800 leading-relaxed placeholder-gray-300"
              id="note-textarea"
            />

            {/* Floating Slash Command Menu */}
            {showSlashMenu && (
              <div 
                className="absolute left-6 bottom-16 w-80 max-h-60 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-20 flex flex-col"
                id="slash-command-dropdown"
              >
                <div className="bg-indigo-50/50 border-b border-gray-200/60 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-mono text-indigo-950 font-bold">In-Note Action Slates</span>
                  <span className="text-3xs text-gray-400">Esc to cancel</span>
                </div>
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                  {filteredCommands.map((command, idx) => (
                    <button
                      key={idx}
                      onClick={() => triggerSlashCommand(command)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50/30 transition-all flex flex-col gap-0.5 group shrink-0"
                      id={`slash-cmd-${command.cmd.substring(1)}`}
                    >
                      <span className="text-xs font-sans font-medium text-gray-900 group-hover:text-indigo-950">
                        {command.title}
                      </span>
                      <span className="text-3xs text-gray-400 font-sans leading-relaxed">
                        {command.desc}
                      </span>
                    </button>
                  ))}
                  {filteredCommands.length === 0 && (
                    <div className="p-3 text-center text-xs text-gray-400">No qualifying prompts found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PREVIEW FRAME (Right/Single) */}
        {(editorMode === 'preview' || editorMode === 'split') && (
          <div className="border border-gray-200/75 rounded-2xl bg-gray-50/50 p-6 overflow-y-auto h-full markdown-body">
            <span className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-wider mb-4 block select-none border-b border-gray-200/40 pb-2">
              Compiled Document Preview
            </span>
            
            <div className="prose prose-sm prose-slate max-w-none text-gray-800 leading-relaxed font-sans space-y-4">
              <ReactMarkdown
                components={{
                  code: renderCodeBlock
                }}
              >
                {content || '*No content written yet. Begin taking notes!*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* RAG Context Loader / Process Panel */}
      {aiRunning && (
        <div className="border border-indigo-100 bg-indigo-50/35 rounded-2xl p-5 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin" />
            <div className="space-y-0.5">
              <span className="text-xs font-sans font-semibold text-indigo-950 block">NoteFlow local-first RAG executing...</span>
              <p className="text-3xs text-gray-500 font-sans leading-none mt-0.5">
                Compiling tf-idf keywords across storage buffer pools and fetching target LLM parameters securely.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Markdown preview diff before merge */}
      {aiResult && (
        <div className="border border-indigo-200/70 bg-white shadow-lg rounded-2xl overflow-hidden" id="ai-suggestion-box">
          <div className="bg-indigo-50/50 border-b border-indigo-100 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-indigo-950">
              <Sparkles className="h-4 w-4 text-indigo-600 animate-bounce" />
              <span className="text-xs font-sans font-semibold">Workspace AI Suggestion Compiler</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="text-3xs px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors flex items-center gap-1"
                id="btn-copy-ai"
              >
                <Copy className="h-3 w-3" /> {copiedNote ? 'Copied' : 'Copy Output'}
              </button>
              <button
                onClick={appendAiResult}
                className="text-3xs px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                id="btn-append-ai"
              >
                <Check className="h-3 w-3" /> Append Below
              </button>
              <button
                onClick={replaceWithAiResult}
                className="text-3xs px-2.5 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1 cursor-pointer"
                id="btn-replace-ai"
              >
                Overwrites note
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            {/* The Text Result (Leve 3) */}
            <div className="lg:col-span-3 p-6 max-h-96 overflow-y-auto border-b lg:border-b-0 lg:border-r border-indigo-100 prose prose-sm">
              <ReactMarkdown>{aiResult.text}</ReactMarkdown>
            </div>

            {/* The Logs and RAG summary (Level 2) */}
            <div className="lg:col-span-2 bg-gray-950 p-6 flex flex-col justify-between max-h-96 overflow-y-auto">
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block font-bold">
                  On-device Trace Statistics
                </span>
                <pre className="font-mono text-xs text-indigo-100 select-all leading-relaxed whitespace-pre-wrap">
                  {aiResult.debugLog}
                </pre>
              </div>
              <div className="text-[10px] font-mono text-gray-500 mt-6 pt-4 border-t border-gray-900 flex items-center gap-1 shrink-0">
                <AlertCircle className="h-3 w-3 text-gray-500" />
                No credentials left this browser frame sandbox.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
