
import React, { useState, useEffect } from 'react';
import { Sun, Moon, Zap, Menu, X, ArrowRight, Check, Github, Linkedin, Copy, Share2, Sparkles, Layers, Wand2, LayoutDashboard, History, Settings, LogOut, ChevronRight, FileText, Activity, CreditCard, ShieldCheck, Globe, Users, Trash2, Plus, Minus, HelpCircle } from 'lucide-react';
import { NICHES, FEATURES, PRICING_TIERS, TONES, FAQ_ITEMS } from './constants';
import { NicheType, ViewType, ToneType, ModelType, HistoryItem } from './types';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

// Initialize PDF worker
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import Tesseract from 'tesseract.js';
import { SEO } from './src/components/SEO';
import { SchemaMarkup } from './src/components/Schema';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedNiche, setSelectedNiche] = useState<NicheType>('Legal');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [outputText, setOutputText] = useState('');
  const [usageCount, setUsageCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [userTier, setUserTier] = useState<'Starter' | 'Pro' | 'Enterprise'>('Starter');
  const [view, setView] = useState<ViewType>('landing');
  const [selectedTone, setSelectedTone] = useState<ToneType>('Standard');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeModel, setActiveModel] = useState<ModelType>('Gemini 1.5 Flash');
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [userEmail, setUserEmail] = useState('');
  const [dashboardView, setDashboardView] = useState<'workspace' | 'history' | 'files' | 'usage' | 'team'>('workspace');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pendingTier, setPendingTier] = useState<'Pro' | 'Enterprise' | 'Starter'>('Starter');
  const [teamMembers, setTeamMembers] = useState<{ email: string, role: string }[]>([]);
  const [teamEmailInput, setTeamEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [session, setSession] = useState<any>(null);

  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');

  const handleNewsletterSubscribe = () => {
    if (newsletterEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      window.open(`https://entrextlabs.substack.com/subscribe?email=${encodeURIComponent(newsletterEmail)}`, '_blank');
    } else {
      alert("Please enter a valid email address.");
    }
  };

  const renderOutput = (text: string) => {
    if (!text) return null;
    // Strip any accidental code blocks, including mermaid
    const cleanText = text.replace(/```mermaid[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim();
    return <p className="text-2xl leading-[1.6] font-medium break-words overflow-wrap-anywhere whitespace-pre-wrap px-4">{cleanText}</p>;
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const activeNiche = NICHES.find(n => n.id === selectedNiche)!;

  // Initialize and track usage
  useEffect(() => {
    const stored = localStorage.getItem('gist_usage');
    const today = new Date().toDateString();
    if (stored) {
      const { count, date } = JSON.parse(stored);
      if (date === today) setUsageCount(count);
      else {
        localStorage.setItem('gist_usage', JSON.stringify({ count: 0, date: today }));
        setUsageCount(0);
      }
    } else {
      localStorage.setItem('gist_usage', JSON.stringify({ count: 0, date: today }));
    }
  }, []);

  const incrementUsage = async () => {
    const today = new Date().toDateString();
    const newCount = usageCount + 1;
    setUsageCount(newCount);
    localStorage.setItem('gist_usage', JSON.stringify({ count: newCount, date: today }));

    if (userTier === 'Starter' && newCount >= 5) {
      setShowLimitModal(true);
      return; // Stop execution to prevent further processing if limit hit
    }

    // Persist to Supabase if logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('profiles')
        .update({ usage_count: newCount })
        .eq('id', session.user.id);
    }
  };

  const routeModel = (text: string): ModelType => {
    if (userTier === 'Starter') return 'Gemini 1.5 Flash';
    if (text.length < 300) return 'Groq (Llama-3)';
    return 'Gemini 1.5 Pro';
  };

  const saveHistory = (result: string, model: ModelType) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      niche: selectedNiche,
      input: inputText,
      output: result,
      model: model,
      tone: selectedTone
    };

    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 50); // Keep last 50
      localStorage.setItem('gist_history', JSON.stringify(updated));
      return updated;
    });

    if (userTier === 'Starter') {
      incrementUsage();
    }
  };



  // Check session on mount
  useEffect(() => {
    // Load local history
    const savedHistory = localStorage.getItem('gist_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    // Load Team
    const savedTeam = localStorage.getItem('gist_team_list');
    if (savedTeam) {
      try { setTeamMembers(JSON.parse(savedTeam)); } catch (e) { }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || '');
        fetchProfile(session.user.id);
      } else {
        setIsAuthenticated(false);
        setUserEmail('');
        setUserTier('Starter');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle URL Pathname Routing
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/privacy') {
      setView('privacy');
    } else if (path === '/terms') {
      setView('terms');
    } else if (path === '/dashboard') {
      setView('dashboard');
    }
  }, []);




  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      console.log("Fetched Profile Data:", data);
      // Normalize tier names
      let normalizedTier = data.tier || 'Starter';
      if (normalizedTier === 'Gist Pro') normalizedTier = 'Pro';
      if (normalizedTier === 'Gist Enterprise') normalizedTier = 'Enterprise';
      console.log("Setting User Tier to:", normalizedTier);
      setUserTier(normalizedTier as any);
    } else {
      console.warn("No profile found for user:", userId);
      if (error) console.error("Profile fetch error:", error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    const email = userEmail.trim();
    const pass = password.trim();

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: pass,
        });
        if (error) throw error;


        // Initial profile creation (SQL trigger handles this usually, but good to be safe)
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: email,
            tier: 'Starter'
          });

          // If a session was returned (email confirmation off), update local state
          if (data.session) {
            setIsAuthenticated(true);
            setUserEmail(email);
          }
        }

        console.log("Signup successful. pendingTier state:", pendingTier);

        // Direct access for now & Persist
        if (pendingTier !== 'Starter') {
          setUserTier(pendingTier);
          setView('dashboard');
          setDashboardView('workspace');
          if (data.user) {
            await supabase.from('profiles').update({ tier: pendingTier }).eq('id', data.user.id);
          }
        } else {
          if (data.session) setView('dashboard');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: pass,
        });
        if (error) throw error;

        // Fetch profile to see current tier
        const { data: profile } = await supabase.from('profiles').select('tier').eq('id', data.user.id).single();
        const currentTier = profile?.tier || 'Starter';

        // If they requested a higher tier, trigger purchase flow
        if (pendingTier !== 'Starter') {
          handlePurchase(pendingTier);
        } else {
          setView('dashboard');
        }
      }

      setShowAuthModal(false);
      setPassword('');
      // window.location.reload(); // Removed to allow redirection logic to stick
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handlePurchase = (rawTier: string) => {
    let tier: 'Pro' | 'Enterprise' = 'Pro';
    if (rawTier.includes('Enterprise')) tier = 'Enterprise';

    setPendingTier(tier);
    if (!isAuthenticated) {
      setAuthMode('signup');
      setShowAuthModal(true);
    } else {
      // Dodo Payment Redirection
      const paymentUrl = tier === 'Pro'
        ? import.meta.env.VITE_DODO_PAYMENT_LINK_PRO
        : import.meta.env.VITE_DODO_PAYMENT_LINK_ENTERPRISE;

      if (paymentUrl) {
        // Append email to pre-fill if supported or track
        // Dodo might support pre-filling email via query param, attempting standard 'email' or 'customer_email'
        // We also append a redirect_url to come back to the dashboard
        const returnUrl = `${window.location.origin}?payment_success=true`;
        const finalUrl = `${paymentUrl}&customer_email=${encodeURIComponent(userEmail || '')}&redirect_url=${encodeURIComponent(returnUrl)}`;

        console.log(`Redirecting to payment: ${finalUrl}`);
        window.location.href = finalUrl;
      } else {
        alert("Payment link configuration missing. Please check settings.");
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserTier('Starter');
    setHistory([]);
    setView('landing');
  };

  const callSecondaryModel = async (text: string, tone: ToneType, niche: NicheType, apiKey: string) => {
    // 1. Check for xAI (Grok) Key
    if (apiKey.startsWith('xai-')) {
      console.log("Using xAI (Grok)...");
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: [{
            role: 'system',
            content: `You are an expert at simplifying complex ${niche} jargon into plain English. Tone: ${tone}.`
          }, {
            role: 'user',
            content: `Simplify this text in ${targetLanguage} language: "${text}"`
          }],
          model: "grok-beta",
          stream: false,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`xAI Error: ${err}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "No response from Grok.";
    }

    // 2. Default to Groq (Llama-3)
    const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    const chatCompletion = await groq.chat.completions.create({
      messages: [{
        role: 'user',
        content: `Simplify the following ${niche} technical/jargon-heavy text into plain ${targetLanguage} for a layman. Use a ${tone} tone. Keep it concise.
        IMPORTANT: Use ONLY clear text paragraphs and bullet points. NEVER generate Mermaid code, flowcharts, or diagrams.
        Text: "${text}"`
      }],
      model: 'llama-3.3-70b-versatile',
    });
    return chatCompletion.choices[0]?.message?.content || "No response from Groq.";
  };

  const callGeminiWithFallback = async (apiKey: string, prompt: string) => {
    // Try both v1 and v1beta as some keys are restricted to specific versions
    const apiVersions = ['v1', 'v1beta'];
    const modelIds = [
      'models/gemini-1.5-flash',
      'models/gemini-1.5-flash-8b',
      'models/gemini-1.5-pro',
      'models/gemini-pro',
      'models/gemini-1.0-pro',
      'gemini-1.5-flash', // Some SDK versions handle prefixing themselves
      'gemini-2.0-flash-exp'
    ];

    let lastError = "";

    for (const version of apiVersions) {
      const genAI = new GoogleGenerativeAI(apiKey);
      // Note: The SDK doesn't expose a clean way to change version per call easily in old versions,
      // but we can try to use different model strings or initialization if needed.

      for (const modelId of modelIds) {
        try {
          console.log(`Checking Gemini: ${modelId} (${version})`);
          const model = genAI.getGenerativeModel({ model: modelId });
          const result = await model.generateContent(prompt);
          return { text: result.response.text(), usedModel: modelId };
        } catch (e: any) {
          lastError = e.message;
          console.warn(`Gemini ${modelId} failed:`, e.message);
          // If it's a permission error, we should probably stop and tell the user
          if (e.message.includes('API_KEY_INVALID') || e.message.includes('permission')) {
            throw e;
          }
        }
      }
    }
    throw new Error(`Gemini Error: ${lastError}. (TIP: Ensure 'Generative Language API' is enabled in Google Cloud Console if using a GCP key)`);
  };


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Fast re-check for Pro status if authenticated but state is Starter
    let currentTier = userTier;
    if (isAuthenticated && currentTier === 'Starter') {
      const { data } = await supabase.from('profiles').select('tier').eq('id', (await supabase.auth.getUser()).data.user?.id).single();
      if (data) {
        let normalized = data.tier || 'Starter';
        if (normalized === 'Gist Pro') normalized = 'Pro';
        if (normalized === 'Gist Enterprise') normalized = 'Enterprise';
        currentTier = normalized as any;
        setUserTier(currentTier);
      }
    }

    console.log("File Upload Check - Current Tier:", currentTier, "File Name:", file.name, "File Type:", file.type);

    const fileName = file.name.toLowerCase();
    const isDoc = fileName.endsWith('.docx') || fileName.endsWith('.doc');
    const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');

    // Pro Check
    if (currentTier === 'Starter' && (isPdf || isDoc)) {
      setAuthMode('signup');
      setShowAuthModal(true);
      alert("PDF and DOCX analysis is a Pro feature. Please upgrade or login to unlock.");
      return;
    }

    try {
      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }

        setInputText(fullText);
        setDashboardView('workspace');
      }
      else if (isDoc) {
        if (fileName.endsWith('.doc')) {
          alert("Legacy .doc files are not directly supported. Please save as .docx or .pdf for best results.");
          return;
        }
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setInputText(result.value);
        setDashboardView('workspace');
      }
      else if (file.type.startsWith('image/')) {
        // Enterprise Clean Check
        if (userTier !== 'Enterprise') {
          setAuthMode('signup');
          setShowAuthModal(true);
          alert("Stay Ahead with Enterprise: Unlock Image Analysis & OCR.");
          return;
        }

        setInputText("🔍 Scanning Document... (AI OCR in progress)");
        setDashboardView('workspace');

        try {
          const result = await Tesseract.recognize(file, 'eng');
          setInputText(result.data.text);
        } catch (err) {
          console.error(err);
          setInputText("Error: Could not read text from image. Please ensure it is clear.");
        }
      }
      else {
        // Text files
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (text) {
            setInputText(text);
            setDashboardView('workspace');
          }
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("File parsing error:", error);
      alert("Failed to parse file. Please ensure it is a valid text, PDF, or DOCX file.");
    }
  };

  const handleSimplify = async (overrideText?: string) => {
    const currentText = overrideText || inputText;
    if (!currentText) return;

    if (userTier === 'Starter' && usageCount >= 5) {
      setShowLimitModal(true);
      return;
    }

    const model = routeModel(currentText);
    setActiveModel(model);
    setIsSimplifying(true);
    setChatMessages([]); // Reset chat context

    const getSafeKey = (key: any) => {
      if (!key || String(key) === "undefined") return "";
      return String(key).trim().replace(/['"]/g, "");
    };

    const geminiKey = getSafeKey(import.meta.env.VITE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY);
    const groqKey = getSafeKey(import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_XAI_API_KEY || import.meta.env.XAI_API_KEY); // Added extensive search for Grok/xAI key

    console.log("Diagnostics - Key Status:", {
      geminiFound: !!geminiKey,
      geminiPrefix: geminiKey ? geminiKey.substring(0, 4) : 'none',
      groqFound: !!groqKey,
      groqPrefix: groqKey ? groqKey.substring(0, 4) : 'none'
    });

    try {
      // 1. PRIORITIZE SECONDARY MODEL (Grok/xAI) as requested
      // If Grok key exists, use it FIRST.
      if (groqKey && groqKey !== "" && groqKey !== "undefined") {
        console.log("Prioritizing Grok/xAI as requested...");
        try {
          const result = await callSecondaryModel(inputText, selectedTone, selectedNiche, groqKey);
          setOutputText(result);
          saveHistory(result, groqKey.startsWith('xai-') ? 'Grok (xAI)' : 'Groq (Llama-3)');
          setIsSimplifying(false);
          return;
        } catch (primaryError: any) {
          console.warn("Primary (Grok) failed, attempting fallback to Gemini...", primaryError);
          // If Grok fails, fall through to Gemini logic below
        }
      }

      // 2. Try Gemini (Secondary/Fallback now)
      if (!geminiKey || geminiKey === "" || geminiKey === "undefined") {
        if (groqKey && groqKey !== "" && groqKey !== "undefined") {
          // We already tried Grok above and it failed if we are here, so just show error
          const msg = "Simplification failed using Grok key. Please check your key or credit balance.";
          setOutputText(`Error: ${msg}`);
          setIsSimplifying(false);
          return;
        }
        setOutputText("API Key Missing! Please check your .env.local file. It should have VITE_GROQ_API_KEY or VITE_GEMINI_API_KEY. IMPORTANT: Restart the terminal after adding the key.");
        setIsSimplifying(false);
        return;
      }

      try {

        const prompt = `Simplify the following ${selectedNiche} technical/jargon-heavy text into plain ${targetLanguage} for a layman. 
             Maintain a 6th-grade reading level. Break down jargon into everyday metaphors. Use bullet points for readability.
             
             IMPORTANT: NEVER generate Mermaid diagrams, flowcharts, or code blocks. Use ONLY plain text and bullet points.
             
             Text to simplify:
             "${currentText}"`;

        // Use the robust multi-model fallback helper
        const { text, usedModel } = await callGeminiWithFallback(geminiKey, prompt);

        setOutputText(text);
        saveHistory(text, usedModel as ModelType);
      } catch (geminiError: any) {
        console.error("Gemini failed after all retries:", geminiError);
        const geminiMsg = geminiError?.message || String(geminiError);

        // Final Error State
        setOutputText(`All AI Models failed. \nGemini Error: ${geminiMsg}`);
      }
    } catch (error) {
      console.error("Master catch triggered:", error);
      setOutputText("Error: " + (error instanceof Error ? error.message : "Simplification failed."));
    } finally {
      setIsSimplifying(false);
    }
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const handleShare = async (text: string) => {
    if (!text) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Simplified Gist',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: Copy link
      navigator.clipboard.writeText(window.location.href);
      alert("Sharing not supported on this browser. Link copied to clipboard instead!");
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !outputText) return;

    // Enterprise Gate
    if (userTier !== 'Enterprise') {
      setAuthMode('signup');
      setShowAuthModal(true);
      alert("Upgrade to Enterprise for Contextual Chat & Deep Dives.");
      return;
    }

    const newMessage = { role: 'user' as const, content: chatInput };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
    setIsThinking(true);

    try {
      const getSafeKey = (key: any) => (key && String(key) !== "undefined") ? String(key).trim().replace(/['"]/g, "") : "";
      const geminiKey = getSafeKey(import.meta.env.VITE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY);
      const groqKey = getSafeKey(import.meta.env.VITE_GROQ_API_KEY);

      const prompt = `Context Material: "${inputText}"
      Current Gist: "${outputText}"
      
      Chat History: ${chatMessages.map(m => `${m.role}: ${m.content}`).join('\n')}
      
      User Question: "${chatInput}"
      
      As an expert advisor, answer the user's question based on the provided context and gist. Keep it concise (under 3 sentences) and use a helpful, professional tone.`;

      let responseText = "";

      if (geminiKey) {
        try {
          const { text } = await callGeminiWithFallback(geminiKey, prompt);
          responseText = text;
        } catch (geminiErr) {
          console.warn("Gemini chat failed, trying fallback...", geminiErr);
          if (groqKey) {
            responseText = await callSecondaryModel(prompt, selectedTone, selectedNiche, groqKey);
          } else {
            throw geminiErr;
          }
        }
      } else if (groqKey) {
        responseText = await callSecondaryModel(prompt, selectedTone, selectedNiche, groqKey);
      } else {
        throw new Error("No API keys found for chat.");
      }

      setChatMessages(prev => [...prev, { role: 'ai' as const, content: responseText }]);
    } catch (err) {
      console.error("Chat Error:", err);
      setChatMessages(prev => [...prev, { role: 'ai' as const, content: "Enterprise API is currently busy or keys are missing. Please check your .env.local and try again." }]);
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    setOutputText('');
    setInputText('');
  }, [selectedNiche, view]);

  const renderTeam = () => (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black">Team Management</h3>
          <p className="opacity-60 text-sm mt-1">Manage up to 10 team members in your Enterprise workspace.</p>
        </div>
        <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
          {teamMembers.length} / 10 Slots Used
        </div>
      </div>

      <div className={`p-8 rounded-[2.5rem] border-2 mb-8 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100'}`}>
        <h4 className="text-lg font-black mb-6">Invite New Member</h4>
        <div className="flex gap-4">
          <input
            type="email"
            value={teamEmailInput}
            onChange={(e) => setTeamEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('invite-btn')?.click()}
            placeholder="colleague@company.com"
            className={`flex-1 px-6 py-4 rounded-2xl border-2 bg-transparent focus:outline-none transition-all ${isDarkMode ? 'border-slate-800 focus:border-indigo-500/50 text-white' : 'border-slate-100 focus:border-indigo-200 text-slate-900'}`}
          />
          <button
            id="invite-btn"
            onClick={async () => {
              if (!teamEmailInput.trim()) return;
              const emailToAdd = teamEmailInput.trim();

              if (teamMembers.length >= 10) {
                alert("Team limit reached. Upgrade to custom plan for more users.");
                return;
              }
              if (teamMembers.find(m => m.email === emailToAdd)) {
                alert("User already in team.");
                return;
              }

              // Admin Update Logic
              const adminKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
              if (!adminKey) {
                alert("Configuration Error: Missing Admin Key.");
                return;
              }

              try {
                // 1. Upgrade the user in DB
                const supabaseAdmin = createClient(import.meta.env.VITE_SUPABASE_URL, adminKey);

                // Find user profile
                const { data: profiles, error: findError } = await supabaseAdmin
                  .from('profiles')
                  .select('id, email')
                  .eq('email', emailToAdd);

                if (findError || !profiles || profiles.length === 0) {
                  alert("User not found! Please ask them to sign up for a free Gist account first.");
                  return;
                }

                const targetUserId = profiles[0].id;

                // Update tier
                const { error: updateError } = await supabaseAdmin
                  .from('profiles')
                  .update({ tier: 'Enterprise' })
                  .eq('id', targetUserId);

                if (updateError) {
                  console.error("Invite Error:", updateError);
                  alert("Failed to upgrade user. Please try again.");
                  return;
                }

                // 2. Update Local State & Persist List (LocalStorage for MVP)
                const newMember = { email: emailToAdd, role: 'Member' };
                const newList = [...teamMembers, newMember];
                setTeamMembers(newList);
                localStorage.setItem('gist_team_list', JSON.stringify(newList));
                setTeamEmailInput('');
                alert(`${emailToAdd} has been upgraded to Enterprise!`);

              } catch (err) {
                console.error("Invite Exception:", err);
                alert("An unexpected error occurred.");
              }
            }}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/30"
          >
            {isAuthLoading ? 'Adding...' : 'Invite'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-black uppercase tracking-widest opacity-40 px-4">Active Members</h4>
        {teamMembers.length === 0 ? (
          <div className={`p-12 rounded-[2.5rem] border-2 border-dashed text-center ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="opacity-40 italic">No team members added yet.</p>
          </div>
        ) : (
          teamMembers.map((member, idx) => (
            <div key={idx} className={`flex items-center justify-between p-6 rounded-[2rem] border-2 ${isDarkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-white border-slate-50'}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                  {member.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold">{member.email}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{member.role}</p>
                </div>
              </div>
              <button
                onClick={() => setTeamMembers(prev => prev.filter((_, i) => i !== idx))}
                className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );



  const renderDashboard = () => (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'bg-[#020617]' : 'bg-slate-50'}`}>
      <aside className={`w-20 lg:w-72 border-r flex flex-col transition-all duration-500 z-50 ${isDarkMode ? 'bg-slate-950/40 border-slate-800/50' : 'bg-white border-slate-200'}`}>
        <div className="p-6 h-20 flex items-center justify-center lg:justify-start gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 p-2 rounded-xl scale-110">
            <Zap className="w-5 h-5 text-white fill-current" />
          </div>
          <span className="text-2xl font-black tracking-tighter hidden lg:block">babysimple</span>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: 'workspace', icon: <LayoutDashboard className="w-6 h-6" />, label: 'Workspace' },
            { id: 'history', icon: <History className="w-6 h-6" />, label: 'History' },
            { id: 'files', icon: <FileText className="w-6 h-6" />, label: 'Files' },
            { id: 'usage', icon: <Activity className="w-6 h-6" />, label: 'Insights' },
            ...(userTier === 'Enterprise' ? [{ id: 'team', icon: <Users className="w-6 h-6" />, label: 'Team' }] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDashboardView(item.id as any)}
              className={`w-full flex items-center justify-center lg:justify-start gap-4 p-4 rounded-2xl transition-all ${dashboardView === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : isDarkMode ? 'text-slate-500 hover:bg-slate-900 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
            >
              {item.icon}
              <span className="font-bold hidden lg:block">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800/20 space-y-2">
          {userTier === 'Pro' && (
            <button
              onClick={() => { setPendingTier('Enterprise'); handlePurchase('Enterprise'); }}
              className="w-full mb-4 group relative overflow-hidden flex items-center justify-center lg:justify-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white font-black shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all"
            >
              <Zap className="w-6 h-6 fill-current" />
              <div className="hidden lg:block text-left">
                <p className="text-[10px] uppercase tracking-widest opacity-80 leading-none mb-1">Limited Offer</p>
                <p className="text-sm font-black uppercase">Go Enterprise</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto hidden lg:block group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          {userTier === 'Enterprise' && (
            <div className={`flex items-center gap-3 p-4 rounded-2xl ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <ShieldCheck className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Admin Active</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center lg:justify-start gap-4 p-4 rounded-2xl transition-all ${isDarkMode ? 'text-slate-500 hover:bg-red-500/10 hover:text-red-400' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'}`}
          >
            <LogOut className="w-6 h-6" />
            <span className="font-bold hidden lg:block">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 lg:p-12 relative">
        <header className="flex items-center justify-between mb-12 flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setView('landing')}
              className={`p-3 rounded-full transition-all flex items-center justify-center border ${isDarkMode ? 'hover:bg-slate-900 border-slate-800 text-slate-400' : 'hover:bg-slate-100 border-slate-200 text-slate-600'}`}
              title="Return to Site"
            >
              <ArrowRight className="w-6 h-6 rotate-180" />
            </button>
            <div>
              <div className="flex items-center gap-4 mb-1">
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">{userTier} Workspace</h1>
                {userTier === 'Starter' && isAuthenticated && (
                  <button
                    onClick={() => (supabase.auth.getUser()).then(({ data }) => data.user && fetchProfile(data.user.id))}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full hover:bg-indigo-500/20 transition-all pointer-events-auto"
                  >
                    <Zap className="w-3 h-3" /> Sync Plan
                  </button>
                )}
              </div>
              <p className="opacity-40 font-bold uppercase tracking-[0.2em] text-[10px]">Active Session & Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-slate-900 text-yellow-500' : 'bg-white shadow-sm border text-slate-600 hover:bg-slate-50'}`}>
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {dashboardView === 'workspace' && (
          <div className="grid lg:grid-cols-12 gap-10">

            <div className="lg:col-span-12 xl:col-span-8 space-y-8">
              <div className="flex flex-wrap gap-3">
                {TONES.map(tone => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={`px-6 py-3 rounded-2xl font-bold transition-all border-2 ${selectedTone === tone.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/30' : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-100'}`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>

              <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/50' : 'bg-white border-slate-100'}`}>
                <Globe className="w-5 h-5 text-indigo-500" />
                <span className="text-sm font-bold">Output Language:</span>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className={`flex-1 border-none outline-none font-bold cursor-pointer px-2 py-1 rounded ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}
                >
                  <option value="English" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>English</option>
                  <option value="Hindi" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>हिंदी (Hindi)</option>
                  <option value="Spanish" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>Español (Spanish)</option>
                  <option value="French" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>Français (French)</option>
                  <option value="German" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>Deutsch (German)</option>
                  <option value="Portuguese" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>Português (Portuguese)</option>
                  <option value="Arabic" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>العربية (Arabic)</option>
                  <option value="Chinese" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>中文 (Chinese)</option>
                  <option value="Japanese" className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>日本語 (Japanese)</option>
                </select>
              </div>

              <div className={`rounded-[3rem] p-8 border-2 ${isDarkMode ? 'bg-slate-950/40 border-slate-800/50' : 'bg-white border-slate-100 shadow-sm'}`}>
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    const text = e.target.value;
                    if (text.length <= getCharacterLimit()) {
                      setInputText(text);
                    }
                  }}
                  placeholder="Paste your materials here..."
                  maxLength={getCharacterLimit()}
                  className="w-full h-64 bg-transparent resize-none focus:outline-none text-xl leading-relaxed"
                ></textarea>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <span className={`text-xs font-black uppercase tracking-widest ${inputText.length >= getCharacterLimit() ? 'text-red-500' : 'text-slate-500'}`}>{inputText.length} / {getCharacterLimit().toLocaleString()} Characters</span>
                  <button
                    onClick={handleSimplify}
                    disabled={!inputText || isSimplifying}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-[2rem] text-xl font-black shadow-2xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                  >
                    {isSimplifying ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <Wand2 className="w-6 h-6" />}
                    {isSimplifying ? 'Refining...' : 'Generate Gist'}
                  </button>
                </div>
              </div>

              {outputText && (
                <div className={`rounded-[3rem] p-10 border-2 animate-in fade-in slide-in-from-bottom-8 duration-700 overflow-hidden ${isDarkMode ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-50' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`}>
                  <div className="flex items-center justify-between mb-8 text-emerald-500">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5" />
                      <span className="text-xs font-black uppercase tracking-widest">Output Gist</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleCopy(outputText)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><Copy className="w-5 h-5" /></button>
                      <button onClick={() => handleShare(outputText)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><Share2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {renderOutput(outputText)}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6" style={{ display: view === 'dashboard' ? 'flex' : 'none' }}>
              {(userTier === 'Enterprise' || userTier === 'Pro') && outputText && (
                <div className={`rounded-[3rem] p-8 border-2 flex flex-col flex-1 overflow-hidden min-h-[400px] ${isDarkMode ? 'bg-slate-900/60 border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)]' : 'bg-white border-slate-100 shadow-xl'}`}>
                  <div className="flex items-center gap-3 mb-6 shrink-0">
                    <Zap className="w-5 h-5 text-indigo-500" />
                    <h4 className="text-lg font-black uppercase tracking-tight">Deep Dive Chat</h4>
                  </div>

                  <div className="flex-1 space-y-4 mb-6 overflow-y-auto pr-2 custom-scrollbar">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-10 opacity-30 italic text-sm">
                        Ask follow-up questions to understand specific parts better.
                      </div>
                    )}
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] p-4 rounded-3xl ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-md' : isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100 text-slate-900'}`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isThinking && (
                      <div className="flex justify-start">
                        <div className={`p-4 rounded-3xl flex items-center gap-3 ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                          <div className="flex gap-1">
                            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
                            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                      placeholder="Ask questions..."
                      className={`flex-1 px-5 py-4 rounded-2xl border-2 outline-none transition-all text-sm ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'}`}
                    />
                    <button
                      onClick={handleChatSubmit}
                      disabled={isThinking || !chatInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              <div className={`rounded-[3rem] border-2 flex flex-col flex-1 overflow-hidden min-h-0 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/50' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="p-8 border-b border-white/5 flex items-center justify-between font-black uppercase tracking-tighter shrink-0">
                  <h3>Session History</h3>
                  <span className="bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-lg text-xs">{history.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50 space-y-4">
                      <History className="w-12 h-12" />
                      <p className="font-bold">No active gists.</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} onClick={() => {
                        setSelectedHistoryItem(item);
                        setInputText(item.input);
                        setOutputText(item.output);
                        setChatMessages([]);
                      }} className={`p-6 rounded-[2rem] border transition-all cursor-pointer group ${isDarkMode ? 'bg-slate-950/40 border-slate-800/50 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}>
                        <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-[0.2em]">
                          <span className="text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm font-bold line-clamp-2 mb-2 group-hover:text-indigo-400 transition-colors">{item.input}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div >
        )}

        {
          dashboardView === 'history' && (
            <div className="space-y-8">
              {!selectedHistoryItem ? (
                <div className={`transition-all duration-500 ${userTier === 'Enterprise' ? 'max-w-none' : 'max-w-5xl'}`}>
                  <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                    <History className="w-8 h-8 text-indigo-500" />
                    Your History
                  </h3>
                  <div className={`grid gap-6 ${userTier === 'Enterprise' ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                    {history.length === 0 ? (
                      <div className={`col-span-full p-12 rounded-3xl border-2 text-center ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-bold opacity-50">No history yet. Start simplifying to see your past work here!</p>
                        <p className="text-sm opacity-30 mt-2">History is saved locally in your browser</p>
                      </div>
                    ) : (
                      history.map((item) => (
                        <div key={item.id} onClick={() => {
                          setSelectedHistoryItem(item);
                          setInputText(item.input);
                          setOutputText(item.output);
                          setChatMessages([]);
                        }} className={`p-6 rounded-3xl border-2 cursor-pointer ${isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-100 hover:border-indigo-200'} transition-all group relative overflow-hidden`}>
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{new Date(item.timestamp).toLocaleDateString()}</span>
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                          <p className="text-sm font-bold line-clamp-3 opacity-80 leading-relaxed">{item.input}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <header className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => setSelectedHistoryItem(null)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-tight text-xs border-2 transition-all ${isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      Back to History
                    </button>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Created on</div>
                      <div className="text-sm font-bold">{new Date(selectedHistoryItem.timestamp).toLocaleString()}</div>
                    </div>
                  </header>

                  <div className="grid lg:grid-cols-12 gap-8 items-start">
                    {/* Left: Content Reader */}
                    <div className={`${(userTier === 'Enterprise' || userTier === 'Pro') ? 'lg:col-span-8' : 'lg:col-span-12'} rounded-[3rem] border-2 overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <div className="p-8 border-b border-indigo-500/10 flex items-center justify-between bg-indigo-500/5">
                        <div className="flex items-center gap-3">
                          <FileText className="w-6 h-6 text-indigo-500" />
                          <h3 className="text-xl font-black uppercase tracking-tight">Simplified Gist</h3>
                        </div>
                      </div>
                      <div className="p-10 overflow-y-auto custom-scrollbar h-[calc(100vh-320px)] min-h-[500px]">
                        <div className="prose prose-indigo max-w-none dark:prose-invert">
                          {renderOutput(selectedHistoryItem.output)}
                        </div>
                      </div>
                    </div>

                    {/* Right: Gist Analysis Chat */}
                    {(userTier === 'Enterprise' || userTier === 'Pro') && (
                      <div className="lg:col-span-4 lg:sticky lg:top-8">
                        <div className={`rounded-[3rem] p-8 border-2 flex flex-col overflow-hidden h-[calc(100vh-120px)] min-h-[600px] ${isDarkMode ? 'bg-slate-900/60 border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)]' : 'bg-white border-slate-100 shadow-xl'}`}>
                          <div className="flex flex-col gap-4 mb-8 shrink-0">
                            <div className="flex items-center gap-3">
                              <Zap className="w-6 h-6 text-indigo-500" />
                              <h4 className="text-xl font-black uppercase tracking-tight">Gist Analysis</h4>
                            </div>
                            <div className="bg-indigo-500/10 text-indigo-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit">
                              Interactive Chat
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 space-y-4 mb-6 overflow-y-auto pr-2 custom-scrollbar">
                              {chatMessages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 italic px-4">
                                  <Sparkles className="w-8 h-8 mb-4" />
                                  <p className="text-sm">Ask follow-up questions about this gist while you read.</p>
                                </div>
                              )}
                              {chatMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[90%] p-4 rounded-3xl ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-md' : isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100 text-slate-900'}`}>
                                    <p className="text-xs leading-relaxed">{msg.content}</p>
                                  </div>
                                </div>
                              ))}
                              {isThinking && (
                                <div className="flex justify-start">
                                  <div className={`p-4 rounded-3xl flex items-center gap-3 ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                                    <div className="flex gap-1">
                                      <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
                                      <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                      <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 shrink-0">
                              <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                                placeholder="Ask follow-up..."
                                className={`flex-1 px-5 py-4 rounded-2xl border-2 outline-none transition-all text-sm ${isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'}`}
                              />
                              <button
                                onClick={handleChatSubmit}
                                disabled={isThinking || !chatInput.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                              >
                                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        }

        {
          dashboardView === 'files' && (
            <div className="max-w-5xl">
              <h3 className="text-2xl font-black mb-8">File Upload</h3>
              <div className={`p-16 rounded-3xl border-2 border-dashed text-center transition-all ${isDarkMode ? 'bg-slate-900/40 border-slate-700 hover:border-indigo-500' : 'bg-slate-50 border-slate-300 hover:border-indigo-400'}`}>
                <FileText className="w-20 h-20 mx-auto mb-6 opacity-30" />
                <h4 className="text-xl font-black mb-2">Upload Document</h4>
                <p className="opacity-60 max-w-md mx-auto mb-8">Upload documents (PDF, DOCX, TXT) for instant simplification.</p>

                <div className="relative inline-block">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".txt,.md,.json,.csv,.pdf,.docx,.doc,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                  />
                  <label
                    htmlFor="file-upload"
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold cursor-pointer transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-3"
                  >
                    <FileText className="w-5 h-5" />
                    Select File
                  </label>
                </div>
              </div>
            </div>
          )
        }
        {
          dashboardView === 'usage' && (
            <div className="max-w-5xl">
              <h3 className="text-2xl font-black mb-8">Usage Insights</h3>
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className={`p-6 rounded-3xl border-2 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <Activity className="w-8 h-8 text-indigo-500 mb-4" />
                  <p className="text-3xl font-black mb-2">{history.length}</p>
                  <p className="text-sm opacity-60">Total Simplifications</p>
                </div>
                <div className={`p-6 rounded-3xl border-2 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <Zap className="w-8 h-8 text-emerald-500 mb-4" />
                  <p className="text-3xl font-black mb-2">{userTier}</p>
                  <p className="text-sm opacity-60">Current Plan</p>
                </div>
                <div className={`p-6 rounded-3xl border-2 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <Globe className="w-8 h-8 text-fuchsia-500 mb-4" />
                  <p className="text-3xl font-black mb-2">{targetLanguage}</p>
                  <p className="text-sm opacity-60">Active Language</p>
                </div>
              </div>
              <div className={`p-8 rounded-3xl border-2 ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100'}`}>
                <h4 className="text-lg font-black mb-4">Account Info</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="opacity-60">Email</span>
                    <span className="font-bold">{userEmail || 'Not set'}</span>
                  </div>
                </div>
              </div>

              {userTier === 'Pro' && (
                <div className={`mt-8 p-10 rounded-[3rem] border-2 bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-500 border-transparent shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-md">
                        <Zap className="w-10 h-10 text-white fill-current animate-pulse" />
                      </div>
                      <div className="text-white">
                        <h4 className="text-3xl font-[900] tracking-tighter mb-2 italic">Scale Your Clarity.</h4>
                        <p className="font-bold opacity-90 text-lg uppercase tracking-widest text-sm">Unlock Enterprise Chat, OCR, and Team Collaboration.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPendingTier('Enterprise');
                        handlePurchase('Enterprise');
                      }}
                      className="px-10 py-5 bg-white text-indigo-600 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-95"
                    >
                      UPGRADE TO ENTERPRISE <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}


            </div>
          )
        }
        {
          dashboardView === 'team' && userTier === 'Enterprise' && renderTeam()
        }

      </main >

      {/* History Modal */}
      {
        selectedHistoryItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedHistoryItem(null)}>
            <div className={`w-full max-w-6xl h-[85vh] flex flex-col rounded-3xl p-8 shadow-2xl border-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 shrink-0">
                <span className="opacity-50 font-bold">{new Date(selectedHistoryItem.timestamp).toLocaleString()}</span>
                <button onClick={() => setSelectedHistoryItem(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-8 h-full overflow-hidden">
                <div className="flex flex-col h-full overflow-hidden">
                  <h4 className="shrink-0 text-sm font-black opacity-50 mb-3 uppercase tracking-widest">Original Text</h4>
                  <div className={`p-6 rounded-2xl h-full overflow-y-auto ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap text-sm">{selectedHistoryItem.input}</p>
                  </div>
                </div>
                <div className="flex flex-col h-full overflow-hidden">
                  <h4 className="shrink-0 text-sm font-black opacity-50 mb-3 uppercase tracking-widest text-emerald-500">Simplified</h4>
                  <div className={`p-6 rounded-2xl h-full overflow-y-auto border-2 ${isDarkMode ? 'bg-slate-950/50 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-100'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap text-emerald-500 font-medium">{selectedHistoryItem.output}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );

  const renderPrivacyPolicy = () => (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#020617] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b ${isDarkMode ? 'bg-slate-950/60 border-slate-800/50' : 'bg-white/60 border-slate-200/50'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('landing')}>
            <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 p-2 rounded-xl group-hover:rotate-12 transition-all">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter">babysimple</span>
          </div>
          <button onClick={() => setView('landing')} className="text-sm font-bold hover:text-indigo-500 transition-colors">← Back to Home</button>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-5xl font-black mb-8 tracking-tight">Privacy Policy</h1>
        <p className="text-sm opacity-50 mb-12">Last Updated: January 11, 2026</p>

        <div className="space-y-8 text-lg leading-relaxed">
          <section>
            <h2 className="text-2xl font-black mb-4">1. Information We Collect</h2>
            <p className="opacity-80">We collect information you provide directly to us when using Gist, including text you submit for simplification. We do not store your simplified content permanently unless you are a Pro or Enterprise user with history enabled.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">2. How We Use Your Information</h2>
            <p className="opacity-80">Your information is used solely to provide and improve our text simplification services. We process your text through advanced AI models to generate simplified outputs. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">3. Data Storage and Security</h2>
            <p className="opacity-80">Free tier users: Your data is processed in real-time and not stored. Pro/Enterprise users: Session history is stored locally in your browser using localStorage. We implement industry-standard security measures to protect your information.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">4. Third-Party Services</h2>
            <p className="opacity-80">We use trusted third-party AI services to process your text. These services have their own privacy policies which govern their data handling.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">5. Your Rights</h2>
            <p className="opacity-80">You have the right to access, correct, or delete your personal information. For free tier users, no data is stored. Pro/Enterprise users can clear their history at any time through the dashboard.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">6. Contact Us</h2>
            <p className="opacity-80">If you have questions about this Privacy Policy, please contact us at privacy@gist.ai</p>
          </section>
        </div>
      </div>
    </div>
  );

  const renderTermsAndConditions = () => (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#020617] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b ${isDarkMode ? 'bg-slate-950/60 border-slate-800/50' : 'bg-white/60 border-slate-200/50'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('landing')}>
            <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 p-2 rounded-xl group-hover:rotate-12 transition-all">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter">babysimple<span className="text-indigo-500">.</span></span>
          </div>
          <button onClick={() => setView('landing')} className="text-sm font-bold hover:text-indigo-500 transition-colors">← Back to Home</button>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-5xl font-black mb-8 tracking-tight">Terms & Conditions</h1>
        <p className="text-sm opacity-50 mb-12">Last Updated: January 11, 2026</p>

        <div className="space-y-8 text-lg leading-relaxed">
          <section>
            <h2 className="text-2xl font-black mb-4">1. Acceptance of Terms</h2>
            <p className="opacity-80">By accessing and using Gist, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">2. Service Description</h2>
            <p className="opacity-80">Gist is an AI-powered text simplification platform that converts complex jargon into plain language. We offer three tiers: Starter (free), Pro, and Enterprise, each with different features and usage limits.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">3. User Responsibilities</h2>
            <p className="opacity-80">You are responsible for the content you submit to Gist. You must not submit illegal, harmful, or copyrighted content without permission. You agree to use the service only for lawful purposes.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">4. Usage Limits</h2>
            <p className="opacity-80">Free tier users are limited to 5 simplifications per day. Pro and Enterprise users have unlimited usage. We reserve the right to modify these limits with notice.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">5. Intellectual Property</h2>
            <p className="opacity-80">You retain all rights to the content you submit. The simplified output generated by Gist is provided to you for your use. Gist and its branding are the intellectual property of Gist AI Systems.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">6. Disclaimer of Warranties</h2>
            <p className="opacity-80">Gist is provided "as is" without warranties of any kind. While we strive for accuracy, we do not guarantee that simplified outputs will be error-free or suitable for all purposes. Use at your own discretion.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">7. Limitation of Liability</h2>
            <p className="opacity-80">Gist AI Systems shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount you paid for the service in the past 12 months.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">8. Termination</h2>
            <p className="opacity-80">We reserve the right to terminate or suspend your access to Gist at any time for violation of these terms or for any other reason at our discretion.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">9. Changes to Terms</h2>
            <p className="opacity-80">We may update these Terms and Conditions from time to time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">10. Contact Information</h2>
            <p className="opacity-80">For questions about these Terms, please contact us at legal@gist.ai</p>
          </section>
        </div>
      </div>
    </div>
  );

  // Dynamic SEO Title based on View
  const getCharacterLimit = () => {
    switch (userTier) {
      case 'Enterprise': return 25000;
      case 'Pro': return 5000;
      default: return 800;
    }
  };
  const getPageTitle = () => {
    switch (view) {
      case 'dashboard': return 'Dashboard | babysimple';
      case 'privacy': return 'Privacy Policy | babysimple';
      case 'terms': return 'Terms & Conditions | babysimple';
      default: return 'babysimple - Everything is Simpler';
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-700 ease-in-out selection:bg-indigo-500 selection:text-white ${isDarkMode ? 'bg-[#020617] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <SEO title={getPageTitle()} />
      <SchemaMarkup />
      {view === 'privacy' ? renderPrivacyPolicy() : view === 'terms' ? renderTermsAndConditions() : view === 'dashboard' ? renderDashboard() : (
        <>
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className={`absolute -top-[20%] -left-[10%] w-[60%] h-[60%] blur-[120px] opacity-40 animate-pulse ${isDarkMode ? 'bg-indigo-600' : 'bg-blue-200'}`}></div>
            <div className={`absolute top-[10%] -right-[15%] w-[50%] h-[50%] blur-[120px] opacity-30 ${isDarkMode ? 'bg-fuchsia-700' : 'bg-pink-100'}`}></div>
          </div>

          <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-all duration-500 ${isDarkMode ? 'bg-slate-950/60 border-slate-800/50' : 'bg-white/60 border-slate-200/50'}`}>
            <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center relative">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('landing')}>
                <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 p-2 rounded-xl group-hover:rotate-12 transition-all">
                  <Zap className="w-5 h-5 text-white fill-current" />
                </div>
                <span className="text-2xl font-black tracking-tighter">babysimple</span>
              </div>

              {/* Centered Navigation Links */}
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center space-x-10">
                {['Features', 'Simulator', 'Pricing'].map((item) => (
                  <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold hover:text-indigo-500 transition-colors relative group uppercase tracking-widest">
                    {item}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all group-hover:w-full"></span>
                  </a>
                ))}
              </div>

              {/* Right Side: Auth & Theme */}
              <div className="hidden md:flex items-center space-x-6">
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      if (pendingTier !== 'Starter' && userTier === 'Starter' && userEmail) {
                        // User is in the middle of a purchase
                        handlePurchase(pendingTier as any);
                      } else if (pendingTier !== 'Starter' && userTier === 'Starter' && !userEmail) {
                        // Fallback: If we somehow don't have an email but they are in a purchase flow
                        setAuthMode('signup');
                        setShowAuthModal(true);
                      } else {
                        setView('dashboard');
                      }
                    }}
                    className={`flex items-center gap-2.5 px-6 py-2 rounded-2xl font-black uppercase tracking-tighter transition-all group ${isDarkMode ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:scale-105'}`}
                  >
                    <span className="text-[10px]">{pendingTier !== 'Starter' && userTier === 'Starter' ? 'Pay to Unlock' : 'Workspace'}</span>
                    <Zap className={`w-4 h-4 ${pendingTier !== 'Starter' && userTier === 'Starter' ? 'animate-pulse text-yellow-500' : 'hidden'}`} />
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => { setAuthMode('login'); setShowAuthModal(true); setPendingTier('Starter'); }}
                      className="text-sm font-black uppercase tracking-widest hover:text-indigo-500 transition-colors"
                    >
                      Login
                    </button>
                  </div>
                )}

                <button onClick={toggleTheme} className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-slate-900 text-yellow-500 hover:bg-slate-800' : 'bg-white shadow-sm border text-slate-600 hover:bg-slate-50'}`}>
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>

              <div className="md:hidden flex items-center gap-4">
                {isAuthenticated && (
                  <button
                    onClick={() => setView('dashboard')}
                    className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </button>
                )}
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">{isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}</button>
              </div>
            </div>

            {isMenuOpen && (
              <div className={`md:hidden p-6 border-t animate-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="flex flex-col space-y-6 font-black uppercase tracking-widest">
                  {['Features', 'Simulator', 'Pricing'].map(item => (
                    <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setIsMenuOpen(false)}>{item}</a>
                  ))}
                  {isAuthenticated ? (
                    <button
                      onClick={() => {
                        if (pendingTier !== 'Starter' && userTier === 'Starter') {
                          handlePurchase(pendingTier as any);
                        } else {
                          setView('dashboard');
                        }
                        setIsMenuOpen(false);
                      }}
                      className="bg-indigo-600 text-white w-full py-4 rounded-2xl text-center shadow-indigo-600/20 shadow-xl font-black uppercase tracking-widest flex items-center justify-center gap-3"
                    >
                      <span>{pendingTier !== 'Starter' && userTier === 'Starter' ? 'Pay to Unlock' : 'Workspace'}</span>
                      <Zap className={`w-4 h-4 ${pendingTier !== 'Starter' && userTier === 'Starter' ? 'animate-pulse text-yellow-500' : 'hidden'}`} />
                    </button>
                  ) : (
                    <>
                      <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); setIsMenuOpen(false); }} className="text-left py-2">Login</button>
                      <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="bg-indigo-600 text-white w-full py-4 rounded-2xl text-center shadow-indigo-600/20 shadow-xl">Try Pro</a>
                    </>
                  )}
                </div>
              </div>
            )}
          </nav>

          <section className="relative pt-32 pb-24 px-6 text-center">
            <div className="max-w-6xl mx-auto">
              <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black mb-10 border transition-all hover:scale-105 ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                <span className="uppercase tracking-[0.3em]">Precision-Engineered Clarity</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-[900] tracking-tighter mb-8 leading-[0.95]">
                Everything is <br className="hidden md:block" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400">clearer with babysimple.</span>
              </h1>
              <p className={`text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed font-medium transition-opacity ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Tired of corporate doublespeak and dense legal jargon? <br className="hidden md:block" />
                We translate the complex into the everyday, instantly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <a href="#simulator" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-[2rem] text-xl font-black shadow-2xl shadow-indigo-500/30 transition-all hover:scale-110 active:scale-95 flex items-center justify-center gap-3">
                  Start Gistifying <ArrowRight className="w-6 h-6" />
                </a>
                <a href="#simulator" className={`w-full sm:w-auto px-10 py-5 rounded-[2rem] text-xl font-black transition-all hover:scale-110 active:scale-95 border-2 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'} flex items-center justify-center`}>
                  Watch Demo
                </a>
              </div>

              <div className="mt-24 max-w-2xl mx-auto flex flex-col items-center">
                <h4 className={`text-[10px] font-black uppercase tracking-[0.4em] mb-8 ${isDarkMode ? 'text-slate-500/80' : 'text-slate-400'}`}>
                  Stay in the loop & join our community
                </h4>

                <div className={`w-full flex p-2 rounded-[2.5rem] border-2 mb-12 items-center transition-all duration-500 shadow-2xl ${isDarkMode ? 'bg-slate-900/40 border-slate-800 focus-within:border-indigo-500/50 shadow-indigo-500/5' : 'bg-white border-slate-100 focus-within:border-indigo-200 shadow-slate-200'}`}>
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 bg-transparent px-8 py-4 outline-none text-sm font-bold placeholder:opacity-40"
                  />
                  <button onClick={handleNewsletterSubscribe} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-[1.8rem] font-black text-sm transition-all active:scale-95 shadow-xl shadow-indigo-600/20 uppercase tracking-widest">
                    Subscribe
                  </button>
                </div>

                <div className="flex items-center justify-center gap-5">
                  {[
                    {
                      icon: (
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18.8943 4.34399C17.5183 3.71467 16.057 3.256 14.5317 3C14.3396 3.33067 14.1263 3.77866 13.977 4.13067C12.3546 3.89599 10.7439 3.89599 9.14391 4.13067C8.99457 3.77866 8.77056 3.33067 8.58922 3C7.05325 3.256 5.59191 3.71467 4.22552 4.34399C1.46286 8.41865 0.716188 12.3973 1.08952 16.3226C2.92418 17.6559 4.69486 18.4666 6.4346 19C6.86126 18.424 7.24527 17.8053 7.57594 17.1546C6.9466 16.92 6.34927 16.632 5.77327 16.2906C5.9226 16.184 6.07194 16.0667 6.21061 15.9493C9.68793 17.5387 13.4543 17.5387 13.4543 17.5387C13.5855 17.6534 13.7314 17.7663 13.8814 17.8773C13.2982 18.2198 12.6934 18.5103 12.0641 18.7506C12.3947 19.4013 12.7787 20.02 13.2054 20.596C14.9451 20.0626 16.7158 19.2519 18.5505 17.9186C18.9238 13.9933 18.1771 10.0146 15.4145 5.93999L18.8943 4.34399ZM8.5539 12.8719C7.49191 12.8719 6.62125 11.8906 6.62125 10.6866C6.62125 9.48265 7.47058 8.49865 8.5539 8.49865C9.64655 8.49865 10.5052 9.49332 10.4839 10.6866C10.4839 11.8906 9.63724 12.8719 8.5539 12.8719ZM15.0866 12.8719C14.0246 12.8719 13.1539 11.8906 13.1539 10.6866C13.1539 9.48265 14.0033 8.49865 15.0866 8.49865C16.1793 8.49865 17.0379 9.49332 17.0166 10.6866C17.0166 11.8906 16.1699 12.8719 15.0866 12.8719Z" />
                        </svg>
                      ),
                      url: "https://discord.com/invite/ZZx3cBrx2",
                      label: "Discord"
                    },
                    {
                      icon: (
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                          <path d="M15 3.604H1v1.891h14v-1.89ZM1 7.208V16l7-3.926L15 16V7.208zM15 0H1v1.89h14z" />
                        </svg>
                      ),
                      url: "https://entrextlabs.substack.com/subscribe",
                      label: "Substack"
                    },
                    { icon: <Linkedin className="w-5 h-5" />, url: "https://www.linkedin.com/company/entrext/", label: "LinkedIn" },
                    {
                      icon: (
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.0851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334" />
                        </svg>
                      ),
                      url: "https://www.instagram.com/entrext.labs/#",
                      label: "Instagram"
                    }
                  ].map((social, i) => (
                    <a
                      key={i}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-14 h-14 flex items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-indigo-500/50 shadow-black/20' : 'bg-white border-slate-100 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 shadow-slate-200'}`}
                      aria-label={social.label}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="simulator" className="py-24 px-6 relative">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">One Tool, <span className="text-indigo-500 italic">Unlimited</span> Contexts</h2>
                <p className={`text-lg max-w-2xl mx-auto opacity-60 font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  From medical reports to technical docs, we've got you covered.
                </p>
                <div className="flex flex-wrap justify-center gap-4 mt-12">
                  {NICHES.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setSelectedNiche(n.id)}
                      className={`px-8 py-4 rounded-[1.5rem] font-black transition-all border-2 text-sm ${selectedNiche === n.id ? 'bg-indigo-600 text-white border-indigo-400 shadow-2xl shadow-indigo-500/40 scale-110' : isDarkMode ? 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200'}`}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`rounded-[3rem] p-1 transition-all duration-700 bg-gradient-to-br ${isDarkMode ? 'from-indigo-500/30 via-fuchsia-500/20 to-cyan-500/30' : 'from-indigo-100 via-fuchsia-50 to-cyan-100'} group hover:shadow-[0_0_100px_rgba(99,102,241,0.2)]`}>
                <div className={`rounded-[2.95rem] p-8 md:p-12 flex flex-col lg:flex-row gap-12 ${isDarkMode ? 'bg-[#0a0f1e]/90 backdrop-blur-3xl shadow-inner' : 'bg-white/90 backdrop-blur-3xl shadow-xl shadow-slate-200'}`}>
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-6 font-black uppercase text-indigo-500 text-xs tracking-[0.3em]"><Layers className="w-5 h-5" /> Source Material</div>
                    <textarea
                      value={inputText}
                      onChange={e => {
                        const text = e.target.value;
                        const limit = userTier === 'Enterprise' ? 25000 : userTier === 'Pro' ? 5000 : 800;
                        if (text.length <= limit) {
                          setInputText(text);
                        }
                      }}
                      placeholder={activeNiche.placeholder}
                      maxLength={userTier === 'Enterprise' ? 25000 : userTier === 'Pro' ? 5000 : 800}
                      className={`w-full h-80 p-8 rounded-[3rem] border-2 bg-transparent resize-none focus:outline-none transition-all duration-500 text-xl leading-relaxed ${isDarkMode ? 'border-slate-800 text-slate-300 focus:border-indigo-500/50' : 'border-slate-100 bg-white text-slate-800 focus:border-indigo-200 shadow-inner'}`}
                    ></textarea>
                    <div className="mt-2 text-right">
                      <span className={`text-xs font-black uppercase tracking-widest ${inputText.length >= (userTier === 'Enterprise' ? 25000 : userTier === 'Pro' ? 5000 : 800) ? 'text-red-500' : 'text-slate-500 opacity-50'}`}>{inputText.length} / {userTier === 'Enterprise' ? '25,000' : userTier === 'Pro' ? '5,000' : '800'}</span>
                    </div>
                    <button onClick={handleSimplify} disabled={!inputText || isSimplifying} className={`mt-8 py-5 rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-3 transition-all ${!inputText || isSimplifying ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 hover:-translate-y-1'}`}>
                      {isSimplifying ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <Wand2 className="w-6 h-6" />}
                      <span>{usageCount >= 5 ? 'Daily Limit Hit' : 'Simplify Content'}</span>
                    </button>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div className="flex gap-1">{[1, 2, 3, 4, 5].map(i => <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-500 ${i <= usageCount ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>)}</div>
                      <span className={`text-[10px] font-black uppercase tracking-widest opacity-40 ml-2`}>{5 - usageCount} Uses Left Today</span>
                    </div>
                  </div>

                  <div className="hidden lg:flex flex-col items-center justify-center opacity-10"><div className="w-[1px] h-full bg-indigo-500"></div><ArrowRight className="my-4 text-indigo-500" /><div className="w-[1px] h-full bg-indigo-500"></div></div>

                  <div className="flex-1 flex flex-col text-left">
                    <div className="flex items-center gap-3 mb-6 font-black uppercase text-emerald-500 text-xs tracking-[0.3em]"><Sparkles className="w-5 h-5" /> Gist Output</div>
                    <div className={`flex-1 min-h-[350px] h-full rounded-[3rem] border-2 border-dashed p-10 flex flex-col justify-center transition-all duration-500 overflow-hidden ${isDarkMode ? 'border-indigo-500/10 bg-indigo-500/5' : 'border-slate-200 bg-slate-50/50'}`}>
                      {outputText ? <div className="animate-in fade-in slide-in-from-right-4 duration-700 italic opacity-95 w-full">{renderOutput(outputText)}</div> : <div className="text-center space-y-4 opacity-20"><Zap className="w-12 h-12 mx-auto animate-pulse" /><p className="text-lg font-bold">Waiting for input...</p></div>}
                    </div>

                    {/* Chat Section (Enterprise Only) */}
                    {userTier === 'Enterprise' && outputText && (
                      <div className={`mt-8 p-6 rounded-[2rem] border-2 transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xs font-black uppercase tracking-widest opacity-50">Deep Dive Chat</span>
                        </div>

                        <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                          {chatMessages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? (isDarkMode ? 'bg-indigo-600/20 text-indigo-300' : 'bg-indigo-50 text-indigo-800') : (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white border text-slate-600')}`}>
                                {msg.content}
                              </div>
                            </div>
                          ))}
                          {isThinking && <div className="text-xs animate-pulse opacity-50">AI is thinking...</div>}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                            placeholder="Ask a follow-up question..."
                            className={`flex-1 bg-transparent border-0 border-b-2 focus:ring-0 focus:border-indigo-500 transition-all font-medium py-3 px-2 ${isDarkMode ? 'border-slate-700 text-white placeholder-slate-600' : 'border-slate-200 text-slate-900'}`}
                          />
                          <button onClick={handleChatSubmit} disabled={!chatInput || isThinking} className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-all disabled:opacity-50">
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mt-8 flex justify-end gap-4">
                      {outputText && (
                        <>
                          <button onClick={() => handleCopy(outputText)} className={`flex items-center gap-2 text-xs font-black px-6 py-3 rounded-2xl transition-all ${isDarkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-white border text-slate-600 hover:bg-slate-50 shadow-sm'}`}><Copy className="w-4 h-4" /> Copy</button>
                          <button onClick={() => handleShare(outputText)} className="flex items-center gap-2 text-xs font-black px-6 py-3 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:-translate-y-1 transition-all"><Share2 className="w-4 h-4" /> Share</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="features" className={`py-32 relative overflow-hidden transition-colors duration-700 ${isDarkMode ? 'bg-slate-950/40' : 'bg-slate-50'}`}>
            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
              <h2 className="text-5xl md:text-6xl font-[900] mb-8 tracking-tight">Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500">babysimple?</span></h2>
              <p className={`text-xl mb-20 max-w-3xl mx-auto font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Engineered for speed, privacy, and absolute clarity. Only Gist combines deep context awareness with a zero-knowledge architecture.
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                {/* Core Features */}
                {FEATURES.map((feature, idx) => (
                  <div key={idx} className={`p-10 rounded-[3rem] border-2 transition-all duration-500 float-on-hover group ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform">{feature.icon}</div>
                    <h3 className="text-2xl font-black mb-4 tracking-tight group-hover:text-indigo-500 transition-colors uppercase italic">{feature.title}</h3>
                    <p className={`leading-relaxed font-bold opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{feature.description}</p>
                  </div>
                ))}

                {/* Privacy Features */}
                <div className={`p-10 rounded-[3rem] border-2 transition-all duration-500 float-on-hover group ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black mb-4 tracking-tight group-hover:text-emerald-500 transition-colors uppercase italic">No Data Stored</h3>
                  <p className={`leading-relaxed font-bold opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Your text is processed instantly and never saved on our servers.</p>
                </div>

                <div className={`p-10 rounded-[3rem] border-2 transition-all duration-500 float-on-hover group ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <Globe className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black mb-4 tracking-tight group-hover:text-emerald-500 transition-colors uppercase italic">Encrypted Pipeline</h3>
                  <p className={`leading-relaxed font-bold opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>All data transfers use industry-standard HTTPS encryption.</p>
                </div>

                <div className={`p-10 rounded-[3rem] border-2 transition-all duration-500 float-on-hover group ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <Zap className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black mb-4 tracking-tight group-hover:text-emerald-500 transition-colors uppercase italic">Real-Time Only</h3>
                  <p className={`leading-relaxed font-bold opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Text goes in, simplified text comes out. Nothing in between.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="pricing" className="py-32 px-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-24">
                <h2 className="text-6xl font-[900] mb-6 tracking-tighter">Fair <span className="text-indigo-600 italic">Plans.</span></h2>
                <p className={`text-xl font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Clarity should be accessible to everyone.</p>
              </div>
              <div className="grid lg:grid-cols-3 gap-12">
                {PRICING_TIERS.map((tier, idx) => (
                  <div key={idx} className={`p-12 rounded-[4rem] border-2 flex flex-col transition-all relative ${tier.isPopular ? (isDarkMode ? 'scale-110 z-10 border-indigo-500 bg-indigo-500/5 shadow-2xl shadow-indigo-500/10' : 'scale-110 z-10 border-indigo-500 bg-white shadow-2xl shadow-indigo-500/20') : (isDarkMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-200 bg-white shadow-sm')}`}>
                    {tier.isPopular && <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.3em] px-8 py-2 rounded-full shadow-xl">Recommended</div>}
                    <h3 className="text-2xl font-black mb-2 uppercase tracking-tight italic">{tier.name}</h3>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-6xl font-black tracking-tighter">{tier.price}</span>
                      <span className="text-lg opacity-40 font-bold uppercase tracking-widest">/mo</span>
                    </div>
                    <p className="opacity-60 mb-10 font-medium text-lg leading-relaxed">{tier.description}</p>
                    <ul className="space-y-6 mb-12 flex-1">
                      {tier.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-4 text-sm font-black uppercase tracking-widest"><Check className="w-5 h-5 text-emerald-500" /> {f}</li>
                      ))}
                    </ul>
                    <button onClick={() => handlePurchase(tier.name)} className={`w-full py-6 rounded-[2.5rem] font-black text-xl transition-all ${userTier === tier.name ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20'}`}>
                      {userTier === tier.name ? 'Active Plan' : tier.buttonText}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="faq" className="py-32 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-20">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black mb-6 border ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                  <HelpCircle className="w-3 h-3" />
                  <span className="uppercase tracking-[0.2em]">Got Questions?</span>
                </div>
                <h2 className="text-5xl md:text-6xl font-[900] tracking-tighter mb-4">Common <span className="text-indigo-500 italic">Queries.</span></h2>
              </div>

              <div className="space-y-4">
                {FAQ_ITEMS.map((faq, idx) => (
                  <div
                    key={idx}
                    className={`rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${activeFAQ === idx ? (isDarkMode ? 'bg-slate-900 border-indigo-500/50' : 'bg-white border-indigo-500 shadow-xl') : (isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-indigo-100 shadow-sm')}`}
                  >
                    <button
                      onClick={() => setActiveFAQ(activeFAQ === idx ? null : idx)}
                      className="w-full flex items-center justify-between p-8 text-left focus:outline-none"
                    >
                      <span className={`text-xl font-black tracking-tight transition-colors ${activeFAQ === idx ? 'text-indigo-500' : ''}`}>{faq.question}</span>
                      <div className={`p-2 rounded-xl transition-all ${activeFAQ === idx ? 'bg-indigo-500 text-white rotate-180' : 'bg-slate-800/10 text-slate-500'}`}>
                        {activeFAQ === idx ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      </div>
                    </button>
                    <div className={`transition-all duration-500 ease-in-out ${activeFAQ === idx ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                      <div className="p-8 pt-0 opacity-60 font-medium text-lg leading-relaxed border-t border-slate-800/10 mt-2 pt-6">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <footer className={`pt-32 pb-12 border-t transition-all duration-700 ${isDarkMode ? 'bg-[#0a0f1e] border-slate-900' : 'bg-white border-slate-100'}`}>
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-3 mb-8 group">
                    <div className="bg-indigo-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                      <Zap className="w-8 h-8 text-white fill-current" />
                    </div>
                    <span className="text-4xl font-black tracking-tighter uppercase">babysimple</span>
                  </div>
                  <p className="text-2xl max-w-sm opacity-50 font-black leading-tight mb-10 uppercase tracking-tighter">Decentralizing complexity. <br /> Empowering the layman.</p>

                  {/* Social Links */}
                  <div className="flex items-center gap-4">
                    <a
                      href="https://discord.com/invite/ZZx3cBrx2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-3 rounded-xl transition-all group hover:scale-110 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                      aria-label="Join Discord"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.8943 4.34399C17.5183 3.71467 16.057 3.256 14.5317 3C14.3396 3.33067 14.1263 3.77866 13.977 4.13067C12.3546 3.89599 10.7439 3.89599 9.14391 4.13067C8.99457 3.77866 8.77056 3.33067 8.58922 3C7.05325 3.256 5.59191 3.71467 4.22552 4.34399C1.46286 8.41865 0.716188 12.3973 1.08952 16.3226C2.92418 17.6559 4.69486 18.4666 6.4346 19C6.86126 18.424 7.24527 17.8053 7.57594 17.1546C6.9466 16.92 6.34927 16.632 5.77327 16.2906C5.9226 16.184 6.07194 16.0667 6.21061 15.9493C9.68793 17.5387 13.4543 17.5387 13.4543 17.5387C13.5855 17.6534 13.7314 17.7663 13.8814 17.8773C13.2982 18.2198 12.6934 18.5103 12.0641 18.7506C12.3947 19.4013 12.7787 20.02 13.2054 20.596C14.9451 20.0626 16.7158 19.2519 18.5505 17.9186C18.9238 13.9933 18.1771 10.0146 15.4145 5.93999L18.8943 4.34399ZM8.5539 12.8719C7.49191 12.8719 6.62125 11.8906 6.62125 10.6866C6.62125 9.48265 7.47058 8.49865 8.5539 8.49865C9.64655 8.49865 10.5052 9.49332 10.4839 10.6866C10.4839 11.8906 9.63724 12.8719 8.5539 12.8719ZM15.0866 12.8719C14.0246 12.8719 13.1539 11.8906 13.1539 10.6866C13.1539 9.48265 14.0033 8.49865 15.0866 8.49865C16.1793 8.49865 17.0379 9.49332 17.0166 10.6866C17.0166 11.8906 16.1699 12.8719 15.0866 12.8719Z" />
                      </svg>
                    </a>

                    <a
                      href="https://www.instagram.com/entrext.labs/#"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-3 rounded-xl transition-all group hover:scale-110 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                      aria-label="Follow on Instagram"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334" />
                      </svg>
                    </a>

                    <a
                      href="https://www.linkedin.com/company/entrext/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-3 rounded-xl transition-all group hover:scale-110 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                      aria-label="Connect on LinkedIn"
                    >
                      <Linkedin className="w-5 h-5 fill-current" />
                    </a>

                    <a
                      href="https://entrextlabs.substack.com/subscribe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-3 rounded-xl transition-all group hover:scale-110 ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                      aria-label="Subscribe on Substack"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 3.604H1v1.891h14v-1.89ZM1 7.208V16l7-3.926L15 16V7.208zM15 0H1v1.89h14z" />
                      </svg>
                    </a>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-black text-indigo-500 uppercase tracking-[0.3em] mb-10">Company</h4>
                  <ul className="space-y-6 font-black uppercase tracking-widest text-[11px] opacity-40">
                    <li onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-indigo-500 cursor-pointer transition-colors">About</li>
                    <li onClick={() => { const el = document.getElementById('features'); el?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-indigo-500 cursor-pointer transition-colors">Features</li>
                    <li onClick={() => { const el = document.getElementById('pricing'); el?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-indigo-500 cursor-pointer transition-colors">Pricing</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-black text-indigo-500 uppercase tracking-[0.3em] mb-10">Legal</h4>
                  <ul className="space-y-6 font-black uppercase tracking-widest text-[11px] opacity-40">
                    <li onClick={() => setView('privacy')} className="hover:text-indigo-500 cursor-pointer transition-colors">Privacy Policy</li>
                    <li onClick={() => setView('terms')} className="hover:text-indigo-500 cursor-pointer transition-colors">Terms & Conditions</li>
                  </ul>
                </div>
              </div>
              <div className="pt-12 border-t border-slate-800/50 text-center opacity-30 text-[10px] font-black uppercase tracking-[0.5em]">
                <span>© 2026 babysimple AI Systems. All Rights Reserved.</span>
              </div>
            </div>
          </footer>
        </>
      )}
      {showAuthModal && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-500 ${isDarkMode ? 'bg-slate-950/95' : 'bg-slate-50/70'}`}>
          <div className={`max-w-md w-full rounded-[4rem] p-12 border-2 relative overflow-hidden shadow-2xl ${isDarkMode ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-white shadow-2xl'}`}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500"></div>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 mx-auto mb-6">
                <Zap className="w-8 h-8 fill-current" />
              </div>
              <h3 className="text-3xl font-black mb-2 uppercase tracking-tighter">{authMode === 'signup' ? 'Create Account' : 'Welcome Back'}</h3>
              <p className="opacity-50 text-sm">Get unlimited access to babysimple Pro</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2 opacity-60">Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className={`w-full px-6 py-4 rounded-2xl border-2 focus:border-indigo-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-900 shadow-inner'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 opacity-60">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className={`w-full px-6 py-4 rounded-2xl border-2 focus:border-indigo-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-900 shadow-inner'}`}
                />
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg hover:scale-105 transition-all shadow-xl shadow-indigo-600/30 uppercase tracking-widest disabled:opacity-50"
              >
                {isAuthLoading ? 'Processing...' : (authMode === 'signup' ? 'Sign Up' : 'Login')}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
                className="text-sm opacity-60 hover:opacity-100 transition-opacity"
              >
                {authMode === 'signup' ? 'Already have an account? Login' : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLimitModal && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-500 ${isDarkMode ? 'bg-slate-950/95' : 'bg-slate-50/70'}`}>
          <div className={`max-w-md w-full rounded-[4rem] p-12 border-2 text-center relative overflow-hidden shadow-2xl ${isDarkMode ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-white shadow-2xl'}`}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500"></div>
            <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 mx-auto mb-8 animate-bounce"><Zap className="w-12 h-12 fill-current" /></div>
            <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter leading-none italic">Free Plan Limit Over</h3>
            <p className="opacity-50 mb-10 font-bold uppercase tracking-tight text-sm">You've reached the daily limit for the free plan. Upgrade to babysimple Pro for unlimited gists and faster processing.</p>
            <button onClick={() => { setShowLimitModal(false); setView('landing'); setTimeout(() => { const el = document.getElementById('pricing'); el?.scrollIntoView({ behavior: 'smooth' }); }, 100); }} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl hover:scale-105 transition-all shadow-xl shadow-indigo-600/30 uppercase tracking-widest">Upgrade to Pro</button>
            <button onClick={() => setShowLimitModal(false)} className="mt-6 text-[10px] font-black uppercase opacity-30 hover:opacity-100 transition-opacity tracking-[0.3em]">Stay Free</button>
          </div>
        </div>
      )}


    </div>
  );
};

export default App;
