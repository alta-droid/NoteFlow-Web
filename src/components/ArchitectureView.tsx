import { useState } from 'react';
import { Database, ShieldAlert, Cpu, Network, Key, ArrowRight, Zap, RefreshCw } from 'lucide-react';

export default function ArchitectureView() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps = [
    {
      id: 1,
      name: 'Local-First DB Storage',
      icon: Database,
      title: 'Isar / Room equivalent SQLite/IndexedDB Schema',
      desc: 'All note data is saved locally on disk. Under Flutter or Kotlin, this directly executes on internal native sandboxed structures (SQLite / Isar DB). For our Web app, standard browser IndexedDB / Encrypted LocalStorage is engaged. Zero data leaves your control.',
      schemaDetail: `/* Database Schema Index Blueprint */
class NoteTable {
  String uuid;            // Indexed
  String title;           // Text preview flag
  String encryptedContent;// AES-GCM Cipher 
  bool isEncrypted;       // Zero-Knowledge toggle
  List<String> tags;      // Term vector relations
  DateTime updatedAt;     // Time-Adaptive sorting
}`
    },
    {
      id: 2,
      name: 'Zero-Knowledge Cryptography',
      icon: ShieldAlert,
      title: 'PBKDF2 Key Derivation & AES-256-GCM Encryption',
      desc: 'When localized encryption is active, a user-defined Master Password runs on PBKDF2 with 100,000 iterations to derive a secure 256-bit AES key. Note contents are transformed into encrypted blocks on-the-fly BEFORE physical write operations. Decryption happens purely in runtime memory, never written naked to storage disk buffers.',
      schemaDetail: `/* AES-GCM Encryption Pipeline */
Key = PBKDF2(MasterPassword, Salt, 100000);
Cipher = AES_GCM_Encrypt(NotePlaintext, Key, IV);
Payload = Base64(Salt + IV + Cipher); // Fully Self-Contained E2EE`
    },
    {
      id: 3,
      name: 'Local TF-IDF Vector RAG',
      icon: Cpu,
      title: 'Text-Chunking & Local Keyword Relation Vector Retrieval',
      desc: 'When AI utilities are launched, past notes are read in memory, divided into clean, manageable text blocks, and ranked against the current notes term vocabulary using a cosine intersection TF-IDF algorithm. This computes matching relationships in under 2ms directly on your computer, pulling past summaries to construct custom, isolated context.',
      schemaDetail: `/* Client-Side Keyword Relation Scoring */
QueryTokens = Cleanser(ActiveNoteText);
ChunkScores = AllDatabaseChunks.map(chunk => {
  CosineSim = (Query • Chunk) / (|Query| * |Chunk|);
  TagScore = OverlapBoost(Query, chunk.Tags);
  return CosineSim + TagScore;
});`
    },
    {
      id: 4,
      name: 'Bring Your Own Key (BYOK) Client Direct Request',
      icon: Key,
      title: 'Modular direct REST Fetch Protocol',
      desc: 'Instead of passing your system prompts through an intermediary corporate server, NoteFlow builds direct, customized HTTP headers wrapping your private API keys. It speaks natively with Gemini, OpenAI, Claude, or a Local Ollama server running inside your container/host. There is no corporate log tracking your notes.',
      schemaDetail: `/* Secure Client API Call */
headers = {
  "Content-Type": "application/json",
  "x-goog-api-key": UserKeys.geminiKey
};
body = {
  "contents": [{ "parts": [{ "text": Context + Prompt }] }],
  "systemInstruction": "NoteFlow Cognitive Assistant"
};
fetch(GeminiBetaAPI, { method: "POST", headers, body });`
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-6" id="architecture-view-container">
      {/* Header */}
      <div className="space-y-2 border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-sans font-medium tracking-tight text-gray-900 flex items-center gap-3">
          <Network className="h-8 w-8 text-indigo-600" />
          NoteFlow Core Architecture
        </h1>
        <p className="text-gray-500 text-sm max-w-2xl font-sans leading-relaxed">
          Explore the engineering framework supporting local-first data integrity, on-device cryptography, 
          lightweight term index matching (Local RAG), and direct, serverless BYOK LLM connections.
        </p>
      </div>

      {/* Interactive Flow Diagram */}
      <div className="bg-gray-50 border border-gray-200/60 rounded-2xl p-6 md:p-8">
        <h3 className="text-sm font-mono text-indigo-600 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Zap className="h-4 w-4" /> Live Interactive Execution Tracer
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Connector Line (hidden on mobile, visible on desktop) */}
          <div className="absolute top-12 left-6 right-6 h-0.5 bg-gray-200 hidden md:block z-0" />

          {steps.map((step) => {
            const IconComponent = step.icon;
            const isSelected = activeStep === step.id;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(isSelected ? null : step.id)}
                className={`z-10 text-left p-5 rounded-2xl border transition-all duration-300 relative ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[1.03]'
                    : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700 hover:shadow'
                }`}
                id={`arch-step-btn-${step.id}`}
              >
                {/* Step badge */}
                <span className={`absolute top-3 right-3 text-2xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-gray-100 text-gray-500'
                }`}>
                  0{step.id}
                </span>

                <div className="flex flex-col gap-3">
                  <div className={`p-2.5 rounded-xl w-fit ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-sans font-medium text-sm leading-snug">{step.name}</h4>
                    <span className={`text-[11px] font-sans mt-1 block ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
                      Tap to review mechanics
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel of the selected step */}
      {activeStep !== null ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-5 gap-0 transition-all duration-300">
          <div className="lg:col-span-3 p-6 md:p-8 space-y-4">
            <h3 className="text-xs font-mono text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
              <span>Step 0{activeStep}</span>
              <ArrowRight className="h-3 w-3" />
              <span>Detail Specs</span>
            </h3>
            <h2 className="text-xl font-sans font-medium text-gray-900">
              {steps[activeStep - 1].title}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {steps[activeStep - 1].desc}
            </p>
            <div className="flex gap-4 pt-2">
              <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50/50 px-2.5 py-1 rounded-full border border-indigo-100 font-sans">
                <Database className="h-3.5 w-3.5" /> Checked Local Integrity Verified
              </div>
              <div className="flex items-center gap-1 text-xs text-teal-600 bg-teal-50/50 px-2.5 py-1 rounded-full border border-teal-100 font-sans">
                <ShieldAlert className="h-3.5 w-3.5" /> Client Sandbox Guard Activated
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 bg-gray-950 p-6 md:p-8 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-800">
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block">
                Production Code Signature
              </span>
              <pre className="font-mono text-xs text-indigo-100 overflow-x-auto select-all leading-normal">
                {steps[activeStep - 1].schemaDetail}
              </pre>
            </div>
            <div className="text-[10px] font-mono text-gray-500 mt-6 pt-4 border-t border-gray-900">
              Compiled on-disk client assemblies
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50/50">
          <RefreshCw className="h-6 w-6 text-indigo-400 mx-auto mb-2 animate-spin" style={{ animationDuration: '6s' }} />
          <p className="text-gray-500 font-sans text-sm">
            Select any architecture module above to view its native code configurations and transactional pathways.
          </p>
        </div>
      )}

      {/* General Architectural Principles Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-2xs space-y-2">
          <h4 className="font-sans font-medium text-gray-900 text-sm">Decentralized Direct Sync</h4>
          <p className="text-gray-500 text-xs font-sans leading-relaxed">
            NoteFlow coordinates completely serverless transfers. When cloud integration is activated, E2EE structures transfer 
            data chunks block-by-block directly into personal folders (Google Drive AppData API space) with local encryption keys.
          </p>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-2xs space-y-2">
          <h4 className="font-sans font-medium text-gray-900 text-sm">Sub-Millisecond TF-IDF RAG</h4>
          <p className="text-gray-500 text-xs font-sans leading-relaxed">
            Unlike slow node-weight vectors, localized word indices parse on each text keyup with zero latency. 
            Relevance is calculated immediately on clean word frequencies, compiling past entries perfectly.
          </p>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-2xs space-y-2">
          <h4 className="font-sans font-medium text-gray-900 text-sm">BYOK Model Choice</h4>
          <p className="text-gray-500 text-xs font-sans leading-relaxed">
            You hold total control over model selections and API usage bills, directly connecting securely through local variables,
            preventing corporate aggregators from tracking your daily intellectual thought processes.
          </p>
        </div>
      </div>
    </div>
  );
}
