import { useState } from 'react';
import { Note } from '../types';
import { Search, Hash, Plus, Trash2, Calendar, FileText, Lock, PlusCircle } from 'lucide-react';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
}

export default function NoteList({ notes, selectedNoteId, onSelectNote, onCreateNote, onDeleteNote }: NoteListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract unique tags from notes
  const allTags = Array.from(
    new Set(notes.flatMap(n => n.tags))
  ).filter(t => t.length > 0);

  // Filter notes based on query and tag
  const filteredNotes = notes.filter(note => {
    const matchesQuery = 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = selectedTag ? note.tags.includes(selectedTag) : true;
    
    return matchesQuery && matchesTag;
  });

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200/60 rounded-2xl overflow-hidden shadow-2xs" id="note-list-container">
      {/* Header operations */}
      <div className="p-4 border-b border-gray-100 space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-sans font-semibold text-gray-900 flex items-center gap-1.5 select-none">
            <FileText className="h-4 w-4 text-indigo-500" /> Intellectual Nodes
          </span>
          
          <button
            onClick={onCreateNote}
            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg hover:shadow-2xs transition-all flex items-center justify-center cursor-pointer"
            id="create-note-icon-btn"
            title="Create new Node"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search local memory index..."
            className="w-full text-xs font-sans border border-gray-100 rounded-xl py-2 pl-9 pr-3 focus:outline-hidden focus:border-indigo-400 bg-gray-50/50 hover:bg-gray-50 focus:bg-white transition-colors"
            id="local-search-input"
          />
        </div>
      </div>

      {/* Dynamic Tag Filters bar */}
      {allTags.length > 0 && (
        <div className="px-4 py-2 bg-gray-50/40 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 select-none">
          <button
            onClick={() => setSelectedTag(null)}
            className={`text-3xs font-sans font-medium px-2 py-1 rounded-md shrink-0 transition-all ${
              selectedTag === null
                ? 'bg-indigo-600 text-white shadow-3xs'
                : 'bg-white border border-gray-100 text-gray-400 hover:text-gray-700'
            }`}
            id="tag-filter-all"
          >
            All tags
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`text-3xs font-sans font-medium px-2 py-0.5 rounded-md shrink-0 transition-all flex items-center gap-0.5 ${
                selectedTag === tag
                  ? 'bg-indigo-600 text-white shadow-3xs'
                  : 'bg-white border border-gray-100 hover:bg-gray-55 text-gray-500 hover:text-gray-800'
              }`}
              id={`tag-filter-${tag}`}
            >
              <Hash className="h-2 w-2" /> {tag}
            </button>
          ))}
        </div>
      )}

      {/* Note List Scroll Box */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
        {filteredNotes.map((note) => {
          const isSelected = selectedNoteId === note.id;
          const snippet = note.content
            .replace(/[#*`[\]-]/g, '') // strip md syntax
            .slice(0, 68) + (note.content.length > 68 ? '...' : '');

          return (
            <div
              key={note.id}
              className={`group rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? 'bg-indigo-50/30 border-indigo-400 text-indigo-950 shadow-2xs'
                  : 'bg-white border-gray-200/50 hover:border-gray-200'
              }`}
            >
              <div 
                onClick={() => onSelectNote(note.id)}
                className="cursor-pointer space-y-1"
                id={`note-item-select-${note.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-sans font-medium text-xs leading-snug group-hover:text-indigo-950 line-clamp-1">
                    {note.title || 'Untitled Node'}
                  </h4>
                  {note.isEncrypted && (
                    <span title="Locally Cryptographically Saved">
                      <Lock className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                    </span>
                  )}
                </div>

                <p className="text-3xs text-gray-400 font-sans leading-relaxed line-clamp-2">
                  {snippet || 'No text content drafts.'}
                </p>

                <div className="flex items-center justify-between gap-1 pt-1.5 select-none">
                  {/* Create time */}
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 font-sans">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>

                  {/* Inline list of tags */}
                  <div className="flex items-center gap-1 overflow-hidden">
                    {note.tags.slice(0, 2).map(t => (
                      <span key={t} className="text-3xs font-sans text-gray-400 bg-gray-100/60 px-1 py-0.5 rounded border border-gray-200/30">
                        {t}
                      </span>
                    ))}
                    {note.tags.length > 2 && (
                      <span className="text-3xs text-gray-400 font-sans font-medium">+{note.tags.length - 2}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hover delete trigger */}
              <div className="opacity-0 group-hover:opacity-100 flex justify-end border-t border-gray-50 mt-2.5 pt-1.5 transition-opacity duration-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                  className="p-1 hover:bg-gray-50 text-gray-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                  id={`btn-delete-note-${note.id}`}
                  title="Remove Node Permanently"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="text-center py-12 px-4 space-y-3">
            <PlusCircle className="h-8 w-8 text-gray-300 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-sans font-medium">Memory Index Empty</p>
              <p className="text-3xs text-gray-400 max-w-[150px] mx-auto font-sans">
                No local nodes found matching current filters.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
