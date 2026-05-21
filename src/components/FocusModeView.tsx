import { useState, useEffect } from 'react';
import { Note, FocusObjective } from '../types';
import { LocalNoteDatabase } from '../lib/db';
import { Sun, CheckCircle2, ChevronRight, PenTool, Coffee, Wind, BookOpen, Volume2, VolumeX, Plus, Trash2 } from 'lucide-react';

interface FocusModeViewProps {
  onNoteCreated: (note: Note) => void;
  allNotes: Note[];
  masterPassword?: string;
}

export default function FocusModeView({ onNoteCreated, allNotes, masterPassword }: FocusModeViewProps) {
  const [brainDump, setBrainDump] = useState('');
  const [objectives, setObjectives] = useState<FocusObjective[]>([]);
  const [newObjective, setNewObjective] = useState('');
  const [soundActive, setSoundActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathPulse, setBreathPulse] = useState(1); // Scale multiplier

  // 1. Objectives local storage loading
  useEffect(() => {
    const saved = localStorage.getItem('noteflow_morning_objectives');
    if (saved) {
      try {
        setObjectives(JSON.parse(saved));
      } catch (e) {
        setObjectives([]);
      }
    } else {
      setObjectives([
        { id: 'obj-1', text: 'Spend 10 minutes in absolute silent planning', completed: false },
        { id: 'obj-2', text: 'Establish the #1 primary milestone for today', completed: false },
        { id: 'obj-3', text: 'Clean brain-dump any pending stress loops', completed: false }
      ]);
    }
  }, []);

  const saveObjectives = (updated: FocusObjective[]) => {
    setObjectives(updated);
    localStorage.setItem('noteflow_morning_objectives', JSON.stringify(updated));
  };

  // 2. Breathing visual loop simulator (Calm Focus UI)
  useEffect(() => {
    let breathInterval: NodeJS.Timeout;
    let frame = 0;

    breathInterval = setInterval(() => {
      frame = (frame + 1) % 3;
      if (frame === 0) {
        setBreathPhase('Inhale');
        setBreathPulse(1.15);
      } else if (frame === 1) {
        setBreathPhase('Hold');
        setBreathPulse(1.15);
      } else {
        setBreathPhase('Exhale');
        setBreathPulse(0.92);
      }
    }, 4000); // 4 seconds per phase

    return () => clearInterval(breathInterval);
  }, []);

  // 3. Filter notes to early morning clean-slate relevant notes
  // Hides archived or older noisy items, shows only note entries which contain 'morning' tag, or are created today
  const morningNotes = allNotes.filter(n => {
    const isMorningTag = n.tags.some(t => t.toLowerCase() === 'morning' || t.toLowerCase() === 'productivity');
    const isToday = new Date(n.createdAt).toDateString() === new Date().toDateString();
    return isMorningTag || isToday;
  });

  const handleCreateObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjective.trim()) return;
    const added: FocusObjective = {
      id: `obj-${Date.now()}`,
      text: newObjective.trim(),
      completed: false
    };
    const updated = [...objectives, added];
    saveObjectives(updated);
    setNewObjective('');
  };

  const toggleObjective = (id: string) => {
    const updated = objectives.map(obj => 
      obj.id === id ? { ...obj, completed: !obj.completed } : obj
    );
    saveObjectives(updated);
  };

  const deleteObjective = (id: string) => {
    const updated = objectives.filter(obj => obj.id !== id);
    saveObjectives(updated);
  };

  // Turn Morning Brain-Dump into a real Markdown note Flow
  const handleCompileBrainDump = async () => {
    if (!brainDump.trim()) return;

    // Build markdown content with automated meta tags
    const title = `☀️ Morning Dump — ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    const compiledMarkdown = `# morning brain-dump

${brainDump}

---
*Created during 5:00 AM Focus session.*`;

    const { note, success } = await LocalNoteDatabase.upsertNote({
      id: `note-${Date.now()}`,
      title: title,
      content: compiledMarkdown,
      isEncrypted: !!masterPassword,
      tags: ['morning', 'brain-dump', 'daily-log']
    }, masterPassword);

    if (success) {
      onNoteCreated(note);
      setBrainDump('');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-6" id="focus-mode-container">
      {/* Soothing morning header greeting */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-800 pb-6 gap-4">
        <div className="space-y-1.5">
          <div className="text-xs font-mono font-semibold text-indigo-400 tracking-widest flex items-center gap-2 uppercase">
            <Sun className="h-4 w-4 animate-spin text-amber-500" style={{ animationDuration: '10s' }} />
            5:00 AM Dawn Reset Active
          </div>
          <h1 className="text-3xl font-sans font-medium tracking-tight text-white">
            The Morning Quiet Hours
          </h1>
          <p className="text-gray-400 text-xs font-sans leading-relaxed max-w-lg">
            Focus Mode hides older archival notes, highlighting today's priorities in a zero-distraction 
            slate layout. Clear your cognitive RAM through simple dump sequences.
          </p>
        </div>

        {/* Dynamic breathing pacing indicator (Aesthetic Calm UI element) */}
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-2.5 shrink-0 select-none">
          <div 
            className="h-3 w-3 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 transition-all duration-[4000ms] ease-in-out shrink-0" 
            style={{ transform: `scale(${breathPulse})` }}
          />
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold leading-none">
              Inhale Engine
            </span>
            <span className="text-xs font-sans font-medium text-cyan-200 block leading-none">
              {breathPhase} Cycles
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Morning brain dump text column (Left) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-sans font-medium text-white flex items-center gap-2 select-none">
              <PenTool className="h-4 w-4 text-indigo-400" /> Morning Brain-Dump Slate
            </h3>
            
            <p className="text-2xs text-gray-400 font-sans leading-relaxed">
              Pour out raw thoughts, stress loops, or lingering ideas below without formatting boundaries. 
              Once finished, compile it safely as a permanent workspace note file.
            </p>

            <textarea
              value={brainDump}
              onChange={(e) => setBrainDump(e.target.value)}
              placeholder="Dump whatever occupies mind space..."
              className="w-full h-72 bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm font-sans text-gray-100 placeholder-gray-600 focus:outline-hidden focus:border-indigo-500 hover:border-gray-800 focus:ring-0 leading-relaxed font-sans"
              id="morning-dump-textarea"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase">
                {brainDump.length} characters typed
              </span>

              <button
                disabled={!brainDump.trim()}
                onClick={handleCompileBrainDump}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-sans font-medium rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:hover:bg-indigo-600 flex items-center gap-1.5 cursor-pointer"
                id="compile-dump-btn"
              >
                <ChevronRight className="h-4 w-4" /> Save as Markdown Note
              </button>
            </div>
          </div>
        </div>

        {/* objectives checklist column (Right) */}
        <div className="space-y-6">
          {/* Daily morning objectives checklist */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-sans font-medium text-white flex items-center justify-between gap-2 select-none">
              <span className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-500" /> Dawn Objectives Checklist
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {objectives.filter(o => o.completed).length}/{objectives.length} Done
              </span>
            </h3>

            {/* List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {objectives.map((obj) => (
                <div 
                  key={obj.id}
                  className="flex items-start justify-between gap-2 p-3 rounded-xl border border-gray-800/40 bg-gray-950 hover:border-gray-800 transition-colors group"
                >
                  <button
                    onClick={() => toggleObjective(obj.id)}
                    className="flex items-start gap-2.5 text-left text-xs font-sans flex-1"
                    id={`toggle-obj-${obj.id}`}
                  >
                    <CheckCircle2 className={`h-4 w-4 shrink-0 transition-colors mt-0.5 ${
                      obj.completed ? 'text-indigo-400' : 'text-gray-600 group-hover:text-gray-400'
                    }`} />
                    <span className={`leading-relaxed ${obj.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                      {obj.text}
                    </span>
                  </button>

                  <button 
                    onClick={() => deleteObjective(obj.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-800 text-gray-500 hover:text-red-400 rounded-md transition-all cursor-pointer"
                    id={`delete-obj-${obj.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {objectives.length === 0 && (
                <div className="text-center py-6 text-gray-600 font-sans text-xs">
                  Zero morning objectives. Set 3 targets to map your focus.
                </div>
              )}
            </div>

            {/* Add Custom target form */}
            <form onSubmit={handleCreateObjective} className="flex gap-2">
              <input
                type="text"
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                placeholder="Launch custom target..."
                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-hidden focus:border-indigo-500"
                id="morning-obj-input"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer shrink-0"
                id="morning-obj-submit"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          {/* Morning Slate active nodes filter */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-mono font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5 select-none">
              <BookOpen className="h-3.5 w-3.5" /> Active Morning Nodes ({morningNotes.length})
            </h4>

            <div className="space-y-2">
              {morningNotes.map((note) => (
                <div key={note.id} className="p-3 rounded-xl bg-gray-950 border border-gray-800/60 flex flex-col gap-1 hover:border-indigo-900 transition-all select-none">
                  <span className="text-xs font-sans font-medium text-gray-200 line-clamp-1">{note.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-900">
                      TAG OVERLAP
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(note.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                  </div>
                </div>
              ))}

              {morningNotes.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-600 font-sans">
                  No early planning or morning nodes created today.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
