import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, CheckCircle2, XCircle, Github, Database, Code2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  
  // Settings State
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [leetcodeSession, setLeetcodeSession] = useState('');
  
  const [syncToNotion, setSyncToNotion] = useState(false);
  const [notionToken, setNotionToken] = useState('');
  const [notionDbId, setNotionDbId] = useState('');
  
  const [syncToGithub, setSyncToGithub] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState(''); // owner/repo

  // Dashboard State
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load settings on mount
  useEffect(() => {
    setLeetcodeUsername(localStorage.getItem('leetcodeUsername') || '');
    setLeetcodeSession(localStorage.getItem('leetcodeSession') || '');
    setSyncToNotion(localStorage.getItem('syncToNotion') === 'true');
    setNotionToken(localStorage.getItem('notionToken') || '');
    setNotionDbId(localStorage.getItem('notionDbId') || '');
    setSyncToGithub(localStorage.getItem('syncToGithub') === 'true');
    setGithubToken(localStorage.getItem('githubToken') || '');
    setGithubRepo(localStorage.getItem('githubRepo') || '');
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const saveSettings = () => {
    localStorage.setItem('leetcodeUsername', leetcodeUsername);
    localStorage.setItem('leetcodeSession', leetcodeSession);
    localStorage.setItem('syncToNotion', syncToNotion.toString());
    localStorage.setItem('notionToken', notionToken);
    localStorage.setItem('notionDbId', notionDbId);
    localStorage.setItem('syncToGithub', syncToGithub.toString());
    localStorage.setItem('githubToken', githubToken);
    localStorage.setItem('githubRepo', githubRepo);
    setActiveTab('dashboard');
  };

  const handleSync = async (mode: 'recent' | 'all' = 'recent') => {
    if (!leetcodeUsername) {
      setError("LeetCode Username is required in settings.");
      return;
    }
    if (mode === 'all' && !leetcodeSession) {
      setError("LeetCode Session Cookie is required in settings to sync all submissions.");
      return;
    }

    setIsSyncing(true);
    setError(null);
    setLogs([`[System] Starting Sync (${mode === 'all' ? 'All Submissions' : 'Recent Submissions'})...`]);

    try {
      const payload = {
        leetcodeUsername,
        leetcodeSession,
        notionToken,
        notionDbId,
        githubToken,
        githubRepo,
        syncToNotion,
        syncToGithub,
        syncMode: mode,
        forceUpdate
      };

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "An unknown error occurred");
      }
      if (data.logs) {
        setLogs(prev => [...prev, ...data.logs]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to trigger sync');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans tracking-tight pt-10 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">LeetCode Auto-Sync</h1>
              <p className="text-sm text-gray-500 font-medium">Sync solves to Notion & GitHub</p>
            </div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'settings' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Settings
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Manual Trigger
                  </h2>
                  <p className="text-gray-500 text-sm mt-1 max-w-lg">
                    Automatically checks for recent AC (Accepted) submissions on your LeetCode profile and pushes them to your configured platforms.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSync('recent')}
                      disabled={isSyncing}
                      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all shadow-sm
                        ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 hover:shadow-md'}`}
                    >
                      <Play className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync Recent'}
                    </button>
                    <button
                      onClick={() => handleSync('all')}
                      disabled={isSyncing}
                      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all shadow-sm
                        ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800 hover:shadow-md'}`}
                    >
                      <Database className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync All'}
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                    <input
                      type="checkbox"
                      checked={forceUpdate}
                      onChange={(e) => setForceUpdate(e.target.checked)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 w-4 h-4"
                    />
                    Force update existing entries
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">Sync Failed</h3>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              <div className="bg-[#1e1e1e] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[400px]">
                <div className="bg-[#2d2d2d] px-4 py-3 border-b border-[#3c3c3c] flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs font-mono text-gray-400 font-medium tracking-wider uppercase">Sync Logs</span>
                </div>
                <div className="p-4 flex-1 overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {logs.length === 0 ? (
                    <div className="text-gray-500 text-center mt-20">Click "Sync Now" to start</div>
                  ) : (
                    logs.map((log, i) => {
                      let color = 'text-gray-300';
                      if (log.includes('[System]')) color = 'text-blue-400';
                      if (log.includes('[LeetCode]')) color = 'text-orange-400';
                      if (log.includes('[Notion]')) color = 'text-gray-100';
                      if (log.includes('[GitHub]')) color = 'text-green-400';
                      if (log.includes('Failed') || log.includes('Error')) color = 'text-red-400';
                      if (log.includes('🎉') || log.includes('All caught up')) color = 'text-green-300';
                      
                      return <div key={i} className={`mb-1 ${color}`}>{log}</div>;
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pb-20"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-6">
                  <Code2 className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold">LeetCode Configuration</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username (Required)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none transition-shadow"
                      value={leetcodeUsername}
                      onChange={e => setLeetcodeUsername(e.target.value)}
                      placeholder="e.g. neetcode"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Cookie (Optional)</label>
                    <input
                      type="password"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none transition-shadow"
                      value={leetcodeSession}
                      onChange={e => setLeetcodeSession(e.target.value)}
                      placeholder="LEETCODE_SESSION value"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">Required only if your profile is completely private or to fetch code submissions.</p>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-2xl shadow-sm border transition-colors ${syncToNotion ? 'bg-white border-gray-200' : 'bg-gray-50/50 border-gray-100'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-black" />
                    <h2 className="text-lg font-semibold">Notion Integration</h2>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={syncToNotion} onChange={e => setSyncToNotion(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
                {syncToNotion && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 overflow-hidden">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Integration Token</label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:outline-none transition-shadow"
                        value={notionToken}
                        onChange={e => setNotionToken(e.target.value)}
                        placeholder="secret_..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Database ID</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:outline-none transition-shadow"
                        value={notionDbId}
                        onChange={e => setNotionDbId(e.target.value)}
                        placeholder="e.g. 1a2b3c4d..."
                      />
                      <p className="text-xs text-gray-500 mt-1.5 flex flex-col gap-2">
                        <span>Ensure your Notion database has all required properties, or update it below.</span>
                        <button
                           onClick={async () => {
                            try {
                                const res = await fetch('/api/setup-notion', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ notionToken, notionDbId })
                                });
                                const data = await res.json();
                                alert(data.message || data.error);
                            } catch (e: any) {
                                alert('Error: ' + e.message);
                            }
                          }}
                          className="bg-black hover:bg-gray-800 text-white transition-colors text-xs font-semibold px-3 py-1.5 rounded-lg w-fit mt-1"
                        >
                           Auto-Configure Missing Properties
                        </button>
                      </p>
                    </div>

                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4 text-gray-500" />
                        Required Notion Database Schema
                      </h4>
                      <p className="text-xs text-gray-500 mb-3">
                        The auto-configure button above will create any missing properties. For manual setup, ensure your database has these exact property names and types:
                      </p>
                      
                      <div className="space-y-4">
                         <div>
                           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Core Info</div>
                           <div className="flex flex-wrap gap-2 text-xs">
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Name</span><span className="px-2 py-1 text-gray-500">Title</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Problem Number</span><span className="px-2 py-1 text-gray-500">Text</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Difficulty</span><span className="px-2 py-1 text-gray-500">Select</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Status</span><span className="px-2 py-1 text-gray-500">Select</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Platform</span><span className="px-2 py-1 text-gray-500">Select</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Language</span><span className="px-2 py-1 text-gray-500">Select</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Mastery Level</span><span className="px-2 py-1 text-gray-500">Select</span></div>
                           </div>
                         </div>
                         
                         <div>
                           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Metadata & Tags</div>
                           <div className="flex flex-wrap gap-2 text-xs">
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Topics</span><span className="px-2 py-1 text-gray-500">Multi-select</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Tags</span><span className="px-2 py-1 text-gray-500">Multi-select</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Pattern</span><span className="px-2 py-1 text-gray-500">Multi-select</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Companies</span><span className="px-2 py-1 text-gray-500">Multi-select</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Time Complexity</span><span className="px-2 py-1 text-gray-500">Text</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Space Complexity</span><span className="px-2 py-1 text-gray-500">Text</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Approach</span><span className="px-2 py-1 text-gray-500">Text</span></div>
                           </div>
                         </div>
                         
                         <div>
                           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">URLs & Dates</div>
                           <div className="flex flex-wrap gap-2 text-xs">
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Date</span><span className="px-2 py-1 text-gray-500">Date</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Date Solved</span><span className="px-2 py-1 text-gray-500">Date</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Review Date</span><span className="px-2 py-1 text-gray-500">Date</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">URL</span><span className="px-2 py-1 text-gray-500">URL</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">LeetCode Link</span><span className="px-2 py-1 text-gray-500">URL</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">GitHub Link</span><span className="px-2 py-1 text-gray-500">URL</span></div>
                             <div className="flex bg-white border border-gray-200 rounded overflow-hidden"><span className="bg-gray-100 px-2 py-1 text-gray-600 font-medium">Submission ID</span><span className="px-2 py-1 text-gray-500">Text</span></div>
                           </div>
                         </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className={`p-6 rounded-2xl shadow-sm border transition-colors ${syncToGithub ? 'bg-white border-gray-200' : 'bg-gray-50/50 border-gray-100'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Github className="w-5 h-5 text-gray-900" />
                    <h2 className="text-lg font-semibold">GitHub Integration</h2>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={syncToGithub} onChange={e => setSyncToGithub(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                  </label>
                </div>
                {syncToGithub && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 overflow-hidden">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Personal Access Token (PAT)</label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:outline-none transition-shadow"
                        value={githubToken}
                        onChange={e => setGithubToken(e.target.value)}
                        placeholder="ghp_..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Repository Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:outline-none transition-shadow"
                        value={githubRepo}
                        onChange={e => setGithubRepo(e.target.value)}
                        placeholder="owner/repo"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={saveSettings}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-medium shadow-sm transition-all hover:shadow-md"
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
