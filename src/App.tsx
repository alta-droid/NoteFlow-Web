import { useState, useEffect } from 'react';
import { Note, KeyConfig } from './types';
import { LocalNoteDatabase } from './lib/db';
import { BYOKService } from './lib/byok';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import FocusModeView from './components/FocusModeView';
import ArchitectureView from './components/ArchitectureView';
import SettingsView from './components/SettingsView';
import { 
  FileText, Shield, Sun, Network, Key, Sparkles, 
  Moon, ToggleLeft, ToggleRight, Lock, Unlock, RefreshCw, Layers, Cpu
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'focus' | 'architecture' | 'settings'>('editor');
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [keys, setKeys] = useState<KeyConfig>(BYOKService.getKeys());
  const [activeNoteText, setActiveNoteText] = useState<string>('');
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Load initial notes and select the first note on mount
  useEffect(() => {
    const loaded = LocalNoteDatabase.getNotes();
    setNotes(loaded);
    if (loaded.length > 0) {
      setSelectedNoteId(loaded[0].id);
    }
  }, []);

  // Update notes list
  const refreshNotesList = () => {
    setNotes(LocalNoteDatabase.getNotes());
  };

  // Select note handler
  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
  };

  // Create empty new note
  const handleCreateNote = () => {
    const newId = `note-${Date.now()}`;
    const newNote: Note = {
      id: newId,
      title: 'New Drafting Node',
      content: '# untitled node\n\nBegin editing this decentralized memory stream...',
      isEncrypted: !!masterPassword,
      tags: ['draft'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const loaded = LocalNoteDatabase.getNotes();
    const updated = [newNote, ...loaded];
    LocalNoteDatabase.saveNotes(updated);
    setNotes(updated);
    setSelectedNoteId(newId);
    setActiveTab('editor'); // switch immediately to editor
  };

  // Delete notes
  const handleDeleteNote = (id: string) => {
    const updated = LocalNoteDatabase.deleteNote(id);
    setNotes(updated);
    
    // Choose next adjacent note to focus on
    if (selectedNoteId === id) {
      if (updated.length > 0) {
        setSelectedNoteId(updated[0].id);
      } else {
        setSelectedNoteId(null);
      }
    }
  };

  // Save changes from editor (auto-upserts)
  const handleSaveNote = async (id: string, title: string, content: string, tags: string[]) => {
    // Determine encryption flag
    const noteToSave = { id, title, content, tags, isEncrypted: !!masterPassword };
    const { success, note } = await LocalNoteDatabase.upsertNote(noteToSave, masterPassword || undefined);
    if (success) {
      setNotes(prevNotes => prevNotes.map(n => n.id === id ? note : n));
    }
  };

  const handleNoteCreatedFromFocus = (newNote: Note) => {
    refreshNotesList();
    setSelectedNoteId(newNote.id);
    setActiveTab('editor');
  };

  // Fetch active note reference
  const activeRawNote = notes.find(n => n.id === selectedNoteId);

  // Decrypt Note content locally inside memory space
  const [decryptedActiveNote, setDecryptedActiveNote] = useState<Note | null>(null);
  const [decryptionError, setDecryptionError] = useState<boolean>(false);

  useEffect(() => {
    const decryptSelectedNote = async () => {
      if (!activeRawNote) {
        setDecryptedActiveNote(null);
        setDecryptionError(false);
        return;
      }

      if (!activeRawNote.isEncrypted) {
        setDecryptedActiveNote(activeRawNote);
        setDecryptionError(false);
        return;
      }

      // If active note is encrypted but no password provided, toggle block state
      if (!masterPassword) {
        setDecryptionError(true);
        setDecryptedActiveNote({
          ...activeRawNote,
          content: '🔒 Note is encrypted. Set master password in Security drawer or enter password to unlock.'
        });
        return;
      }

      const decrypted = await LocalNoteDatabase.loadNoteWithDecryption(activeRawNote, masterPassword);
      if (decrypted.content.startsWith('🔒 [Note Content')) {
        setDecryptionError(true);
      } else {
        setDecryptionError(false);
      }
      setDecryptedActiveNote(decrypted);
    };

    decryptSelectedNote();
  }, [selectedNoteId, activeRawNote, masterPassword]);

  // Handle password entry directly next to file
  const [pwdInput, setPwdInput] = useState('');
  const handleUnlockNode = () => {
    setMasterPassword(pwdInput);
    setPwdInput('');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50/70 text-gray-800'} flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900`} id="applet-shell">
      
      {/* Premium header container */}
      <header className={`px-6 py-4 flex flex-col md:flex-row items-center justify-between border-b gap-4 shrink-0 transition-colors ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-linear-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/10">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`text-base font-sans font-semibold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                NoteFlow Studio
              </span>
              <span className="text-[10px] bg-indigo-50/50 border border-indigo-100 text-indigo-600 font-mono px-1.5 py-0.5 rounded-full select-none font-bold">
                Local RAG & BYOK
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-sans leading-none select-none">
              Decentralized On-Device Intelligence Terminal
            </p>
          </div>
        </div>

        {/* Global Nav Toggles */}
        <nav className="flex bg-gray-100/75 p-1 rounded-xl border border-gray-100 select-none">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${
              activeTab === 'editor' ? 'bg-indigo-600 text-white shadow-xs scale-102' : 'text-gray-500 hover:text-gray-900'
            }`}
            id="tab-btn-editor"
          >
            <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Memory Nodes</span>
          </button>
          
          <button
            onClick={() => setActiveTab('focus')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${
              activeTab === 'focus' ? 'bg-indigo-600 text-white shadow-xs scale-102' : 'text-gray-500 hover:text-gray-900'
            }`}
            id="tab-btn-focus"
          >
            <span className="flex items-center gap-1.5"><Sun className="h-3.5 w-3.5 text-amber-500" /> 5:00 AM Reset</span>
          </button>
          
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${
              activeTab === 'architecture' ? 'bg-indigo-600 text-white shadow-xs scale-102' : 'text-gray-500 hover:text-gray-900'
            }`}
            id="tab-btn-architecture"
          >
            <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Core Systems</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${
              activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-xs scale-102' : 'text-gray-500 hover:text-gray-900'
            }`}
            id="tab-btn-settings"
          >
            <span className="flex items-center gap-1.5"><Key className="h-3.5 w-3.5" /> Credentials</span>
          </button>
        </nav>

        {/* Action icons bar */}
        <div className="flex items-center gap-3 select-none">
          {/* Active provider preview indicator badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            <Cpu className="h-3.5 w-3.5 text-indigo-500" />
            <div className="text-left">
              <span className="text-[8px] text-gray-400 font-mono tracking-wider block font-bold leading-none">AI PIPELINE</span>
              <span className="text-[10px] text-gray-700 font-sans font-medium leading-none block mt-0.5">
                {keys.activeProvider.toUpperCase()} ({keys.activeModel.split('-').slice(-1)[0]})
              </span>
            </div>
          </div>

          {/* Master Password Indicator lock badge */}
          <div className={`p-2 rounded-xl border flex items-center justify-center ${
            masterPassword ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'
          }`} title={masterPassword ? 'AES Storage Shield Active' : 'AES Cryptographic locks off'}>
            {masterPassword ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </div>

          {/* Interactive Visual Dark Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-xl border border-gray-100 transition-colors cursor-pointer"
            id="btn-toggle-theme"
            title="Toggle environment layout ambient dark mode"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Canvas Segment */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 min-h-0">
        
        {/* Memory Editor Tab View */}
        {activeTab === 'editor' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px] h-[calc(100vh-140px)]">
            
            {/* Sidebar list indexing (1 Column) */}
            <div className="lg:col-span-1 h-full min-h-0">
              <NoteList
                notes={notes}
                selectedNoteId={selectedNoteId}
                onSelectNote={handleSelectNote}
                onCreateNote={handleCreateNote}
                onDeleteNote={handleDeleteNote}
              />
            </div>

            {/* Note compilation slate (3 Columns) */}
            <div className="lg:col-span-3 h-full min-h-0">
              {decryptedActiveNote ? (
                decryptionError ? (
                  // Locked decryption overlay input screen
                  <div className="h-full border border-gray-200 bg-white rounded-2xl p-8 flex flex-col justify-center items-center shadow-xs" id="note-decryption-form">
                    <div className="h-16 w-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mb-4 text-emerald-600 text-center animate-bounce">
                      <Lock className="h-8 w-8" />
                    </div>
                    <div className="text-center max-w-sm space-y-2 mb-6 select-none">
                      <span className="text-xs font-mono font-semibold text-emerald-600 tracking-wider uppercase block">
                        File Is AES Encrypted
                      </span>
                      <h3 className="text-lg font-sans font-medium text-gray-900">
                        Supply Master Key To Unlock
                      </h3>
                      <p className="text-gray-400 text-xs font-sans leading-relaxed">
                        NoteFlow employs zero-knowledge schemas. Supply the local 256-bit password to extract plaintext 
                        directly inside runtime heap.
                      </p>
                    </div>

                    <div className="flex gap-2 max-w-xs w-full">
                      <input
                        type="password"
                        value={pwdInput}
                        onChange={(e) => setPwdInput(e.target.value)}
                        placeholder="Enter master password..."
                        className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2 hover:border-gray-300 focus:outline-hidden focus:border-indigo-500 font-sans"
                        id="unlocked-pwd-input"
                      />
                      <button
                        onClick={handleUnlockNode}
                        disabled={!pwdInput}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-sans font-medium rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
                        id="unlocked-pwd-submit"
                      >
                        Unlock Note
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-400 font-sans tracking-wide mt-6 leading-relaxed text-center">
                      Forgotten passwords make the ciphertext files permanently irrecoverable. NoteFlow saves nothing on outer databases.
                    </p>
                  </div>
                ) : (
                  <NoteEditor
                    key={decryptedActiveNote.id}
                    note={decryptedActiveNote}
                    onSave={handleSaveNote}
                    allNotes={notes}
                    masterPassword={masterPassword}
                  />
                )
              ) : (
                <div className="h-full border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 select-none">
                  <FileText className="h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-sans">No Intellectual Note Node Selected</p>
                  <button
                    onClick={handleCreateNote}
                    className="mt-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all cursor-pointer font-sans"
                    id="btn-create-note-fallback"
                  >
                    Launch New Memory Node
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 5:00 AM Reset Dawn Focus Tab View */}
        {activeTab === 'focus' && (
          <FocusModeView
            onNoteCreated={handleNoteCreatedFromFocus}
            allNotes={notes}
            masterPassword={masterPassword}
          />
        )}

        {/* Architecture Presentation Tab View */}
        {activeTab === 'architecture' && (
          <ArchitectureView />
        )}

        {/* Secure BYOK Configurations Tab View */}
        {activeTab === 'settings' && (
          <SettingsView
            onKeysChanged={(newKeys) => setKeys(newKeys)}
            masterPassword={masterPassword}
            onMasterPasswordChanged={(pwd) => setMasterPassword(pwd)}
          />
        )}

      </main>

      {/* Safety telemetry banner */}
      <footer className="py-4 border-t border-gray-100 bg-white px-6 flex flex-col sm:flex-row items-center justify-between text-3xs text-gray-400 font-mono gap-2 shrink-0 select-none">
        <div>
          NoteFlow Core Engine. Running on Sandboxed Container: 100% Client-Side Direct AI Channels.
        </div>
        <div>
          E2EE Key Matrix Mode: {masterPassword ? 'ACTIVE (In-Memory Heap)' : 'NONE'}
        </div>
      </footer>

    </div>
  );
}
