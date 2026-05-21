import { useState, useEffect } from 'react';
import { BYOKService, AVAILABLE_MODELS } from '../lib/byok';
import { KeyConfig, AIProvider } from '../types';
import { Key, Shield, Eye, EyeOff, Check, Cpu, Info, RefreshCw, Zap, Server } from 'lucide-react';

interface SettingsViewProps {
  onKeysChanged: (newKeys: KeyConfig) => void;
  masterPassword: string;
  onMasterPasswordChanged: (pwd: string) => void;
}

export default function SettingsView({ onKeysChanged, masterPassword, onMasterPasswordChanged }: SettingsViewProps) {
  const [keys, setKeys] = useState<KeyConfig>(BYOKService.getKeys());
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<{ running: boolean; result?: string; success?: boolean }>({ running: false });
  const [mPwdInput, setMPwdInput] = useState(masterPassword);
  const [mPwdApplied, setMPwdApplied] = useState(!!masterPassword);

  const handleSave = (updatedKeys: KeyConfig) => {
    setKeys(updatedKeys);
    BYOKService.saveKeys(updatedKeys);
    onKeysChanged(updatedKeys);
  };

  const toggleShow = (field: string) => {
    setShowPwd(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleProviderChange = (provider: AIProvider) => {
    const models = AVAILABLE_MODELS[provider];
    const defaultModel = models && models.length > 0 ? models[0].id : '';
    const updated = {
      ...keys,
      activeProvider: provider,
      activeModel: defaultModel
    };
    handleSave(updated);
  };

  const handleModelChange = (modelId: string) => {
    const updated = {
      ...keys,
      activeModel: modelId
    };
    handleSave(updated);
  };

  const applyMasterPassword = () => {
    onMasterPasswordChanged(mPwdInput);
    setMPwdApplied(!!mPwdInput);
  };

  const clearMasterPassword = () => {
    setMPwdInput('');
    onMasterPasswordChanged('');
    setMPwdApplied(false);
  };

  // Test current configuration with a simple hello prompt
  const testCurrentKey = async () => {
    setTestStatus({ running: true });
    try {
      const result = await BYOKService.queryAI({
        prompt: 'Respond with exactly "Connection successful! NoteFlow integration is live." inside 1 sentence.',
        systemInstruction: 'Test client API connection'
      }, keys);

      if (result.success) {
        setTestStatus({
          running: false,
          success: true,
          result: `Latency: ${result.latencyMs}ms\nResponse: "${result.text.trim()}"`
        });
      } else {
        setTestStatus({
          running: false,
          success: false,
          result: `Connection Error:\n${result.error || 'Empty response or CORS blockage.'}`
        });
      }
    } catch (e: any) {
      setTestStatus({
        running: false,
        success: false,
        result: `Failed: ${e.message || 'Network exception.'}`
      });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4 md:p-6" id="settings-view-container">
      {/* Title Header */}
      <div className="space-y-2 border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-sans font-medium tracking-tight text-gray-900 flex items-center gap-3">
          <Key className="h-8 w-8 text-indigo-600" />
          Secure Workspace Settings
        </h1>
        <p className="text-gray-500 text-sm max-w-2xl font-sans leading-relaxed">
          Configure on-device encrypted api coordinates and local security boundaries. Credentials never 
          undergo server synchronization and reside purely inside sandboxed device cache.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API Key BYOK Core Setup (Left Col) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-2xs space-y-6">
            <h3 className="text-base font-sans font-medium text-gray-900 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-500" /> Bring Your Own Key (BYOK) Channels
            </h3>

            {/* Provider Grid Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
              {(['gemini', 'openai', 'anthropic', 'ollama'] as AIProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`py-2 px-3 rounded-lg text-xs font-sans font-medium transition-all text-center ${
                    keys.activeProvider === p
                      ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100/50'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                  id={`prov-sel-btn-${p}`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Inputs based on selection */}
            <div className="space-y-4 pt-2">
              {keys.activeProvider === 'gemini' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-sans font-medium text-gray-600 block">Google AI Studio API Key</label>
                  <div className="relative">
                    <input
                      type={showPwd.gemini ? 'text' : 'password'}
                      value={keys.geminiKey}
                      onChange={(e) => handleSave({ ...keys, geminiKey: e.target.value })}
                      placeholder="AIzaSy..."
                      className="w-full text-sm font-mono border border-gray-200 rounded-xl py-2.5 pl-3.5 pr-10 focus:outline-hidden focus:border-indigo-500 hover:border-gray-300 transition-colors"
                      id="gemini-key-input"
                    />
                    <button
                      onClick={() => toggleShow('gemini')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd.gemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 font-sans leading-normal">
                    Queries the official Google Generative Language endpoints directly from your browser.
                  </p>
                </div>
              )}

              {keys.activeProvider === 'openai' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-sans font-medium text-gray-600 block">OpenAI API Key</label>
                  <div className="relative">
                    <input
                      type={showPwd.openai ? 'text' : 'password'}
                      value={keys.openAIKey}
                      onChange={(e) => handleSave({ ...keys, openAIKey: e.target.value })}
                      placeholder="sk-proj-..."
                      className="w-full text-sm font-mono border border-gray-200 rounded-xl py-2.5 pl-3.5 pr-10 focus:outline-hidden focus:border-indigo-500 hover:border-gray-300 transition-colors"
                      id="openai-key-input"
                    />
                    <button
                      onClick={() => toggleShow('openai')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 font-sans leading-normal">
                    Fires native HTTPS fetches directly to OpenAI developers production API servers.
                  </p>
                </div>
              )}

              {keys.activeProvider === 'anthropic' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-sans font-medium text-gray-600 block">Anthropic Claude API Key</label>
                  <div className="relative">
                    <input
                      type={showPwd.anthropic ? 'text' : 'password'}
                      value={keys.anthropicKey}
                      onChange={(e) => handleSave({ ...keys, anthropicKey: e.target.value })}
                      placeholder="sk-ant-..."
                      className="w-full text-sm font-mono border border-gray-200 rounded-xl py-2.5 pl-3.5 pr-10 focus:outline-hidden focus:border-indigo-500 hover:border-gray-300 transition-colors"
                      id="anthropic-key-input"
                    />
                    <button
                      onClick={() => toggleShow('anthropic')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-600 font-sans leading-normal flex items-start gap-1">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Anthropic blocks browser AJAX calls naturally due to strict CORS rules. NoteFlow resolves this with a 
                      safe on-device proxy fallback wrapper, ensuring your actual keys are never exposed.
                    </span>
                  </p>
                </div>
              )}

              {keys.activeProvider === 'ollama' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-sans font-medium text-gray-600 block">Local Ollama Server URL</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={keys.ollamaUrl}
                      onChange={(e) => handleSave({ ...keys, ollamaUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="w-full text-sm font-mono border border-gray-200 rounded-xl py-2.5 pl-3.5 pr-3 focus:outline-hidden focus:border-indigo-500 hover:border-gray-300 transition-colors"
                      id="ollama-url-input"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 font-sans leading-normal">
                    Queries your local machine CPU directly. Zero requests pass over the outer web. Make sure Ollama daemon has been booted (e.g., run `ollama serve` or `ollama run llama3`).
                  </p>
                </div>
              )}
            </div>

            {/* Model Selector based on provider */}
            <div className="space-y-2 border-t border-gray-100 pt-5">
              <label className="text-xs font-sans font-medium text-gray-600 block">Active Model Strategy</label>
              <div className="grid grid-cols-1 gap-2.5">
                {AVAILABLE_MODELS[keys.activeProvider]?.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelChange(model.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      keys.activeModel === model.id
                        ? 'bg-indigo-50/40 border-indigo-400 text-indigo-950 shadow-2xs'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                    id={`model-select-${model.id}`}
                  >
                    <div className={`p-1.5 rounded-lg border mt-0.5 ${
                      keys.activeModel === model.id ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}>
                      <Cpu className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-sans font-medium flex items-center gap-1.5">
                        {model.name}
                        {keys.activeModel === model.id && <Check className="h-3 w-3 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-gray-500 font-sans leading-relaxed">{model.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Connect Tester Panel */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-sans font-semibold text-gray-900 flex items-center gap-1">
                  <Server className="h-3.5 w-3.5 text-indigo-600" /> Channel Tester
                </h4>
                <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                  Fire a lightweight test fetch loop to verify direct credentials locally.
                </p>
              </div>

              <button
                disabled={testStatus.running}
                onClick={testCurrentKey}
                className="text-xs px-3.5 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors text-gray-700 font-sans font-medium shrink-0 shadow-2xs cursor-pointer"
                id="test-key-btn"
              >
                {testStatus.running ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin text-indigo-600" /> Running...
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> Ping Channel
                  </>
                )}
              </button>
            </div>

            {testStatus.result && (
              <pre className={`font-mono text-[11px] p-3 rounded-xl border overflow-x-auto max-h-40 leading-relaxed ${
                testStatus.success ? 'bg-emerald-50/30 border-emerald-100 text-emerald-950' : 'bg-red-50/20 border-red-100 text-red-950'
              }`}>
                {testStatus.result}
              </pre>
            )}
          </div>
        </div>

        {/* Local Zero-Knowledge AES Lock Setup (Right Col) */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200/60 rounded-2xl p-6 shadow-2xs space-y-6">
            <h3 className="text-base font-sans font-medium text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" /> Local Zero-Knowledge Encrypt
            </h3>

            <p className="text-xs text-gray-500 font-sans leading-relaxed">
              Activate **AES-256-GCM** encryption for on-device databases. When enabled, your note files are encrypted 
              locally inside storage memory. Decrypted versions live solely inside dynamic runtime heap.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-sans font-medium text-gray-600 block">Master Password</label>
                <div className="relative">
                  <input
                    type={showPwd.master ? 'text' : 'password'}
                    value={mPwdInput}
                    disabled={mPwdApplied}
                    onChange={(e) => setMPwdInput(e.target.value)}
                    placeholder={mPwdApplied ? '••••••••••••••••' : 'A robust secret key...'}
                    className="w-full text-sm font-sans border border-gray-200 rounded-xl py-2 pl-3.5 pr-10 focus:outline-hidden focus:border-indigo-500 disabled:bg-gray-50"
                    id="master-password-input"
                  />
                  {!mPwdApplied && (
                    <button
                      onClick={() => toggleShow('master')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd.master ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>

              {!mPwdApplied ? (
                <button
                  type="button"
                  onClick={applyMasterPassword}
                  disabled={!mPwdInput}
                  className="w-full py-2 bg-indigo-600 text-white text-xs font-sans font-medium rounded-xl hover:bg-indigo-700 hover:shadow-sm transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 cursor-pointer text-center flex items-center justify-center gap-1.5"
                  id="enable-encryption-btn"
                >
                  <Shield className="h-4 w-4" /> Enable Local Encryption
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-xl p-3 flex items-start gap-2 text-emerald-950 font-sans text-xs">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Local AES Enabler Active</span>
                      <p className="text-[10px] text-emerald-700 leading-normal mt-0.5">
                        All newly saved files undergo on-device cryptographic locking. If you reload this session, password input is cleared for security.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearMasterPassword}
                    className="w-full py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-sans font-medium rounded-xl transition-all cursor-pointer text-center"
                    id="disable-encryption-btn"
                  >
                    Lock Session & Clear Password
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <h5 className="text-2xs font-mono text-gray-500 uppercase tracking-widest mb-1.5 font-bold">Security Guidelines</h5>
              <ul className="text-[10px] text-gray-400 font-sans space-y-1 list-disc pl-3.5 leading-normal">
                <li>Under zero-knowledge rules, forgotten keys make notes permanently unreadable.</li>
                <li>Your master password is never submitted to any remote servers.</li>
                <li>Ensure a copy is stored in a decentralized password safe.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
