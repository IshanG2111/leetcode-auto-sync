import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, CheckCircle2, XCircle, Github, Database, Code2, AlertCircle,
  Eye, EyeOff, RefreshCw, Send, Terminal, Download, Copy, Trash2,
  HelpCircle, Check, Lock, CircleDot, AlertTriangle, Cpu,
  Calendar, CheckCircle, ChevronDown, X, Zap, BookOpen,
  Shield, ArrowRight, Bookmark, Clock, ExternalLink, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { animate, createDrawable } from 'animejs';
import BlurText from './components/BlurText';
import TextPressure from './components/TextPressure';
import { GridScan } from './components/GridScan';
import { AnimatedThemeToggler } from "@/registry/magicui/animated-theme-toggler";
import Tooltip from './components/Tooltip';
import profileImg from './profile.jpg';

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
  notion?: boolean;
  github?: boolean;
}

/* ─── Motion Presets ─── */
const spring = { type: "spring" as const, stiffness: 280, damping: 28 };
const pageVariants = {
  initial: { opacity: 0, y: 24, scale: 0.98, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -16, scale: 0.98, filter: 'blur(4px)' },
};
const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const cardVariant = {
  initial: { opacity: 0, y: 18, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: spring },
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
  'gemini-key': {
    title: 'Obtaining a Google Gemini API Key',
    steps: [
      'Go to the Google AI Studio website (aistudio.google.com).',
      'Sign in with your Google account.',
      'Click the "Get API key" button in the sidebar or top menu.',
      'Click "Create API key" and select a Google Cloud project.',
      'Copy the generated API key (starts with AIzaSy).',
      'Paste the key into the field below.',
    ],
  },
};

