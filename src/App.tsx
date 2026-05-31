import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, CheckCircle2, XCircle, Github, Database, Code2, AlertCircle,
  Eye, EyeOff, RefreshCw, Send, Terminal, Download, Copy, Trash2,
  HelpCircle, Check, Lock, CircleDot, AlertTriangle, Cpu,
  Calendar, CheckCircle, ChevronDown, X, Zap, BookOpen,
  Shield, ArrowRight, Bookmark, Clock, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BlurText from './components/BlurText';
import { GridScan } from './components/GridScan';
import { AnimatedThemeToggler } from "@/registry/magicui/animated-theme-toggler";

/* ─── Types ─── */
interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  isTyping?: boolean;
  options?: string[];
}

interface SolvedItem {
  title: string;
  time: string;
  status: 'synced' | 'failed';
}

/* ─── Motion Presets ─── */
const spring = { type: "spring" as const, stiffness: 280, damping: 28 };
const pageVariants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.97 },
};
const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const cardVariant = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: spring },
};

/* ─── Help Content ─── */
const helpGuides: Record<string, { title: string; steps: string[] }> = {
  'leetcode-session': {
    title: 'Finding your LeetCode Session Cookie',
    steps: [
      'Sign in to leetcode.com in your browser.',
      'Press F12 (or Cmd+Opt+I on Mac) to open Developer Tools.',
      'Navigate to Application → Cookies → leetcode.com.',
      'Find the cookie named LEETCODE_SESSION.',
      'Right-click the value and copy it.',
      'Paste it into the field below.',
    ],
  },
  'notion-token': {
    title: 'Creating a Notion Integration Token',
    steps: [
      'Open notion.so/my-integrations in a new tab.',
      'Click "+ New integration" and name it (e.g. "LeetCode Sync").',
      'Choose your workspace and grant Read/Write access.',
      'Copy the "Internal Integration Token" — it starts with secret_.',
      'Go to your target Notion database page.',
      'Click ••• → Connections → Add your new integration.',
    ],
  },
  'notion-db': {
    title: 'Finding your Notion Database ID',
    steps: [
      'Open your Notion database in a web browser.',
      'Look at the URL: notion.so/workspace/DATABASE_ID?v=...',
      'The Database ID is the 32-character hex string before "?v=".',
      'Copy that string and paste it here.',
    ],
  },
  'github-pat': {
    title: 'Creating a GitHub Access Token',
    steps: [
      'Go to github.com → Settings → Developer settings.',
      'Click Personal access tokens → Tokens (classic).',
      'Click "Generate new token (classic)".',
      'Give it a name and select the "repo" scope.',
      'Click "Generate token" and copy it immediately (starts with ghp_).',
      'Paste it into the field below.',
    ],
  },
};