/* ════════════════════════════════════════════════════════════════ */

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'assistant' | 'about'>('dashboard');
  const [privacyModal, setPrivacyModal] = useState(false);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Settings
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [leetcodeSession, setLeetcodeSession] = useState('');
  const [syncToNotion, setSyncToNotion] = useState(false);
  const [notionToken, setNotionToken] = useState('');
  const [notionDbId, setNotionDbId] = useState('');
  const [syncToGithub, setSyncToGithub] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [useGemini, setUseGemini] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

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
  const [geminiTest, setGeminiTest] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [geminiTestErr, setGeminiTestErr] = useState('');

  // UI
  const [showSession, setShowSession] = useState(false);
  const [showNToken, setShowNToken] = useState(false);
  const [showGToken, setShowGToken] = useState(false);
  const [showGeminiToken, setShowGeminiToken] = useState(false);
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

  const lcToCorePacketRef = useRef<SVGPathElement>(null);
  const coreToGhPacketRef = useRef<SVGPathElement>(null);
  const coreToNotionPacketRef = useRef<SVGPathElement>(null);

  /* ─── Pipeline Animations (Anime.js createDrawable) ─── */
  useEffect(() => {
    let animLc: any = null;
    let animGh: any = null;
    let animNotion: any = null;

    if (isSyncing) {
      if (leetcodeUsername && lcToCorePacketRef.current) {
        animLc = animate(createDrawable(lcToCorePacketRef.current), {
          draw: ['0 0', '0 0.15', '0.85 1', '1 1'],
          duration: 1600,
          ease: 'linear',
          loop: true,
        });
      }

      if (syncToGithub && githubRepo && coreToGhPacketRef.current) {
        animGh = animate(createDrawable(coreToGhPacketRef.current), {
          draw: ['0 0', '0 0.15', '0.85 1', '1 1'],
          duration: 1600,
          delay: 500,
          ease: 'linear',
          loop: true,
        });
      }

      if (syncToNotion && notionDbId && coreToNotionPacketRef.current) {
        animNotion = animate(createDrawable(coreToNotionPacketRef.current), {
          draw: ['0 0', '0 0.15', '0.85 1', '1 1'],
          duration: 1600,
          delay: 500,
          ease: 'linear',
          loop: true,
        });
      }
    }

    return () => {
      if (animLc) animLc.cancel();
      if (animGh) animGh.cancel();
      if (animNotion) animNotion.cancel();
    };
  }, [isSyncing, leetcodeUsername, syncToGithub, githubRepo, syncToNotion, notionDbId, isMobile]);

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
    const uG = localStorage.getItem('useGemini') === 'true';
    const gK = localStorage.getItem('geminiApiKey') || '';

    setLeetcodeUsername(u); setLeetcodeSession(s);
    setSyncToNotion(sN); setNotionToken(nT); setNotionDbId(nD);
    setSyncToGithub(sG); setGithubToken(gT); setGithubRepo(gR);
    setUseGemini(uG); setGeminiApiKey(gK);

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
    localStorage.setItem('useGemini', useGemini.toString());
    localStorage.setItem('geminiApiKey', geminiApiKey);
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
    setUseGemini(false); setGeminiApiKey('');
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

  const testGemini = async () => {
    setGeminiTest('testing'); setGeminiTestErr('');
    try {
      const r = await fetch('/api/test-gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geminiApiKey }) });
      const d = await r.json();
      if (r.ok && d.success) { setGeminiTest('success'); showToast('Gemini connected!'); }
      else { setGeminiTest('error'); setGeminiTestErr(d.error || 'Authentication failed'); }
    } catch (e: any) { setGeminiTest('error'); setGeminiTestErr(e.message || 'Timeout'); }
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
        const isNotion = l.includes('[Notion]');
        const isGithub = l.includes('[GitHub]');
        let t = '';
        if (l.includes('[Notion] Successfully created')) t = l.split('[Notion] Successfully created ')[1] || '';
        else if (l.includes('[Notion] Successfully updated')) t = l.split('[Notion] Successfully updated ')[1] || '';
        else if (l.includes('[GitHub] Successfully pushed')) t = l.split('[GitHub] Successfully pushed ')[1] || '';
        t = t.trim();
        if (t && t !== 'Sync Complete! 🎉') {
          const existingIdx = upd.findIndex(s => s.title.toLowerCase() === t.toLowerCase());
          if (existingIdx > -1) {
            if (isNotion) upd[existingIdx].notion = true;
            if (isGithub) upd[existingIdx].github = true;
          } else {
            upd.unshift({
              title: t,
              time: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
              status: 'synced',
              notion: isNotion,
              github: isGithub
            });
          }
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
        body: JSON.stringify({
          leetcodeUsername, leetcodeSession, notionToken, notionDbId,
          githubToken, githubRepo, syncToNotion, syncToGithub,
          syncMode: mode, forceUpdate, geminiApiKey, useGemini
        })
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
        botMsg("Almost done — add a LeetCode session cookie? (Required to fetch code solutions from LeetCode, optional if Notion only)", ['Enter cookie', 'Skip'], 400);
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
        if (r.ok && d.success) { botMsg("GitHub connected! Add a session cookie? (Required to fetch and sync code solutions)", ['Enter cookie', 'Skip'], 700); setStep('ask_cookie'); }
        else { botMsg(`Failed: ${d.error || 'Invalid'}`, ['Re-enter GitHub', 'Skip GitHub'], 700); setStep('github_retry'); }
      } catch (e: any) { botMsg(`Failed: ${e.message}`, ['Re-enter GitHub', 'Skip GitHub'], 700); setStep('github_retry'); }
    }
    else if (step === 'github_retry') {
      if (text.toLowerCase().includes('re-enter')) { botMsg("GitHub PAT:", undefined, 400); setStep('github_token'); }
      else { setTempSyncToGithub(false); botMsg("Add session cookie? (Required to fetch and sync code solutions)", ['Enter cookie', 'Skip'], 400); setStep('ask_cookie'); }
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

  const pathLcToCore = isMobile ? "M 50 15 L 50 50" : "M 16 50 L 50 50";
  const pathCoreToGh = isMobile ? "M 50 50 C 50 67, 25 67, 25 85" : "M 50 50 C 67 50, 67 25, 84 25";
  const pathCoreToNotion = isMobile ? "M 50 50 C 50 67, 75 67, 75 85" : "M 50 50 C 67 50, 67 75, 84 75";

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
                    <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(255, 90, 0, 0.1)', color: 'var(--accent-blue)' }}>{i + 1}</span>
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

      {/* ── Privacy Policy Modal ── */}
      <AnimatePresence>
        {privacyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6" onClick={() => setPrivacyModal(false)}>
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 24 }}
              transition={spring}
              className="relative w-full max-w-lg glass-solid z-10 p-6 md:p-8"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setPrivacyModal(false)} className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                <X className="w-4 h-4 text-white/50" />
              </button>
              
              <div className="flex items-center gap-3.5 mb-5">
                <Shield className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-bold tracking-tight">Security & Privacy Policy</h3>
              </div>

              <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                <p>
                  <strong>Aergia operates on an absolute local-first architecture.</strong> Here are the key security foundations of the synchronization system:
                </p>
                
                <ul className="space-y-3 list-none pl-0">
                  <li className="flex gap-2.5 items-start">
                    <span className="text-green-400 shrink-0 select-none">✓</span>
                    <span><strong>Local Only Storage</strong>: All session cookies, access tokens, and integration details are stored 100% inside your browser's Secure LocalStorage. Nothing is ever sent to or compiled on external cloud servers.</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <span className="text-green-400 shrink-0 select-none">✓</span>
                    <span><strong>Direct Handshakes</strong>: All API requests (GitHub classic actions, LeetCode ingestion, Notion schemas) are routed directly from your local browser/dev node to their respective API servers.</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <span className="text-green-400 shrink-0 select-none">✓</span>
                    <span><strong>Zero Telemetry</strong>: Aergia logs no diagnostics, collects no user identifiers, and has no background metric loggers. Your solving data belongs entirely to you.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-5 border-t border-white/5 flex justify-end">
                <button onClick={() => setPrivacyModal(false)} className="btn btn-primary px-6 py-2 text-xs font-semibold uppercase tracking-wider">
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLanding ? (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => {
              setShowLanding(false);
            }}
            className="fixed inset-0 z-[80] bg-black w-screen h-screen overflow-hidden flex flex-col justify-center items-center text-white select-none cursor-pointer"
          >
            {/* WebGL Scanner Background */}
            <GridScan 
              linesColor="#2f293a" 
              scanColor="#ff5a00" 
              scanOpacity={0.28} 
              gridScale={0.12} 
              lineThickness={1.25}
              bloomIntensity={1.3}
              noiseIntensity={0.015}
              scanDuration={2.6}
              scanDelay={1.5}
              className="absolute inset-0 w-full h-full"
              style={undefined}
            />

            {/* Center branding flow container to prevent overlap and look premium */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(16px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
              className="z-10 flex flex-col items-center justify-center w-full max-w-[90vw] md:max-w-4xl mx-auto px-4 select-none pointer-events-auto gap-4"
            >
              {/* Constrain title max-width to avoid massive vertical scaling and overlap, no clipping */}
              <div className="w-full max-w-xl md:max-w-2xl h-[120px] md:h-[180px] flex items-center justify-center relative mb-6">
                <TextPressure 
                  text="AERGIA"
                  fontFamily="Roboto Flex"
                  fontUrl=""
                  width={true}
                  weight={true}
                  italic={true}
                  alpha={false}
                  flex={true}
                  stroke={false}
                  scale={false}
                  textColor="#FFFFFF"
                  minFontSize={64}
                />
              </div>

              {/* Letter-staggered Subtitle */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                className="text-center mb-4"
              >
                <BlurText
                  text="THE PREMIER LEETCODE AUTOMATION ENGINE"
                  className="text-xs md:text-sm font-semibold tracking-[0.3em] text-[#FF5A00] opacity-80"
                  delay={45}
                  animateBy="letters"
                  direction="bottom"
                />
              </motion.div>

              {/* Pulsing indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.3, 0.6] }}
                transition={{ 
                  delay: 2.2, 
                  duration: 3, 
                  repeat: Infinity, 
                  repeatType: "reverse" 
                }}
                className="mt-8 text-[10px] md:text-xs tracking-[0.25em] text-white/40 uppercase font-medium"
              >
                [ Click anywhere to initialize pipeline ]
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="app-core"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* ════════ Header ════════ */}
            <header className="sticky top-0 z-50 w-full glass-nav" style={{ paddingBottom: '12px', overflow: 'visible' }}>
              <div className="max-w-[1120px] mx-auto px-5 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Logo and Mobile Theme Toggler Row */}
                <div className="flex items-center justify-between w-full md:w-auto">
                  <h1 
                    className="font-orbitron font-extrabold text-[1.25rem] tracking-[0.25em] text-[#FF5A00] select-none leading-none pt-0.5"
                    style={{ textShadow: '0 0 20px rgba(255, 90, 0, 0.3), 0 0 40px rgba(255, 90, 0, 0.1)' }}
                  >
                    AERGIA
                  </h1>
                  
                  {/* Theme toggler shown on top row on mobile */}
                  <div className="md:hidden">
                    <AnimatedThemeToggler />
                  </div>
                </div>

                {/* Segment Control Navigation & Theme Toggler */}
                <div className="flex items-center gap-4.5 w-full md:w-auto">
                  <div className="seg-control w-full md:w-auto justify-around md:justify-start">
                    {(['dashboard', 'settings', 'assistant', 'about'] as const).map(t => (
                      <button key={t} onClick={() => setActiveTab(t)} className={`seg-btn ${activeTab === t ? 'active' : ''}`}>
                        {t === 'dashboard' ? 'Dashboard' : t === 'settings' ? 'Settings' : t === 'assistant' ? 'Setup' : 'About'}
                        {t === 'assistant' && !leetcodeUsername && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#FF5A00] rounded-full animate-ping" />}
                      </button>
                    ))}
                  </div>
                  
                  {/* Theme toggler hidden on mobile, shown on desktop */}
                  <div className="hidden md:block">
                    <AnimatedThemeToggler />
                  </div>
                </div>
              </div>
            </header>

            {/* ════════ Main ════════ */}
            <main className="max-w-[1120px] mx-auto px-5 pt-10 pb-28">
              <AnimatePresence mode="wait">

                {/* ═══ DASHBOARD ═══ */}
                {activeTab === 'dashboard' && (
                  <motion.div key="dash" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ ...spring, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-7">

                      {/* Dashboard Header */}
                      <motion.div variants={cardVariant} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                        <div>
                          <h2 className="text-3xl font-extrabold tracking-tight">Console</h2>
                          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Monitor and trigger your sync pipeline</p>
                        </div>
                        {leetcodeUsername && (
                          <motion.div 
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 font-mono text-[11px]" 
                            style={{ color: 'var(--text-2)' }}
                          >
                            <span className="text-white/35 tracking-wider">LC PROFILE:</span>
                            <a 
                              href={`https://leetcode.com/u/${leetcodeUsername}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-bold text-[#FF5A00] hover:text-[#0A84FF] transition-colors duration-300 border-b border-[#FF5A00]/30 hover:border-[#0A84FF]/30 pb-0.5 flex items-center gap-1"
                            >
                              @{leetcodeUsername}
                              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                            </a>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold tracking-widest uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              LIVE
                            </div>
                          </motion.div>
                        )}
                      </motion.div>

                      {/* Pipeline */}
                      <motion.div variants={cardVariant} className="glass relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--text-3)' }}>Pipeline</p>
                            <h3 className="text-xl font-bold tracking-tight">Sync Flow</h3>
                          </div>
                          <div className={`badge ${isSyncing ? 'badge-active' : 'badge-idle'}`} style={isSyncing ? { animation: 'glowPulse 2s ease-in-out infinite' } : {}}>
                            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-[#FF5A00] animate-pulse' : 'bg-white/15'}`} />
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
                                <stop offset="50%" stopColor="#FF5A00" />
                                <stop offset="100%" stopColor="var(--accent-green)" />
                              </linearGradient>
                            </defs>

                             {/* Track: LeetCode -> Aergia Core */}
                             <path 
                               d={pathLcToCore} 
                               className={`track-path ${leetcodeUsername ? (isSyncing ? 'syncing' : 'active') : 'inactive'}`} 
                             />
                             {isSyncing && leetcodeUsername && (
                               <path d={pathLcToCore} className="flow-path" />
                             )}

                             {/* Track: Aergia Core -> GitHub */}
                             <path 
                               d={pathCoreToGh} 
                               className={`track-path ${syncToGithub && githubRepo ? (isSyncing ? 'syncing' : 'active') : 'inactive'}`} 
                             />
                             {isSyncing && syncToGithub && githubRepo && (
                               <path d={pathCoreToGh} className="flow-path flow-path-github" />
                             )}

                             {/* Track: Aergia Core -> Notion */}
                             <path 
                               d={pathCoreToNotion} 
                               className={`track-path ${syncToNotion && notionDbId ? (isSyncing ? 'syncing' : 'active') : 'inactive'}`} 
                             />
                             {isSyncing && syncToNotion && notionDbId && (
                               <path d={pathCoreToNotion} className="flow-path flow-path-notion" />
                             )}

                             {/* Glowing Data Packets */}
                             {isSyncing && leetcodeUsername && (
                               <path 
                                 ref={lcToCorePacketRef}
                                 d={pathLcToCore} 
                                 fill="none"
                                 stroke="#FF9F0A"
                                 strokeWidth="2.5"
                                 strokeLinecap="round"
                                 style={{ filter: 'drop-shadow(0 0 5px #FF9F0A)' }}
                               />
                             )}
                             {isSyncing && syncToGithub && githubRepo && (
                               <path 
                                 ref={coreToGhPacketRef}
                                 d={pathCoreToGh} 
                                 fill="none"
                                 stroke="#30D158"
                                 strokeWidth="2.5"
                                 strokeLinecap="round"
                                 style={{ filter: 'drop-shadow(0 0 5px #30D158)' }}
                               />
                             )}
                             {isSyncing && syncToNotion && notionDbId && (
                               <path 
                                 ref={coreToNotionPacketRef}
                                 d={pathCoreToNotion} 
                                 fill="none"
                                 stroke="#5E5CE6"
                                 strokeWidth="2.5"
                                 strokeLinecap="round"
                                 style={{ filter: 'drop-shadow(0 0 5px #5E5CE6)' }}
                               />
                             )}
                          </svg>

                          {/* Node: LeetCode */}
                          <div 
                            className={`pipe-node-container pipe-node-lc ${leetcodeUsername ? 'active' : 'inactive'} ${leetcodeUsername && isSyncing ? 'syncing' : ''}`}
                            style={{ left: '16%', top: '50%' }}
                            title={leetcodeUsername ? `LeetCode Account: @${leetcodeUsername}` : 'LeetCode not configured'}
                          >
                            <div className="pipe-connector-pin pin-right" />
                            <div className="pipe-node-card">
                              <div className="pipe-card-led" />
                              <div className="pipe-card-icon-box">
                                <Code2 className="w-4.5 h-4.5 md:w-5 md:h-5" style={{ color: leetcodeUsername ? '#FF9F0A' : 'var(--color-inactive)' }} />
                              </div>
                              <div className="pipe-card-text">
                                <span className="pipe-card-title">LeetCode</span>
                                <span className="pipe-card-subtitle truncate max-w-[80px] md:max-w-[110px]">
                                  {leetcodeUsername ? `@${leetcodeUsername}` : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Node: Aergia Core */}
                          <div 
                            className={`pipe-node-container pipe-node-core ${leetcodeUsername ? 'active' : 'inactive'} ${isSyncing ? 'syncing' : ''}`}
                            style={{ left: '50%', top: '50%' }}
                            title={isSyncing ? 'Processing Data Pipeline' : 'Aergia Engine Ready'}
                          >
                            <div className="pipe-connector-pin pin-left" />
                            <div className="pipe-connector-pin pin-right" />
                            <div className="pipe-node-card">
                              <div className="pipe-card-led" />
                              <div className="pipe-card-icon-box">
                                <Cpu className={`w-5 h-5 md:w-5.5 md:h-5.5 ${isSyncing ? 'animate-spin' : ''}`} style={{ animationDuration: '6s', color: leetcodeUsername ? '#FF5A00' : 'var(--color-inactive)' }} />
                              </div>
                              <div className="pipe-card-text">
                                <span className="pipe-card-title">AERGIA CORE</span>
                                <span className="pipe-card-subtitle">
                                  {isSyncing ? 'Syncing...' : (leetcodeUsername ? 'Engine Ready' : 'Standby')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Node: GitHub */}
                          <div 
                            className={`pipe-node-container pipe-node-github ${syncToGithub && githubRepo ? 'active' : 'inactive'} ${syncToGithub && githubRepo && isSyncing ? 'syncing' : ''}`}
                            style={{ left: '84%', top: '25%' }}
                            title={syncToGithub && githubRepo ? `GitHub Repository: ${githubRepo}` : 'GitHub Sync disabled'}
                          >
                            <div className="pipe-connector-pin pin-left" />
                            <div className="pipe-node-card">
                              <div className="pipe-card-led" />
                              <div className="pipe-card-icon-box">
                                <Github className="w-4.5 h-4.5 md:w-5 md:h-5" style={{ color: syncToGithub && githubRepo ? '#30D158' : 'var(--color-inactive)' }} />
                              </div>
                              <div className="pipe-card-text">
                                <span className="pipe-card-title">GitHub</span>
                                <span className="pipe-card-subtitle truncate max-w-[80px] md:max-w-[110px]">
                                  {syncToGithub && githubRepo ? githubRepo.split('/')[1] : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Node: Notion */}
                          <div 
                            className={`pipe-node-container pipe-node-notion ${syncToNotion && notionDbId ? 'active' : 'inactive'} ${syncToNotion && notionDbId && isSyncing ? 'syncing' : ''}`}
                            style={{ left: '84%', top: '75%' }}
                            title={syncToNotion && notionDbId ? 'Notion database connected' : 'Notion Sync disabled'}
                          >
                            <div className="pipe-connector-pin pin-left" />
                            <div className="pipe-node-card">
                              <div className="pipe-card-led" />
                              <div className="pipe-card-icon-box">
                                <Database className="w-4.5 h-4.5 md:w-5 md:h-5" style={{ color: syncToNotion && notionDbId ? '#5E5CE6' : 'var(--color-inactive)' }} />
                              </div>
                              <div className="pipe-card-text">
                                <span className="pipe-card-title">Notion</span>
                                <span className="pipe-card-subtitle truncate max-w-[80px] md:max-w-[110px]">
                                  {syncToNotion && notionDbId ? 'Connected' : 'Disabled'}
                                </span>
                              </div>
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
                            <div className="min-h-[140px] max-h-[220px] overflow-y-auto px-1">
                              {recentSolves.length === 0 && !isSyncing ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                                  <Bookmark className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.06)' }} />
                                  <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>No activity yet</p>
                                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Run a sync to populate</p>
                                </div>
                              ) : (
                                <div className="w-full overflow-x-auto">
                                  <table className="w-full border-collapse text-left">
                                    <thead>
                                      <tr className="border-b border-white/[0.04] text-[0.62rem] font-black tracking-wider uppercase" style={{ color: 'var(--text-3)' }}>
                                        <th className="py-2 px-2.5">Problem</th>
                                        <th className="py-2 px-2.5 text-center">Destinations</th>
                                        <th className="py-2 px-2.5 text-right">Time</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {/* Syncing active row */}
                                      {isSyncing && (
                                        <tr className="animate-pulse border-b border-white/[0.02]" style={{ background: 'rgba(255, 90, 0, 0.02)' }}>
                                          <td className="py-2.5 px-2.5">
                                            <div className="flex items-center gap-2">
                                              <RefreshCw className="w-3.5 h-3.5 text-[#FF5A00] animate-spin" />
                                              <span className="text-[0.68rem] font-bold italic text-[#FF5A00]">Syncing active solve...</span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-2.5 text-center">
                                            <div className="inline-flex gap-1 justify-center items-center">
                                              {syncToGithub && <span className="w-1.5 h-1.5 rounded-full bg-green-400/60 animate-ping" />}
                                              {syncToNotion && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-ping" />}
                                              {!syncToGithub && !syncToNotion && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00]/60 animate-ping" />}
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-2.5 text-right text-[0.68rem]" style={{ color: 'var(--text-3)' }}>Pending...</td>
                                        </tr>
                                      )}
                                      {/* Existing solves */}
                                      {recentSolves.map((s, i) => (
                                        <tr key={i} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.015] transition-colors">
                                          <td className="py-2.5 px-2.5 min-w-[120px] max-w-[200px]">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <div className="flex items-center justify-center shrink-0 w-6 h-6 rounded bg-white/5 border border-white/5" style={{ color: 'var(--text-2)' }}>
                                                <Code2 className="w-3.5 h-3.5 text-[#FF5A00]" />
                                              </div>
                                              <span className="text-xs font-bold text-white truncate" style={{ color: 'var(--text-1)' }}>{s.title}</span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-2.5 text-center">
                                            <div className="inline-flex gap-1 justify-center">
                                              {s.github && (
                                                <span className="badge badge-success text-[0.58rem] px-1.5 py-0.5 font-bold uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                                                  <Github className="w-2.5 h-2.5" /> GH
                                                </span>
                                              )}
                                              {s.notion && (
                                                <span className="badge badge-indigo text-[0.58rem] px-1.5 py-0.5 font-bold uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                                                  <Database className="w-2.5 h-2.5" /> NT
                                                </span>
                                              )}
                                              {!s.github && !s.notion && (
                                                <span className="badge badge-success text-[0.58rem] px-1.5 py-0.5">
                                                  SYNCED
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-2.5 text-right text-[0.68rem] whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                                            {s.time}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
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
                                  <motion.span 
                                    className="text-5xl font-extrabold tracking-tighter"
                                    key={allSolved}
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ ...spring, duration: 0.6 }}
                                  >
                                    {allSolved}
                                  </motion.span>
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

                              {/* Gemini connection */}
                              <div className="flex items-center justify-between p-3 rounded-2xl" style={{ background: 'var(--bg-hover)', border: 'var(--border-neumorphic)' }}>
                                <div className="flex items-center gap-3">
                                  <div className="icon-box" style={{ background: 'rgba(0,163,255,0.08)', color: '#00A3FF', width: '32px', height: '32px' }}><Sparkles className="w-4 h-4" /></div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold">Gemini Analyzer</p>
                                    <p className="text-xs font-mono truncate max-w-[120px]" style={{ color: 'var(--text-3)' }}>{geminiApiKey ? 'Key configured' : 'Not set'}</p>
                                  </div>
                                </div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${useGemini && geminiApiKey ? 'text-[#00A3FF] bg-[#00A3FF]/5 border border-[#00A3FF]/10' : 'text-white/20 bg-white/5 border border-white/5'}`}>
                                  {useGemini && geminiApiKey ? 'Active' : 'Off'}
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
                  <motion.div key="set" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ ...spring, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
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
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>Required to fetch/sync code solutions to GitHub. Optional only for syncing titles to Notion.</p>
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

                      {/* Gemini Analyzer */}
                      <motion.div variants={cardVariant} className="glass space-y-5">
                        <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div className="flex items-center gap-3">
                            <div className="icon-box" style={{ background: 'rgba(0,163,255,0.08)', color: '#00A3FF' }}><Sparkles className="w-5 h-5" /></div>
                            <h3 className="text-lg font-bold tracking-tight">Gemini AI Analyzer</h3>
                          </div>
                          <label className="toggle"><input type="checkbox" checked={useGemini} onChange={e => setUseGemini(e.target.checked)} /><span className="toggle-track" /></label>
                        </div>
                        <AnimatePresence>
                          {useGemini && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="space-y-5 overflow-hidden">
                              <SecretField label="Gemini API Key" value={geminiApiKey} onChange={setGeminiApiKey} show={showGeminiToken} onToggle={() => setShowGeminiToken(!showGeminiToken)} placeholder="AIzaSy…" helpKey="gemini-key" />
                              <p className="text-xs leading-relaxed -mt-2" style={{ color: 'var(--text-3)' }}>Used to automatically analyze code submissions to extract approach summaries, time complexity, and space complexity details.</p>
                              <button onClick={testGemini} disabled={geminiTest === 'testing'} className="btn btn-tint w-full py-2.5 text-sm">{geminiTest === 'testing' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}Verify Connection</button>
                              {geminiTest === 'success' && <div className="p-3.5 rounded-2xl text-sm flex items-center gap-2" style={{ background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.12)', color: 'var(--accent-green)' }}><CheckCircle2 className="w-4 h-4" />Connected!</div>}
                              {geminiTest === 'error' && <div className="p-3.5 rounded-2xl text-sm flex items-center gap-2" style={{ background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.12)', color: 'var(--accent-red)' }}><XCircle className="w-4 h-4" />{geminiTestErr}</div>}
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
                  <motion.div key="ast" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ ...spring, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-7">
                      <motion.div variants={cardVariant} className="space-y-2">
                        <h2 className="text-[2.5rem] font-extrabold tracking-tight">Quick Setup</h2>
                        <p className="text-lg font-medium max-w-lg" style={{ color: 'var(--text-2)' }}>Follow the guided flow to configure your pipeline.</p>
                      </motion.div>

                      <motion.div variants={cardVariant} className="grid grid-cols-1 lg:grid-cols-5 gap-7">
                        {/* Chat */}
                        <div className="lg:col-span-3 flex flex-col h-[520px] chat-panel">
                          <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: 'rgba(22,22,24,0.8)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 bg-[#FF5A00] rounded-full anim-pulse" /><span className="text-sm font-bold" style={{ color: 'var(--text-2)' }}>Setup Assistant</span></div>
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
                            <div className="flex justify-between items-center"><span className="text-sm font-semibold" style={{ color: 'var(--text-3)' }}>Completion</span><span className="text-sm font-bold text-[#FF5A00]">{pct()}%</span></div>
                            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct()}%` }} /></div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}

                {/* ═══ ABOUT ═══ */}
                {activeTab === 'about' && (
                  <motion.div key="abt" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ ...spring, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-8 max-w-4xl mx-auto pb-10">
                      
                      {/* Top Heading */}
                      <motion.div variants={cardVariant} className="text-center md:text-left space-y-1.5">
                        <h2 className="text-[2.5rem] font-extrabold tracking-tight">About Aergia</h2>
                        <p className="text-lg font-medium text-white/50" style={{ color: 'var(--text-2)' }}>The technology, structure, and design architect.</p>
                      </motion.div>

                      {/* Main Showcase Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                        
                        {/* Left Column: Halftone Avatar & Tooltips (md:col-span-5) */}
                        <motion.div variants={cardVariant} className="md:col-span-5 glass flex flex-col items-center gap-6 p-6">
                          
                          {/* Image Wrapper */}
                          <div className="relative group shrink-0 w-48 h-48 md:w-56 md:h-56">
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#FF5A00] to-[#FF9F0A] opacity-15 group-hover:opacity-35 blur-xl transition-all duration-500" />
                            <div className="relative w-full h-full rounded-3xl bg-gradient-to-tr from-[#FF5A00] to-[#FF9F0A] p-[1.5px] shadow-2xl overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                              <img 
                                src={profileImg} 
                                alt="Ishan Ghosh Portrait" 
                                className="w-full h-full object-cover rounded-[22px]"
                              />
                            </div>
                          </div>

                          {/* Profile Minimal details */}
                          <div className="text-center space-y-1.5">
                            <span className="badge badge-success text-[0.62rem] px-2.5 py-0.5 font-extrabold uppercase tracking-wider">Engine Architect</span>
                            <h3 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-1)' }}>Ishan Ghosh</h3>
                            <p className="text-xs font-mono tracking-wide text-white/40 uppercase">Full Stack & Automation</p>
                          </div>

                          {/* Tooltips list */}
                          <div className="flex justify-center items-center gap-8 w-full border-t border-white/[0.04] pt-6 mt-2">
                            <Tooltip 
                              platform="linkedin"
                              url="https://www.linkedin.com/in/ishan-ghosh-7b33a4336/"
                              name="Ishan Ghosh"
                              username="@ishan-ghosh-7b33a4336"
                              avatarText="IG"
                              iconPath="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"
                              colorTheme="#FF5A00"
                            />
                            
                            <Tooltip 
                              platform="github"
                              url="https://github.com/IshanG2111"
                              name="Ishan Ghosh"
                              username="@IshanG2111"
                              avatarText="IG"
                              iconPath="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                              viewBox="0 0 16 16"
                              colorTheme="#FF5A00"
                            />
                          </div>

                        </motion.div>

                        {/* Right Column: Architectural Details & How it Works (md:col-span-7) */}
                        <div className="md:col-span-7 space-y-6">
                          
                          {/* Architect Statement */}
                          <motion.div variants={cardVariant} className="glass">
                            <h4 className="text-sm font-black uppercase tracking-[0.15em] mb-2 text-[#FF5A00]">Philosophy</h4>
                            <p className="text-[0.95rem] leading-relaxed text-white/70" style={{ color: 'var(--text-2)' }}>
                              "Aergia was designed out of a need for clean, reliable, and zero-compromise developer productivity. Every element in its layout, visual timeline, and local schema is built with state-of-the-art web tokens to bring a beautiful, premium console directly to your browser."
                            </p>
                          </motion.div>

                          {/* How it Works Section */}
                          <motion.div variants={cardVariant} className="glass space-y-4">
                            <h4 className="text-sm font-black uppercase tracking-[0.15em] text-[#FF5A00]">System Architecture</h4>
                            
                            <div className="space-y-4 pt-2">
                              {/* 1. Sync engine */}
                              <div className="flex gap-3.5 items-start">
                                <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border border-green-500/30 text-green-400 bg-green-500/5">1</div>
                                <div>
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-white" style={{ color: 'var(--text-1)' }}>LeetCode Ingestion</h5>
                                  <p className="text-xs leading-relaxed text-white/50 mt-0.5" style={{ color: 'var(--text-3)' }}>
                                    Pulls your profiles directly via public GraphQL APIs or securely authenticates through your session cookie for detailed code submissions.
                                  </p>
                                </div>
                              </div>

                              {/* 2. Notion storage */}
                              <div className="flex gap-3.5 items-start">
                                <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border border-indigo-500/30 text-indigo-400 bg-indigo-500/5">2</div>
                                <div>
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-white" style={{ color: 'var(--text-1)' }}>Notion Database Sync</h5>
                                  <p className="text-xs leading-relaxed text-white/50 mt-0.5" style={{ color: 'var(--text-3)' }}>
                                    Creates pages inside your Notion database, automatically structuring metadata tags (difficulty, tags, submission time, solutions).
                                  </p>
                                </div>
                              </div>

                              {/* 3. GitHub repository */}
                              <div className="flex gap-3.5 items-start">
                                <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border border-[#FF5A00]/30 text-[#FF5A00] bg-[#FF5A00]/5">3</div>
                                <div>
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-white" style={{ color: 'var(--text-1)' }}>GitHub Automations</h5>
                                  <p className="text-xs leading-relaxed text-white/50 mt-0.5" style={{ color: 'var(--text-3)' }}>
                                    Structures solved files in a professional markdown directory inside your repo classic paths, recording chronological commit progress.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>

                        </div>

                      </div>

                      {/* Policy & Security Footer Button */}
                      <motion.div variants={cardVariant} className="pt-6 border-t border-white/[0.04] text-center space-y-3">
                        <div className="flex items-center justify-center gap-1.5 text-xs text-white/45" style={{ color: 'var(--text-3)' }}>
                          <Shield className="w-3.5 h-3.5 text-green-400" />
                          <span>100% Client-Side. No telemetry. No database logging.</span>
                        </div>
                        <div>
                          <button 
                            onClick={() => setPrivacyModal(true)} 
                            className="btn btn-ghost py-2 px-5 text-xs font-semibold uppercase tracking-wider"
                            style={{ borderRadius: 'var(--r-pill)' }}
                          >
                            Read Full Privacy Policy
                          </button>
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