/* ════════════════════════════════════════════════════════════════ */

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'assistant'>('dashboard');

  // Settings
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [leetcodeSession, setLeetcodeSession] = useState('');
  const [syncToNotion, setSyncToNotion] = useState(false);
  const [notionToken, setNotionToken] = useState('');
  const [notionDbId, setNotionDbId] = useState('');
  const [syncToGithub, setSyncToGithub] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');

  // Temp (assistant)
  const [tempLeetcodeUsername, setTempLeetcodeUsername] = useState('');
  const [tempLeetcodeSession, setTempLeetcodeSession] = useState('');
  const [tempSyncToNotion, setTempSyncToNotion] = useState(false);
  const [tempNotionToken, setTempNotionToken] = useState('');
  const [tempNotionDbId, setTempNotionDbId] = useState('');
  const [tempSyncToGithub, setTempSyncToGithub] = useState(false);
  const [tempGithubToken, setTempGithubToken] = useState('');
  const [tempGithubRepo, setTempGithubRepo] = useState('');

  // Dashboard
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [leetcodeStats, setLeetcodeStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [recentSolves, setRecentSolves] = useState<SolvedItem[]>([]);

  // Tests
  const [notionTest, setNotionTest] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [notionTestErr, setNotionTestErr] = useState('');
  const [githubTest, setGithubTest] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [githubTestErr, setGithubTestErr] = useState('');

  // UI
  const [showSession, setShowSession] = useState(false);
  const [showNToken, setShowNToken] = useState(false);
  const [showGToken, setShowGToken] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'system' | 'leetcode' | 'notion' | 'github' | 'error'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [notionAutoSetting, setNotionAutoSetting] = useState(false);
  const [helpModal, setHelpModal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Chat
  const [chatMsgs, setChatMsgs] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [step, setStep] = useState<
    'welcome' | 'ask_notion' | 'notion_token' | 'notion_db' | 'notion_verifying' | 'notion_retry' |
    'ask_github' | 'github_token' | 'github_repo' | 'github_verifying' | 'github_retry' |
    'ask_cookie' | 'leetcode_cookie' | 'completed'
  >('welcome');

  const logsEnd = useRef<HTMLDivElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  /* ─── Toast helper ─── */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  /* ─── Load settings ─── */
  useEffect(() => {
    const u = localStorage.getItem('leetcodeUsername') || '';
    const s = localStorage.getItem('leetcodeSession') || '';
    const sN = localStorage.getItem('syncToNotion') === 'true';
    const nT = localStorage.getItem('notionToken') || '';
    const nD = localStorage.getItem('notionDbId') || '';
    const sG = localStorage.getItem('syncToGithub') === 'true';
    const gT = localStorage.getItem('githubToken') || '';
    const gR = localStorage.getItem('githubRepo') || '';

    setLeetcodeUsername(u); setLeetcodeSession(s);
    setSyncToNotion(sN); setNotionToken(nT); setNotionDbId(nD);
    setSyncToGithub(sG); setGithubToken(gT); setGithubRepo(gR);

    const saved = localStorage.getItem('recentSolves');
    if (saved) { try { setRecentSolves(JSON.parse(saved)); } catch {} }

    if (u) { fetchStats(u); setActiveTab('dashboard'); }
    else setActiveTab('assistant');
  }, []);

  useEffect(() => { logsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs, showLogs]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  const fetchStats = async (un: string) => {
    if (!un) return;
    setIsLoadingStats(true);
    try {
      const r = await fetch(`/api/leetcode-profile/${un}`);
      setLeetcodeStats(r.ok ? await r.json() : null);
    } catch { setLeetcodeStats(null); }
    finally { setIsLoadingStats(false); }
  };

  const saveSettings = () => {
    localStorage.setItem('leetcodeUsername', leetcodeUsername);
    localStorage.setItem('leetcodeSession', leetcodeSession);
    localStorage.setItem('syncToNotion', syncToNotion.toString());
    localStorage.setItem('notionToken', notionToken);
    localStorage.setItem('notionDbId', notionDbId);
    localStorage.setItem('syncToGithub', syncToGithub.toString());
    localStorage.setItem('githubToken', githubToken);
    localStorage.setItem('githubRepo', githubRepo);
    fetchStats(leetcodeUsername);
    showToast('Settings saved successfully');
    setTimeout(() => setActiveTab('dashboard'), 600);
  };

  const clearAll = () => {
    if (!confirm('Clear all saved configurations?')) return;
    localStorage.clear();
    setLeetcodeUsername(''); setLeetcodeSession('');
    setSyncToNotion(false); setNotionToken(''); setNotionDbId('');
    setSyncToGithub(false); setGithubToken(''); setGithubRepo('');
    setLeetcodeStats(null); setRecentSolves([]);
    showToast('All settings cleared');
    setActiveTab('assistant');
  };

  /* ─── Connection Tests ─── */
  const testNotion = async () => {
    setNotionTest('testing'); setNotionTestErr('');
    try {
      const r = await fetch('/api/test-notion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notionToken, notionDbId }) });
      const d = await r.json();
      if (r.ok && d.success) { setNotionTest('success'); showToast('Notion connected!'); }
      else { setNotionTest('error'); setNotionTestErr(d.error || 'Authentication failed'); }
    } catch (e: any) { setNotionTest('error'); setNotionTestErr(e.message || 'Timeout'); }
  };

  const testGithub = async () => {
    setGithubTest('testing'); setGithubTestErr('');
    try {
      const r = await fetch('/api/test-github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ githubToken, githubRepo }) });
      const d = await r.json();
      if (r.ok && d.success) { setGithubTest('success'); showToast('GitHub connected!'); }
      else { setGithubTest('error'); setGithubTestErr(d.error || 'Auth failed'); }
    } catch (e: any) { setGithubTest('error'); setGithubTestErr(e.message || 'Timeout'); }
  };

  const autoNotion = async () => {
    setNotionAutoSetting(true);
    try {
      const r = await fetch('/api/setup-notion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notionToken, notionDbId }) });
      const d = await r.json();
      showToast(d.message || d.error);
    } catch (e: any) { showToast('Error: ' + e.message); }
    finally { setNotionAutoSetting(false); }
  };

  /* ─── Sync ─── */
  const updateSolves = (newLogs: string[]) => {
    const upd = [...recentSolves];
    newLogs.forEach(l => {
      if (l.includes('Successfully created') || l.includes('Successfully updated') || l.includes('Successfully pushed')) {
        let t = '';
        if (l.includes('[Notion] Successfully created')) t = l.split('[Notion] Successfully created ')[1] || '';
        else if (l.includes('[Notion] Successfully updated')) t = l.split('[Notion] Successfully updated ')[1] || '';
        else if (l.includes('[GitHub] Successfully pushed')) t = l.split('[GitHub] Successfully pushed ')[1] || '';
        t = t.trim();
        if (t && t !== 'Sync Complete! 🎉' && !upd.some(s => s.title.toLowerCase() === t.toLowerCase())) {
          upd.unshift({ title: t, time: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }), status: 'synced' });
        }
      }
    });
    const lim = upd.slice(0, 10);
    setRecentSolves(lim);
    localStorage.setItem('recentSolves', JSON.stringify(lim));
  };

  const handleSync = async (mode: 'recent' | 'all' = 'recent') => {
    if (!leetcodeUsername) { setError("Set your LeetCode username in Settings first."); return; }
    if (mode === 'all' && !leetcodeSession) { setError("Session cookie required for full sync."); return; }
    setIsSyncing(true); setError(null); setShowLogs(true);
    setLogs([`[System] Starting ${mode === 'all' ? 'Full' : 'Recent'} Sync…`]);
    try {
      const r = await fetch('/api/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leetcodeUsername, leetcodeSession, notionToken, notionDbId, githubToken, githubRepo, syncToNotion, syncToGithub, syncMode: mode, forceUpdate })
      });
      const d = await r.json();
      if (!r.ok) setError(d.error || "Sync failed");
      if (d.logs) { setLogs(p => [...p, ...d.logs]); updateSolves(d.logs); }
      fetchStats(leetcodeUsername);
      if (r.ok) showToast('Sync complete!');
    } catch (e: any) { setError(e.message || 'Sync failed'); }
    finally { setIsSyncing(false); }
  };

  /* ─── Chat Logic ─── */
  useEffect(() => {
    if (activeTab === 'assistant') {
      setChatMsgs([{ id: 'w', sender: 'bot', text: "Welcome! Let's set up your sync pipeline in under 2 minutes. What's your LeetCode username?" }]);
      setStep('welcome');
      setTempLeetcodeUsername(''); setTempLeetcodeSession('');
      setTempSyncToNotion(false); setTempNotionToken(''); setTempNotionDbId('');
      setTempSyncToGithub(false); setTempGithubToken(''); setTempGithubRepo('');
    }
  }, [activeTab]);

  const botMsg = (text: string, options?: string[], delay = 550) => {
    const id = Math.random().toString();
    setChatMsgs(p => [...p, { id, sender: 'bot', text: '', isTyping: true }]);
    setTimeout(() => setChatMsgs(p => p.map(m => m.id === id ? { id, sender: 'bot', text, options } : m)), delay);
  };

  const chatSubmit = async (text: string) => {
    if (!text.trim()) return;
    setChatMsgs(p => [...p, { id: Math.random().toString(), sender: 'user', text }]);
    setChatInput('');

    if (step === 'welcome') {
      const un = text.trim(); setTempLeetcodeUsername(un);
      botMsg(`Looking up "${un}"…`, undefined, 300);
      try {
        const r = await fetch(`/api/leetcode-profile/${un}`);
        if (r.ok) {
          const s = await r.json();
          const c = s.matchedUser?.submitStats?.acSubmissionNum?.find((x: any) => x.difficulty === 'All')?.count || 0;
          botMsg(`Found you — ${c} problems solved! Want to sync to Notion?`, ['Yes, set up Notion', 'Skip Notion'], 700);
        } else botMsg("Couldn't verify (maybe private), but we can continue. Sync to Notion?", ['Yes, set up Notion', 'Skip Notion'], 700);
      } catch { botMsg("Got it. Would you like to sync to Notion?", ['Yes, set up Notion', 'Skip Notion'], 700); }
      setStep('ask_notion');
    }
    else if (step === 'ask_notion') {
      if (text.toLowerCase().includes('yes') || text.toLowerCase().includes('set up')) {
        setTempSyncToNotion(true);
        botMsg("Enter your Notion Integration Token (starts with secret_):", undefined, 400);
        setStep('notion_token');
      } else {
        setTempSyncToNotion(false);
        botMsg("Skipped. Want to sync to GitHub?", ['Yes, set up GitHub', 'Skip GitHub'], 400);
        setStep('ask_github');
      }
    }
    else if (step === 'notion_token') { setTempNotionToken(text.trim()); botMsg("Now paste your Notion Database ID:", undefined, 400); setStep('notion_db'); }
    else if (step === 'notion_db') {
      const db = text.trim(); setTempNotionDbId(db);
      botMsg("Verifying Notion…", undefined, 300); setStep('notion_verifying');
      try {
        const r = await fetch('/api/test-notion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notionToken: tempNotionToken, notionDbId: db }) });
        const d = await r.json();
        if (r.ok && d.success) { botMsg("Notion connected! Want to add GitHub?", ['Yes, set up GitHub', 'Skip GitHub'], 700); setStep('ask_github'); }
        else { botMsg(`Connection failed: ${d.error || 'Invalid credentials'}`, ['Re-enter Notion details', 'Skip Notion'], 700); setStep('notion_retry'); }
      } catch (e: any) { botMsg(`Failed: ${e.message}`, ['Re-enter Notion details', 'Skip Notion'], 700); setStep('notion_retry'); }
    }
    else if (step === 'notion_retry') {
      if (text.toLowerCase().includes('re-enter')) { botMsg("Enter your Notion token:", undefined, 400); setStep('notion_token'); }
      else { setTempSyncToNotion(false); botMsg("Skipped. Want GitHub?", ['Yes, set up GitHub', 'Skip GitHub'], 400); setStep('ask_github'); }
    }
    else if (step === 'ask_github') {
      if (text.toLowerCase().includes('yes') || text.toLowerCase().includes('set up')) {
        setTempSyncToGithub(true); botMsg("Enter your GitHub PAT (starts with ghp_):", undefined, 400); setStep('github_token');
      } else {
        setTempSyncToGithub(false);
        botMsg("Almost done — add a LeetCode session cookie? (optional, needed for private profiles)", ['Enter cookie', 'Skip'], 400);
        setStep('ask_cookie');
      }
    }
    else if (step === 'github_token') { setTempGithubToken(text.trim()); botMsg("Repository name (owner/repo):", undefined, 400); setStep('github_repo'); }
    else if (step === 'github_repo') {
      const repo = text.trim(); setTempGithubRepo(repo);
      botMsg("Verifying GitHub…", undefined, 300); setStep('github_verifying');
      try {
        const r = await fetch('/api/test-github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ githubToken: tempGithubToken, githubRepo: repo }) });
        const d = await r.json();
        if (r.ok && d.success) { botMsg("GitHub connected! Add a session cookie?", ['Enter cookie', 'Skip'], 700); setStep('ask_cookie'); }
        else { botMsg(`Failed: ${d.error || 'Invalid'}`, ['Re-enter GitHub', 'Skip GitHub'], 700); setStep('github_retry'); }
      } catch (e: any) { botMsg(`Failed: ${e.message}`, ['Re-enter GitHub', 'Skip GitHub'], 700); setStep('github_retry'); }
    }
    else if (step === 'github_retry') {
      if (text.toLowerCase().includes('re-enter')) { botMsg("GitHub PAT:", undefined, 400); setStep('github_token'); }
      else { setTempSyncToGithub(false); botMsg("Add session cookie?", ['Enter cookie', 'Skip'], 400); setStep('ask_cookie'); }
    }
    else if (step === 'ask_cookie') {
      if (text.toLowerCase().includes('enter') || text.toLowerCase().includes('cookie')) { botMsg("Paste your LEETCODE_SESSION cookie:", undefined, 400); setStep('leetcode_cookie'); }
      else { setTempLeetcodeSession(''); finalize(''); }
    }
    else if (step === 'leetcode_cookie') { const c = text.trim(); setTempLeetcodeSession(c); finalize(c); }
    else if (step === 'completed' && text === 'Go to Dashboard') { setActiveTab('dashboard'); fetchStats(tempLeetcodeUsername); }
  };

  const finalize = (cookie: string) => {
    localStorage.setItem('leetcodeUsername', tempLeetcodeUsername);
    localStorage.setItem('leetcodeSession', cookie);
    localStorage.setItem('syncToNotion', tempSyncToNotion.toString());
    localStorage.setItem('notionToken', tempNotionToken);
    localStorage.setItem('notionDbId', tempNotionDbId);
    localStorage.setItem('syncToGithub', tempSyncToGithub.toString());
    localStorage.setItem('githubToken', tempGithubToken);
    localStorage.setItem('githubRepo', tempGithubRepo);
    setLeetcodeUsername(tempLeetcodeUsername); setLeetcodeSession(cookie);
    setSyncToNotion(tempSyncToNotion); setNotionToken(tempNotionToken); setNotionDbId(tempNotionDbId);
    setSyncToGithub(tempSyncToGithub); setGithubToken(tempGithubToken); setGithubRepo(tempGithubRepo);
    botMsg("All done! Your config is saved locally in your browser.", ['Go to Dashboard'], 600);
    setStep('completed');
  };

  const pct = () => {
    const m: Record<string, number> = { welcome: 5, ask_notion: 20, notion_token: 35, notion_db: 45, notion_verifying: 50, notion_retry: 45, ask_github: 60, github_token: 70, github_repo: 80, github_verifying: 85, github_retry: 80, ask_cookie: 90, leetcode_cookie: 95, completed: 100 };
    return m[step] || 0;
  };

  /* ─── Stat helpers ─── */
  const diff = (d: 'Easy' | 'Medium' | 'Hard') => {
    if (!leetcodeStats) return { solved: 0, total: 100, pct: 0 };
    const t = leetcodeStats.allQuestionsCount?.find((x: any) => x.difficulty === d);
    const s = leetcodeStats.matchedUser?.submitStats?.acSubmissionNum?.find((x: any) => x.difficulty === d);
    const solved = s ? s.count : 0, total = t ? t.count : 100;
    return { solved, total, pct: Math.min(100, Math.round((solved / total) * 100)) || 0 };
  };
  const easy = diff('Easy'), med = diff('Medium'), hard = diff('Hard');
  const allSolved = leetcodeStats?.matchedUser?.submitStats?.acSubmissionNum?.find((x: any) => x.difficulty === 'All')?.count || 0;
  const allTotal = leetcodeStats?.allQuestionsCount?.find((x: any) => x.difficulty === 'All')?.count || 100;

  const fLogs = logs.filter(l => {
    if (!l.toLowerCase().includes(logSearch.toLowerCase())) return false;
    if (logFilter === 'all') return true;
    if (logFilter === 'system') return l.includes('[System]');
    if (logFilter === 'leetcode') return l.includes('[LeetCode]');
    if (logFilter === 'notion') return l.includes('[Notion]');
    if (logFilter === 'github') return l.includes('[GitHub]');
    if (logFilter === 'error') return l.includes('Failed') || l.includes('Error');
    return false;
  });

  const copyLogs = () => { navigator.clipboard.writeText(logs.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000); showToast('Logs copied'); };
  const dlLogs = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([logs.join('\n')], { type: 'text/plain' })); a.download = `sync-${leetcodeUsername || 'log'}.txt`; a.click(); };

  /* ─── Reusable: Section Header ─── */
  const SectionIcon = ({ icon: Icon, color, glow }: { icon: any; color: string; glow?: string }) => (
    <div className="icon-box" style={{ background: color, boxShadow: glow || 'none' }}>
      <Icon className="w-5 h-5" style={{ color: 'inherit' }} />
    </div>
  );

  /* ─── Reusable: Help Button ─── */
  const HelpBtn = ({ guide }: { guide: string }) => (
    <button onClick={() => setHelpModal(guide)} className="help-link">
      <HelpCircle className="w-3.5 h-3.5" />
      How to find this?
    </button>
  );

  /* ─── Reusable: Settings Field ─── */
  const SecretField = ({ label, value, onChange, show, onToggle, placeholder, helpKey }: {
    label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string; helpKey?: string;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{label}</label>
        <div className="flex items-center gap-3">
          {helpKey && <HelpBtn guide={helpKey} />}
          <button onClick={onToggle} className="opacity-40 hover:opacity-80 transition-opacity">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <input type={show ? 'text' : 'password'} className="input font-mono" style={{ fontSize: '0.85rem' }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className="min-h-screen antialiased transition-colors duration-500" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-1)', fontFamily: 'var(--font-sans)' }}>
      {/* Ambient Orbs */}
      <div className="ambient-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={spring}
            className="toast"
          >
            <CheckCircle className="w-4 h-4 text-green-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Help Modal ── */}
      <AnimatePresence>
        {helpModal && helpGuides[helpModal] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6" onClick={() => setHelpModal(null)}>
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 24 }}
              transition={spring}
              className="relative w-full max-w-md glass-solid z-10"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setHelpModal(null)} className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                <X className="w-4 h-4 text-white/50" />
              </button>
              <div className="flex items-center gap-3.5 mb-7">
                <h3 className="text-xl font-bold tracking-tight leading-snug">{helpGuides[helpModal].title}</h3>
              </div>
              <ol className="space-y-4">
                {helpGuides[helpModal].steps.map((s, i) => (
                  <li key={i} className="flex gap-3.5 items-start">
                    <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(10,132,255,0.1)', color: 'var(--accent-blue)' }}>{i + 1}</span>
                    <span className="text-[0.92rem] leading-relaxed pt-0.5" style={{ color: 'var(--text-2)' }}>{s}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-7 pt-5 border-t border-white/5">
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  <Shield className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                  All credentials are stored locally in your browser. Nothing is sent to any server except LeetCode, GitHub, and Notion APIs.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showLanding ? (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => {
              setShowLanding(false);
            }}
            className="fixed inset-0 z-[80] bg-black w-screen h-screen overflow-hidden flex flex-col justify-center items-center text-white select-none cursor-pointer"
          >
            {/* WebGL Scanner Background */}
            <GridScan 
              linesColor="#2f293a" 
              scanColor="#ff9ffc" 
              scanOpacity={0.28} 
              gridScale={0.12} 
              lineThickness={1.25}
              bloomIntensity={1.3}
              noiseIntensity={0.015}
              scanDuration={2.6}
              scanDelay={1.5}
              className="absolute inset-0 w-full h-full"
            />

            {/* Center title only */}
            <div className="z-10 flex flex-col items-center">
              <BlurText 
                text="AERGIA" 
                delay={120} 
                className="text-[4.5rem] sm:text-[7.5rem] font-extrabold font-orbitron tracking-[0.35em] mr-[-0.35em] leading-none text-white select-none text-center"
                animateBy="letters"
                direction="top"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="app-core"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* ════════ Header ════════ */}
            <header className="sticky top-0 z-50 w-full glass-nav">
              <div className="max-w-[1120px] mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center">
                  <h1 className="font-orbitron font-extrabold text-[1.25rem] tracking-[0.25em] text-[#FF9FFC] select-none leading-none pt-0.5">
                    AERGIA
                  </h1>
                </div>

                <div className="flex items-center gap-4.5">
                  <div className="seg-control">
                    {(['dashboard', 'settings', 'assistant'] as const).map(t => (
                      <button key={t} onClick={() => setActiveTab(t)} className={`seg-btn ${activeTab === t ? 'active' : ''}`}>
                        {t === 'dashboard' ? 'Dashboard' : t === 'settings' ? 'Settings' : 'Setup'}
                        {t === 'assistant' && !leetcodeUsername && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-ping" />}
                      </button>
                    ))}
                  </div>
                  <AnimatedThemeToggler />
                </div>
              </div>
            </header>

            {/* ════════ Main ════════ */}
            <main className="max-w-[1120px] mx-auto px-5 pt-10 pb-28">
              <AnimatePresence mode="wait">

                {/* ═══ DASHBOARD ═══ */}
                {activeTab === 'dashboard' && (
                  <motion.div key="dash" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ ...spring, duration: 0.4 }}>
                    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-7">

                      {/* Dashboard Header */}
                      <motion.div variants={cardVariant} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                        <div>
                          <h2 className="text-3xl font-extrabold tracking-tight">Console</h2>
                          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Monitor and trigger your sync pipeline</p>
                        </div>
                        {leetcodeUsername && (
                          <div className="flex items-center gap-2.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/5 border border-white/5 shadow-sm animate-fade-in" style={{ color: 'var(--text-2)' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span>LeetCode: @{leetcodeUsername}</span>
                          </div>
                        )}
                      </motion.div>

                      {/* Pipeline */}
                      <motion.div variants={cardVariant} className="glass relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--text-3)' }}>Pipeline</p>
                            <h3 className="text-xl font-bold tracking-tight">Sync Flow</h3>
                          </div>
                          <div className={`badge ${isSyncing ? 'badge-active' : 'badge-idle'}`}>
                            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-white/15'}`} />
                            {isSyncing ? 'Syncing…' : 'Idle'}
                          </div>
                        </div>

                        {/* Responsive Branching Canvas */}
                        <div className="relative w-full h-[240px] select-none mt-2">
                          {/* SVG Connection Tracks */}
                          <svg className="conn-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--accent-orange)" />
                                <stop offset="50%" stopColor="var(--accent-blue)" />
                                <stop offset="100%" stopColor="var(--accent-green)" />
                              </linearGradient>
                            </defs>

                            {/* Track: LeetCode -> Aergia Core */}
                            <path 
                              d="M 16 50 L 50 50" 
                              className={`track-path ${leetcodeUsername ? (isSyncing ? 'syncing' : 'active') : 'inactive'}`} 
                              strokeWidth={isSyncing ? 3 : 2}
                            />
                            {isSyncing && leetcodeUsername && (
                              <path d="M 16 50 L 50 50" className="flow-path" strokeWidth={3} />
                            )}

                            {/* Track: Aergia Core -> GitHub */}
                            <path 
                              d="M 50 50 C 67 50, 67 25, 84 25" 
                              className={`track-path ${syncToGithub && githubRepo ? (isSyncing ? 'syncing' : 'active') : 'inactive'}`} 
                              strokeWidth={isSyncing && syncToGithub && githubRepo ? 3 : 2}
                            />
                            {isSyncing && syncToGithub && githubRepo && (
                              <path d="M 50 50 C 67 50, 67 25, 84 25" className="flow-path flow-path-github" strokeWidth={3} />
                            )}

                            {/* Track: Aergia Core -> Notion */}
                            <path 
                              d="M 50 50 C 67 50, 67 75, 84 75" 
                              className={`track-path ${syncToNotion && notionDbId ? (isSyncing ? 'syncing' : 'active') : 'inactive'}`} 
                              strokeWidth={isSyncing && syncToNotion && notionDbId ? 3 : 2}
                            />
                            {isSyncing && syncToNotion && notionDbId && (
                              <path d="M 50 50 C 67 50, 67 75, 84 75" className="flow-path flow-path-notion" strokeWidth={3} />
                            )}

                            {/* Glowing Data Packets */}
                            {isSyncing && leetcodeUsername && (
                              <path 
                                d="M 16 50 L 50 50" 
                                className="svg-packet packet-lc-engine" 
                                strokeWidth={6}
                              />
                            )}
                            {isSyncing && syncToGithub && githubRepo && (
                              <path 
                                d="M 50 50 C 67 50, 67 25, 84 25" 
                                className="svg-packet packet-engine-gh" 
                                strokeWidth={6}
                              />
                            )}
                            {isSyncing && syncToNotion && notionDbId && (
                              <path 
                                d="M 50 50 C 67 50, 67 75, 84 75" 
                                className="svg-packet packet-engine-notion" 
                                strokeWidth={6}
                              />
                            )}
                          </svg>

                          {/* Node: LeetCode */}
                          <div 
                            className={`pipe-card w-[100px] md:w-[155px] flex-col md:flex-row left-[16%] top-1/2 ${!leetcodeUsername ? 'inactive' : ''}`}
                            title={leetcodeUsername ? `LeetCode Account: @${leetcodeUsername}` : 'LeetCode not configured'}
                          >
                            <span className={`led-dot ${leetcodeUsername ? (isSyncing ? 'led-syncing' : 'led-active') : 'led-inactive'}`} />
                            <div className="icon-box w-8 h-8 md:w-9 md:h-9" style={{ background: leetcodeUsername ? 'rgba(255,159,10,0.08)' : 'var(--bg-inactive)', color: leetcodeUsername ? '#FF9F0A' : 'var(--color-inactive)', borderRadius: '10px' }}>
                              <Code2 className="w-4.5 h-4.5 md:w-5 md:h-5" />
                            </div>
                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                              <span className="text-[0.7rem] md:text-xs font-bold leading-tight">LeetCode</span>
                              <span className="text-[0.62rem] md:text-[0.68rem] font-medium max-w-[80px] truncate" style={{ color: 'var(--text-3)' }}>
                                {leetcodeUsername ? `@${leetcodeUsername}` : 'Not set'}
                              </span>
                            </div>
                          </div>

                          {/* Node: Aergia Core */}
                          <div 
                            className={`pipe-card pipe-card-core w-[110px] md:w-[165px] flex-col md:flex-row left-[50%] top-1/2 ${leetcodeUsername ? 'active' : 'inactive'} ${isSyncing ? 'syncing' : ''}`}
                            title={isSyncing ? 'Processing Data Pipeline' : 'Aergia Engine Ready'}
                          >
                            <span className={`led-dot ${leetcodeUsername ? (isSyncing ? 'led-syncing animate-ping' : 'led-active') : 'led-inactive'}`} />
                            <div className={`icon-box w-9 h-9 md:w-10 md:h-10 ${isSyncing ? 'animate-pulse' : ''}`} style={{ background: leetcodeUsername ? 'rgba(10,132,255,0.08)' : 'var(--bg-inactive)', color: leetcodeUsername ? '#0A84FF' : 'var(--color-inactive)', borderRadius: '12px' }}>
                              <Cpu className={`w-5 h-5 md:w-5.5 md:h-5.5 ${isSyncing ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                            </div>
                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                              <span className="text-[0.75rem] md:text-sm font-black tracking-tight leading-tight">AERGIA CORE</span>
                              <span className="text-[0.62rem] md:text-[0.68rem] font-medium" style={{ color: 'var(--text-3)' }}>
                                {isSyncing ? 'Syncing...' : (leetcodeUsername ? 'Engine Ready' : 'Standby')}
                              </span>
                            </div>
                          </div>

                          {/* Node: GitHub */}
                          <div 
                            className={`pipe-card w-[100px] md:w-[155px] flex-col md:flex-row left-[84%] top-[25%] ${!(syncToGithub && githubRepo) ? 'inactive' : ''}`}
                            title={syncToGithub && githubRepo ? `GitHub Repository: ${githubRepo}` : 'GitHub Sync disabled'}
                          >
                            <span className={`led-dot ${syncToGithub && githubRepo ? (isSyncing ? 'led-syncing' : 'led-active') : 'led-inactive'}`} />
                            <div className="icon-box w-8 h-8 md:w-9 md:h-9" style={{ background: syncToGithub && githubRepo ? 'rgba(48,209,88,0.08)' : 'var(--bg-inactive)', color: syncToGithub && githubRepo ? '#30D158' : 'var(--color-inactive)', borderRadius: '10px' }}>
                              <Github className="w-4.5 h-4.5 md:w-5 md:h-5" />
                            </div>
                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                              <span className="text-[0.7rem] md:text-xs font-bold leading-tight">GitHub</span>
                              <span className="text-[0.62rem] md:text-[0.68rem] font-medium max-w-[80px] truncate" style={{ color: 'var(--text-3)' }}>
                                {syncToGithub && githubRepo ? githubRepo.split('/')[1] : 'Disabled'}
                              </span>
                            </div>
                          </div>

                          {/* Node: Notion */}
                          <div 
                            className={`pipe-card w-[100px] md:w-[155px] flex-col md:flex-row left-[84%] top-[75%] ${!(syncToNotion && notionDbId) ? 'inactive' : ''}`}
                            title={syncToNotion && notionDbId ? 'Notion database connected' : 'Notion Sync disabled'}
                          >
                            <span className={`led-dot ${syncToNotion && notionDbId ? (isSyncing ? 'led-syncing' : 'led-active') : 'led-inactive'}`} />
                            <div className="icon-box w-8 h-8 md:w-9 md:h-9" style={{ background: syncToNotion && notionDbId ? 'rgba(94,92,230,0.08)' : 'var(--bg-inactive)', color: syncToNotion && notionDbId ? '#5E5CE6' : 'var(--color-inactive)', borderRadius: '10px' }}>
                              <Database className="w-4.5 h-4.5 md:w-5 md:h-5" />
                            </div>
                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                              <span className="text-[0.7rem] md:text-xs font-bold leading-tight">Notion</span>
                              <span className="text-[0.62rem] md:text-[0.68rem] font-medium max-w-[80px] truncate" style={{ color: 'var(--text-3)' }}>
                                {syncToNotion && notionDbId ? 'Connected' : 'Disabled'}
                              </span>
                            </div>
                          </div>

                        </div>
                      </motion.div>

                      {/* Cards Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
                        
                        {/* Left Column - Sync Control & Activity */}
                        <div className="lg:col-span-2 space-y-7">
                          {/* Sync Control */}
                          <motion.div variants={cardVariant} className="glass flex flex-col justify-between">
                            <div>
                              <h3 className="text-xl font-bold tracking-tight mb-1">Trigger Sync</h3>
                              <p className="text-[0.95rem] leading-relaxed" style={{ color: 'var(--text-2)' }}>Pull solved problems and push to connected destinations.</p>
                            </div>
                            {error && (
                              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3.5 rounded-2xl text-sm flex items-start gap-2.5" style={{ background: 'rgba(255,69,58,0.07)', border: '1px solid rgba(255,69,58,0.12)', color: 'var(--accent-red)' }}>
                                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" /><span>{error}</span>
                              </motion.div>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 mt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                              <label className="toggle">
                                <input type="checkbox" checked={forceUpdate} onChange={e => setForceUpdate(e.target.checked)} />
                                <span className="toggle-track" />
                                <span className="text-sm ml-3 font-medium" style={{ color: 'var(--text-2)' }}>Force overwrite</span>
                              </label>
                              <div className="flex gap-2.5">
                                <button onClick={() => handleSync('recent')} disabled={isSyncing || !leetcodeUsername} className="btn btn-primary">
                                  {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                  {isSyncing ? 'Syncing…' : 'Sync Recent'}
                                </button>
                                <button onClick={() => handleSync('all')} disabled={isSyncing || !leetcodeUsername || !leetcodeSession} className="btn btn-ghost">
                                  <Database className="w-4 h-4" /> Sync All
                                </button>
                              </div>
                            </div>
                          </motion.div>

                          {/* Activity */}
                          <motion.div variants={cardVariant} className="glass flex flex-col justify-between">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="icon-box" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)' }}><Clock className="w-5 h-5" /></div>
                              <div><h3 className="text-lg font-bold tracking-tight">Activity</h3><p className="text-xs" style={{ color: 'var(--text-3)' }}>Recent syncs</p></div>
                            </div>
                            <div className="min-h-[140px] max-h-[220px] overflow-y-auto space-y-0.5 px-1">
                              {recentSolves.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                                  <Bookmark className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.06)' }} />
                                  <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>No activity yet</p>
                                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Run a sync to populate</p>
                                </div>
                              ) : recentSolves.map((s, i) => (
                                <div key={i} className="flex items-center justify-between py-2.5 px-2.5 rounded-xl hover:bg-white/[0.03] transition-colors border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                                  <div className="min-w-0 mr-2"><p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{s.title}</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.time}</p></div>
                                  <span className="badge badge-success text-xs shrink-0">Synced</span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-2.5 mt-1 text-center text-xs font-medium" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-3)' }}>{recentSolves.length} recorded</div>
                          </motion.div>
                        </div>

                        {/* Right Column - Stats & Connections */}
                        <div className="space-y-7">
                          {/* Stats */}
                          <motion.div variants={cardVariant} className="glass flex flex-col justify-between">
                            <div>
                              <h3 className="text-xl font-bold tracking-tight mb-0.5">Progress</h3>
                              <p className="text-sm" style={{ color: 'var(--text-3)' }}>LeetCode statistics</p>
                            </div>
                            {isLoadingStats ? (
                              <div className="py-8 flex flex-col items-center gap-2"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--text-3)' }} /><span className="text-sm" style={{ color: 'var(--text-3)' }}>Loading…</span></div>
                            ) : leetcodeStats ? (
                              <div className="space-y-4 mt-4">
                                <div className="flex justify-between items-baseline">
                                  <span className="text-5xl font-extrabold tracking-tighter">{allSolved}</span>
                                  <span className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>/ {allTotal}</span>
                                </div>
                                <div className="space-y-3">
                                  {[{ l: 'Easy', s: easy, c: 'text-green-400', b: 'bar-easy' }, { l: 'Medium', s: med, c: 'text-orange-400', b: 'bar-medium' }, { l: 'Hard', s: hard, c: 'text-red-400', b: 'bar-hard' }].map(d => (
                                    <div key={d.l} className="space-y-1.5">
                                      <div className="flex justify-between items-center">
                                        <span className={`text-sm font-semibold ${d.c}`}>{d.l}</span>
                                        <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--text-2)' }}>{d.s.solved}/{d.s.total}</span>
                                      </div>
                                      <div className="bar-track"><div className={`bar-fill ${d.b}`} style={{ width: `${d.s.pct}%` }} /></div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="py-8 flex flex-col items-center gap-2 text-center"><AlertTriangle className="w-5 h-5" style={{ color: 'var(--text-3)' }} /><p className="text-sm" style={{ color: 'var(--text-3)' }}>Configure in Settings</p></div>
                            )}
                            <div className="pt-3 mt-3 text-center text-xs font-medium" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-3)' }}>{leetcodeUsername || 'No profile'}</div>
                          </motion.div>

                          {/* Destinations */}
                          <motion.div variants={cardVariant} className="glass space-y-4">
                            <div>
                              <h3 className="text-xl font-bold tracking-tight">Destinations</h3>
                              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Connected channels</p>
                            </div>
                            <div className="space-y-3.5">
                              {/* GitHub connection */}
                              <div className="flex items-center justify-between p-3 rounded-2xl" style={{ background: 'var(--bg-hover)', border: 'var(--border-neumorphic)' }}>
                                <div className="flex items-center gap-3">
                                  <div className="icon-box" style={{ background: 'rgba(48,209,88,0.08)', color: '#30D158', width: '32px', height: '32px' }}><Github className="w-4 h-4" /></div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold">GitHub</p>
                                    <p className="text-xs font-mono truncate max-w-[120px]" style={{ color: 'var(--text-3)' }}>{githubRepo || 'Not set'}</p>
                                  </div>
                                </div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${syncToGithub && githubRepo ? 'text-green-400 bg-green-400/5 border border-green-400/10' : 'text-white/20 bg-white/5 border border-white/5'}`}>
                                  {syncToGithub && githubRepo ? 'Active' : 'Off'}
                                </span>
                              </div>

                              {/* Notion connection */}
                              <div className="flex items-center justify-between p-3 rounded-2xl" style={{ background: 'var(--bg-hover)', border: 'var(--border-neumorphic)' }}>
                                <div className="flex items-center gap-3">
                                  <div className="icon-box" style={{ background: 'rgba(94,92,230,0.08)', color: '#5E5CE6', width: '32px', height: '32px' }}><Database className="w-4 h-4" /></div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold">Notion</p>
                                    <p className="text-xs font-mono truncate max-w-[120px]" style={{ color: 'var(--text-3)' }}>{notionDbId ? notionDbId.slice(0, 8) + '…' : 'Not set'}</p>
                                  </div>
                                </div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${syncToNotion && notionDbId ? 'text-indigo-400 bg-indigo-400/5 border border-indigo-400/10' : 'text-white/20 bg-white/5 border border-white/5'}`}>
                                  {syncToNotion && notionDbId ? 'Active' : 'Off'}
                                </span>
                              </div>
                            </div>
                            <div className="pt-2.5 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                              <button onClick={() => setActiveTab('settings')} className="btn btn-ghost w-full py-2.5 text-xs">Configure Destinations</button>
                            </div>
                          </motion.div>
                        </div>
                      </div>

                      {/* Logs */}
                      <motion.div variants={cardVariant} className="glass">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="icon-box" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-3)' }}><Terminal className="w-5 h-5" /></div>
                            <div><h3 className="text-lg font-bold tracking-tight">Logs</h3><p className="text-xs" style={{ color: 'var(--text-3)' }}>Diagnostic output</p></div>
                          </div>
                          <button onClick={() => setShowLogs(!showLogs)} className="btn btn-ghost py-2 px-4 text-sm">
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showLogs ? 'rotate-180' : ''}`} />
                            {showLogs ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <AnimatePresence>
                          {showLogs && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
                              <div className="mt-5 pt-5 space-y-3.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                  <div className="flex flex-wrap gap-1">
                                    {(['all', 'system', 'leetcode', 'notion', 'github', 'error'] as const).map(f => (
                                      <button key={f} onClick={() => setLogFilter(f)} className={`filter-pill ${logFilter === f ? 'on' : 'off'}`}>{f}</button>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <input type="text" value={logSearch} onChange={e => setLogSearch(e.target.value)} placeholder="Filter…" className="input py-1.5 px-3 text-xs w-36" style={{ fontSize: '0.8rem' }} />
                                    <button onClick={copyLogs} disabled={!logs.length} className="btn btn-ghost py-1.5 px-2.5 text-xs">{copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}</button>
                                    <button onClick={dlLogs} disabled={!logs.length} className="btn btn-ghost py-1.5 px-2.5 text-xs"><Download className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setLogs([])} disabled={!logs.length} className="btn btn-danger py-1.5 px-2.5 text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                                <div className="code-panel h-56 overflow-y-auto select-text">
                                  {fLogs.length === 0 ? (
                                    <div className="text-center py-16 text-sm" style={{ color: 'var(--text-3)' }}>{logs.length === 0 ? 'No logs. Run a sync.' : 'No matches.'}</div>
                                  ) : fLogs.map((l, i) => {
                                    let c = 'opacity-40';
                                    if (l.includes('[System]')) c = 'text-blue-400/90'; if (l.includes('[LeetCode]')) c = 'text-amber-400/80';
                                    if (l.includes('[Notion]')) c = 'text-indigo-300/80'; if (l.includes('[GitHub]')) c = 'text-green-400/80';
                                    if (l.includes('Failed') || l.includes('Error')) c = 'text-red-400'; if (l.includes('🎉')) c = 'text-green-300 font-semibold';
                                    return <div key={i} className={`mb-1 last:mb-0 ${c}`}>{l}</div>;
                                  })}
                                  <div ref={logsEnd} />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>

                    </motion.div>
                  </motion.div>
                )}

                {/* ═══ SETTINGS ═══ */}
                {activeTab === 'settings' && (
                  <motion.div key="set" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ ...spring, duration: 0.4 }}>
                    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-7 max-w-2xl mx-auto pb-10">
                      <motion.div variants={cardVariant} className="space-y-2">
                        <h2 className="text-[2.5rem] font-extrabold tracking-tight">Settings</h2>
                        <p className="text-lg font-medium" style={{ color: 'var(--text-2)' }}>Manage credentials and sync preferences.</p>
                      </motion.div>

                      {/* Security Banner */}
                      <motion.div variants={cardVariant} className="glass-subtle flex items-center gap-3 px-5 py-3.5">
                        <Shield className="w-5 h-5 text-green-400 shrink-0" />
                        <p className="text-sm" style={{ color: 'var(--text-2)' }}>All credentials are stored <strong>only in your browser's local storage</strong>. Nothing is sent to external servers except the respective APIs.</p>
                      </motion.div>

                      {/* LeetCode */}
                      <motion.div variants={cardVariant} className="glass space-y-5">
                        <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div className="icon-box" style={{ background: 'rgba(255,159,10,0.08)', color: '#FF9F0A' }}><Code2 className="w-5 h-5" /></div>
                          <h3 className="text-lg font-bold tracking-tight">LeetCode</h3>
                        </div>
                        <div><label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Username</label><input type="text" className="input" value={leetcodeUsername} onChange={e => setLeetcodeUsername(e.target.value)} placeholder="e.g. IshanG2111" /></div>
                        <SecretField label="Session Cookie" value={leetcodeSession} onChange={setLeetcodeSession} show={showSession} onToggle={() => setShowSession(!showSession)} placeholder="Paste LEETCODE_SESSION…" helpKey="leetcode-session" />
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>Optional — needed for historical submissions and private profiles.</p>
                      </motion.div>

                      {/* Notion */}
                      <motion.div variants={cardVariant} className="glass space-y-5">
                        <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div className="flex items-center gap-3">
                            <div className="icon-box" style={{ background: 'rgba(94,92,230,0.08)', color: '#5E5CE6' }}><Database className="w-5 h-5" /></div>
                            <h3 className="text-lg font-bold tracking-tight">Notion</h3>
                          </div>
                          <label className="toggle"><input type="checkbox" checked={syncToNotion} onChange={e => setSyncToNotion(e.target.checked)} /><span className="toggle-track" /></label>
                        </div>
                        <AnimatePresence>
                          {syncToNotion && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="space-y-5 overflow-hidden">
                              <SecretField label="Integration Token" value={notionToken} onChange={setNotionToken} show={showNToken} onToggle={() => setShowNToken(!showNToken)} placeholder="secret_…" helpKey="notion-token" />
                              <div>
                                <div className="flex items-center justify-between mb-2"><label className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Database ID</label><HelpBtn guide="notion-db" /></div>
                                <input type="text" className="input font-mono" style={{ fontSize: '0.85rem' }} value={notionDbId} onChange={e => setNotionDbId(e.target.value)} placeholder="32-char string from database URL" />
                              </div>
                              <div className="flex gap-2.5 pt-1">
                                <button onClick={testNotion} disabled={notionTest === 'testing'} className="btn btn-tint flex-1 py-2.5 text-sm">{notionTest === 'testing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}Verify</button>
                                <button onClick={autoNotion} disabled={notionAutoSetting} className="btn btn-ghost flex-1 py-2.5 text-sm">{notionAutoSetting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}Setup Schema</button>
                              </div>
                              {notionTest === 'success' && <div className="p-3.5 rounded-2xl text-sm flex items-center gap-2" style={{ background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.12)', color: 'var(--accent-green)' }}><CheckCircle2 className="w-4 h-4" />Connected!</div>}
                              {notionTest === 'error' && <div className="p-3.5 rounded-2xl text-sm flex items-center gap-2" style={{ background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.12)', color: 'var(--accent-red)' }}><XCircle className="w-4 h-4" />{notionTestErr}</div>}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* GitHub */}
                      <motion.div variants={cardVariant} className="glass space-y-5">
                        <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div className="flex items-center gap-3">
                            <div className="icon-box" style={{ background: 'rgba(48,209,88,0.08)', color: '#30D158' }}><Github className="w-5 h-5" /></div>
                            <h3 className="text-lg font-bold tracking-tight">GitHub</h3>
                          </div>
                          <label className="toggle"><input type="checkbox" checked={syncToGithub} onChange={e => setSyncToGithub(e.target.checked)} /><span className="toggle-track" /></label>
                        </div>
                        <AnimatePresence>
                          {syncToGithub && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="space-y-5 overflow-hidden">
                              <SecretField label="Personal Access Token" value={githubToken} onChange={setGithubToken} show={showGToken} onToggle={() => setShowGToken(!showGToken)} placeholder="ghp_…" helpKey="github-pat" />
                              <div><label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Repository (owner/repo)</label><input type="text" className="input font-mono" style={{ fontSize: '0.85rem' }} value={githubRepo} onChange={e => setGithubRepo(e.target.value)} placeholder="e.g. IshanG2111/leetcode-sync" /></div>
                              <button onClick={testGithub} disabled={githubTest === 'testing'} className="btn btn-tint w-full py-2.5 text-sm">{githubTest === 'testing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}Verify Connection</button>
                              {githubTest === 'success' && <div className="p-3.5 rounded-2xl text-sm flex items-center gap-2" style={{ background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.12)', color: 'var(--accent-green)' }}><CheckCircle2 className="w-4 h-4" />Connected!</div>}
                              {githubTest === 'error' && <div className="p-3.5 rounded-2xl text-sm flex items-center gap-2" style={{ background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.12)', color: 'var(--accent-red)' }}><XCircle className="w-4 h-4" />{githubTestErr}</div>}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Actions */}
                      <motion.div variants={cardVariant} className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <button onClick={clearAll} className="btn btn-danger w-full sm:w-auto px-5">Clear All</button>
                        <button onClick={saveSettings} className="btn btn-primary w-full sm:w-auto px-10">Save Changes</button>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}

                {/* ═══ ASSISTANT ═══ */}
                {activeTab === 'assistant' && (
                  <motion.div key="ast" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ ...spring, duration: 0.4 }}>
                    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-7">
                      <motion.div variants={cardVariant} className="space-y-2">
                        <h2 className="text-[2.5rem] font-extrabold tracking-tight">Quick Setup</h2>
                        <p className="text-lg font-medium max-w-lg" style={{ color: 'var(--text-2)' }}>Follow the guided flow to configure your pipeline.</p>
                      </motion.div>

                      <motion.div variants={cardVariant} className="grid grid-cols-1 lg:grid-cols-5 gap-7">
                        {/* Chat */}
                        <div className="lg:col-span-3 flex flex-col h-[520px] chat-panel">
                          <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: 'rgba(22,22,24,0.8)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full anim-pulse" /><span className="text-sm font-bold" style={{ color: 'var(--text-2)' }}>Setup Assistant</span></div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' }}><Lock className="w-3 h-3 text-green-400" />Local Only</div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ background: 'rgba(0,0,0,0.12)' }}>
                            {chatMsgs.map(m => (
                              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                {m.isTyping ? (<div className="bubble-bot"><div className="flex items-center gap-1.5 py-0.5"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div></div>) : <div className={m.sender === 'user' ? 'bubble-user' : 'bubble-bot'}>{m.text}</div>}
                                {!m.isTyping && m.options?.length ? <div className="flex flex-wrap gap-2 mt-2.5">{m.options.map(o => <button key={o} onClick={() => chatSubmit(o)} className="chip">{o}</button>)}</div> : null}
                              </motion.div>
                            ))}
                            <div ref={chatEnd} />
                          </div>
                          <div className="p-3.5" style={{ background: 'rgba(22,22,24,0.8)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <form onSubmit={e => { e.preventDefault(); chatSubmit(chatInput); }} className="flex gap-2.5">
                              <input type={step.includes('token') || step.includes('cookie') ? 'password' : 'text'} disabled={step === 'completed' || step.includes('verifying')} value={chatInput} onChange={e => setChatInput(e.target.value)}
                                placeholder={step === 'welcome' ? 'Enter username…' : step.includes('token') ? 'Paste token…' : step.includes('db') ? 'Database ID…' : step.includes('repo') ? 'owner/repo…' : 'Type response…'}
                                className="input flex-1 disabled:opacity-25" />
                              <button type="submit" disabled={!chatInput.trim() || step === 'completed' || step.includes('verifying')} className="btn btn-primary px-3.5 shrink-0 disabled:opacity-15"><Send className="w-4 h-4" /></button>
                            </form>
                          </div>
                        </div>

                        {/* Tracker */}
                        <div className="lg:col-span-2 glass flex flex-col justify-between h-[520px]">
                          <div className="space-y-5">
                            <div className="pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <h3 className="text-xl font-bold tracking-tight">Progress</h3>
                              <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Configuration status</p>
                            </div>
                            <div className="space-y-4">
                              {[
                                { label: 'LeetCode Profile', sub: tempLeetcodeUsername ? `@${tempLeetcodeUsername}` : 'Awaiting', done: !!tempLeetcodeUsername },
                                { label: 'Notion Database', sub: tempSyncToNotion ? (tempNotionDbId ? `ID: ${tempNotionDbId.slice(0, 8)}…` : 'Setting up') : (step !== 'welcome' && step !== 'ask_notion' ? 'Skipped' : 'Pending'), done: (tempSyncToNotion && !!tempNotionDbId) || (!tempSyncToNotion && step !== 'welcome' && step !== 'ask_notion') },
                                { label: 'GitHub Repository', sub: tempSyncToGithub ? (tempGithubRepo || 'Setting up') : (['welcome','ask_notion','notion_token','notion_db','notion_verifying','notion_retry','ask_github'].includes(step) ? 'Pending' : 'Skipped'), done: (tempSyncToGithub && !!tempGithubRepo) || (!tempSyncToGithub && !['welcome','ask_notion','notion_token','notion_db','notion_verifying','notion_retry','ask_github'].includes(step)) },
                                { label: 'Session Cookie', sub: tempLeetcodeSession ? 'Provided' : (step === 'completed' ? 'Skipped' : 'Optional'), done: !!tempLeetcodeSession || step === 'completed' },
                              ].map((item, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07, ...spring }} className="flex items-center justify-between">
                                  <div><p className="text-[0.95rem] font-semibold">{item.label}</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{item.sub}</p></div>
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${item.done ? 'text-green-400' : ''}`} style={{ background: item.done ? 'rgba(48,209,88,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${item.done ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.04)'}`, color: item.done ? undefined : 'var(--text-3)' }}>
                                    {item.done ? <Check className="w-4 h-4" /> : <CircleDot className="w-3.5 h-3.5" />}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2.5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="flex justify-between items-center"><span className="text-sm font-semibold" style={{ color: 'var(--text-3)' }}>Completion</span><span className="text-sm font-bold text-blue-400">{pct()}%</span></div>
                            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct()}%` }} /></div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}

              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
