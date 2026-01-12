
import React, { useState, useEffect } from 'react';
import { Sun, Moon, Zap, Menu, X, ArrowRight, Check, Github, Twitter, Linkedin, Copy, Share2, Sparkles, Layers, Wand2, LayoutDashboard, History, Settings, LogOut, ChevronRight, FileText, Activity, CreditCard, ShieldCheck, Globe, Users, Trash2 } from 'lucide-react';
import { NICHES, FEATURES, PRICING_TIERS, TONES } from './constants';
import { NicheType, ViewType, ToneType, ModelType, HistoryItem } from './types';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { supabase } from './supabase';

// Initialize PDF worker
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import Tesseract from 'tesseract.js';
import mermaid from 'mermaid';
// Initialize Mermaid
mermaid.initialize({ startOnLoad: false });

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
  const [showEnterpriseGuide, setShowEnterpriseGuide] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Initialize mermaid on mount/theme change
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDarkMode ? 'dark' : 'default',
      securityLevel: 'loose',
    });
  }, [isDarkMode]);

  // Run mermaid when output text changes
  useEffect(() => {
    if (outputText) {
      setTimeout(() => {
        mermaid.run({
          querySelector: '.mermaid'
        });
      }, 100);
    }
  }, [outputText]);

  const renderOutput = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(```mermaid[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```mermaid')) {
        let content = part.replace('```mermaid', '').replace('```', '').trim();
        // Basic cleanup: Mermaid fails if there are non-mermaid lines inside the block
        content = content.split('\n').filter(line =>
          line.includes('-->') ||
          line.includes('graph ') ||
          line.includes('flowchart ') ||
          line.includes('[') ||
          line.includes('(') ||
          line.includes('{') ||
          line.trim() === ''
        ).join('\n');
        return (
          <div key={index} className="my-12 space-y-6">
            <div className="flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Interactive Visual Canvas</span>
              </div>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500/30"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500/30"></div>
              </div>
            </div>
            <div className={`mermaid p-12 rounded-[4rem] border-[6px] border-dashed transition-all ${isDarkMode ? 'bg-[#020617]/50 border-emerald-500/10 shadow-[inner_0_0_100px_rgba(16,185,129,0.05)]' : 'bg-slate-50/50 border-emerald-200 shadow-xl'} flex justify-center items-center overflow-x-auto min-h-[300px]`}>
              {content}
            </div>
          </div>
        );
      }
      return <p key={index} className="text-2xl leading-[1.6] font-medium break-words overflow-wrap-anywhere whitespace-pre-wrap px-4">{part}</p>;
    });
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

    if (newCount >= 5 && userTier === 'Starter') {
      setShowLimitModal(true);
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
    if (userTier === 'Starter') {
      incrementUsage();
    } else {
      setHistory(prev => [{
        id: Date.now().toString(),
        timestamp: Date.now(),
        niche: selectedNiche,
        input: inputText,
        output: result,
        model: model,
        tone: selectedTone
      }, ...prev]);
    }
  };

  const handlePurchase = async (tierName: string) => {
    console.log("handlePurchase triggered for:", tierName);
    if (tierName === 'Starter') {
      setUserTier('Starter');
      setView('landing');
      return;
    }

    // Robust mapping for tier names
    let normalizedTier: 'Pro' | 'Enterprise' | 'Starter' = 'Starter';
    if (tierName.toLowerCase().includes('pro')) normalizedTier = 'Pro';
    else if (tierName.toLowerCase().includes('enterprise')) normalizedTier = 'Enterprise';

    console.log("Normalized tier for payment:", normalizedTier);
    setPendingTier(normalizedTier);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("User not logged in, showing auth modal.");
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }

    const currentEmail = session.user.email || '';
    console.log("User logged in, initiating payment for:", normalizedTier, "with email:", currentEmail);
    initiatePayment(normalizedTier, currentEmail);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || '');
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || '');
        fetchProfile(session.user.id);
      } else {
        setIsAuthenticated(false);
        setUserTier('Starter');
        setHistory([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setUserTier(data.tier);
      // Fetch history or other profile data here
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: userEmail,
          password: password,
        });
        if (error) throw error;

        // Initial profile creation (SQL trigger handles this usually, but good to be safe)
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: userEmail,
            tier: 'Starter' // Always start as free, upgrade via payment
          });
        }
        alert("Account created! Now redirecting you to the secure payment page to unlock " + pendingTier + " features...");

        // Redirect to payment if a paid tier was selected
        if (pendingTier !== 'Starter') {
          initiatePayment(pendingTier, userEmail);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: password,
        });
        if (error) throw error;

        // After login, if they were trying to buy something, redirect them
        if (pendingTier !== 'Starter') {
          initiatePayment(pendingTier, userEmail);
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

  const initiatePayment = (tier: 'Pro' | 'Enterprise' | 'Starter', email?: string) => {
    console.log("initiatePayment called with tier:", tier, "and email:", email);
    const checkoutLinks = {
      'Pro': 'https://test.checkout.dodopayments.com/buy/pdt_0NW89KALHGBo5694P8VWg?quantity=1',
      'Enterprise': 'https://test.checkout.dodopayments.com/buy/pdt_0NW89QFRYI2zzcocabqRS?quantity=1',
      'Starter': ''
    };

    if (tier !== 'Starter') {
      let url = checkoutLinks[tier];

      // Pre-fill email if available
      if (email && url) {
        url += `&customer_email=${encodeURIComponent(email)}`;
      }

      console.log(`Redirecting to: ${url}`);
      if (url) {
        window.location.assign(url);
      } else {
        alert("Error: Checkout link not found for " + tier);
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
        If a visual diagram effectively explains the concept, generate valid Mermaid.js code enclosed in \`\`\`mermaid ... \`\`\` blocks.
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

    // Pro Check
    if (userTier === 'Starter' && (file.type === 'application/pdf' || file.name.endsWith('.docx') || file.name.endsWith('.doc'))) {
      // Only allow .txt for free tier if we want, or restrict all files to Pro?
      // User said "pro me include pdf, docx". Implies txt might be free?
      // Let's restricting ALL uploads to Pro for simplicity/upsell, or check file type.
      // The prompt says "pro me include pdf, docx sabhi type ki files input lene ka option rakho".
      // Let's assume text files are free (since I already implemented them), but PDF/DOCX are Pro.

      setAuthMode('signup');
      setShowAuthModal(true);
      alert("PDF and DOCX analysis is a Pro feature. Please upgrade to unlock.");
      return;
    }

    try {
      if (file.type === 'application/pdf') {
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
      else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
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

    const geminiKey = getSafeKey(process.env.API_KEY || process.env.GEMINI_API_KEY);
    const groqKey = getSafeKey(process.env.GROQ_API_KEY);

    console.log("Diagnostics - Key Status:", {
      geminiFound: !!geminiKey,
      geminiPrefix: geminiKey.substring(0, 4),
      groqFound: !!groqKey,
      groqPrefix: groqKey.substring(0, 4)
    });

    try {
      // 1. Try Secondary Model directly if routed or if user only has that key
      if (model.includes('Groq') || (!geminiKey && groqKey)) {
        if (!groqKey || groqKey === "" || groqKey === "undefined") {
          setOutputText("Secondary API Key is missing. Please add GROQ_API_KEY (for Groq/xAI) to .env.local.");
          setIsSimplifying(false);
          return;
        }
        const result = await callSecondaryModel(inputText, selectedTone, selectedNiche, groqKey);
        setOutputText(result);
        saveHistory(result, groqKey.startsWith('xai-') ? 'Grok (xAI)' : 'Groq (Llama-3)');
        setIsSimplifying(false);
        return;
      }

      // 2. Try Gemini
      if (!geminiKey || geminiKey === "" || geminiKey === "undefined") {
        if (groqKey && groqKey !== "" && groqKey !== "undefined") {
          console.warn("Gemini key missing, trying Secondary fallback...");
          const result = await callSecondaryModel(inputText, selectedTone, selectedNiche, groqKey);
          setOutputText(result);
          saveHistory(result, groqKey.startsWith('xai-') ? 'Grok (xAI)' : 'Groq (Llama-3)');
          setIsSimplifying(false);
          return;
        }
        setOutputText("API Key Missing! Plase check your .env.local file. It should have: GEMINI_API_KEY=your_key_here. IMPORTANT: Restart the terminal after adding the key.");
        setIsSimplifying(false);
        return;
      }

      try {
        const isVisualizationRequest = currentText.toLowerCase().includes('mermaid') || currentText.toLowerCase().includes('visual');

        const prompt = isVisualizationRequest
          ? `Create a clear, professional Mermaid.js flowchart or diagram (graph TD or flowchart LR) to visually explain the following concept:
             
             "${currentText.replace(/Please analyze the following and create a detailed visual Mermaid.js flowchart or diagram explaining the process\/concept clearly: \n\n /i, '')}"
             
             IMPORTANT: Return ONLY the Mermaid code block. No conversational text. Ensure nodes have short labels and uses standard arrows. Avoid special characters in labels. Enclose in \`\`\`mermaid ... \`\`\` blocks.`
          : `Simplify the following ${selectedNiche} technical/jargon-heavy text into plain ${targetLanguage} for a layman. 
             Use a ${selectedTone} tone. Ensure the output is concise and easy to understand.
             If a visual diagram effectively explains the concept (e.g. process flow), generate valid Mermaid.js code enclosed in \`\`\`mermaid ... \`\`\` blocks.
             
             Text to simplify:
             "${currentText}"`;

        // Use the robust multi-model fallback helper
        const { text, usedModel } = await callGeminiWithFallback(geminiKey, prompt);

        setOutputText(text);
        saveHistory(text, usedModel as ModelType);
      } catch (geminiError: any) {
        console.error("Gemini failed after all retries:", geminiError);
        const geminiMsg = geminiError?.message || String(geminiError);

        // 3. Fallback to Secondary if Gemini fails
        if (groqKey && groqKey !== "" && groqKey !== "undefined") {
          try {
            const fallbackResult = await callSecondaryModel(inputText, selectedTone, selectedNiche, groqKey);
            setOutputText(fallbackResult);
            saveHistory(fallbackResult, groqKey.startsWith('xai-') ? 'Grok (xAI)' : 'Groq (Llama-3)');
          } catch (secError: any) {
            console.error("Secondary fallback failed:", secError);
            const secMsg = secError?.message || String(secError);

            // Critical: Check for xAI billing error specifically
            if (secMsg.includes('credits') || secMsg.includes('licenses')) {
              setOutputText(`Billing Error: Your xAI (Grok) account has no credits.
                
TIP: Agar aapke paas Groq (gsk_...) key hai toh wo use karein, wo free tier deti hai. 
xAI (Elon Musk wala) bina credits ke nahi chalta.

Gemini Error: ${geminiMsg}`);
            } else {
              setOutputText(`Critical Error: Both APIs failed.\nGemini: ${geminiMsg}\nSecondary: ${secMsg}`);
            }
          }
        } else {
          setOutputText(`Gemini Error: ${geminiMsg}. (Add GROQ_API_KEY to .env.local for better resilience)`);
        }
      }
    } catch (error) {
      console.error("Master catch triggered:", error);
      setOutputText("Error: " + (error instanceof Error ? error.message : "Simplification failed."));
    } finally {
      setIsSimplifying(false);
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
      const geminiKey = getSafeKey(process.env.API_KEY || process.env.GEMINI_API_KEY);
      const groqKey = getSafeKey(process.env.GROQ_API_KEY);

      const prompt = `Context Material: "${inputText}"
      Current Gist: "${outputText}"
      
      Chat History: ${chatMessages.map(m => `${m.role}: ${m.content}`).join('\n')}
      
      User Question: "${chatInput}"
      
      As an expert advisor, answer the user's question based on the provided context and gist. Keep it concise (under 3 sentences) and use a helpful, professional tone. If they ask for a diagram, use Mermaid syntax.`;

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
            onClick={() => {
              if (!teamEmailInput.trim()) return;
              if (teamMembers.length >= 10) {
                alert("Team limit reached. Upgrade to custom plan for more users.");
                return;
              }
              if (teamMembers.find(m => m.email === teamEmailInput)) {
                alert("User already in team.");
                return;
              }
              setTeamMembers(prev => [...prev, { email: teamEmailInput, role: 'Editor' }]);
              setTeamEmailInput('');
            }}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/30"
          >
            Invite
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

  const renderEnterpriseGuide = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setShowEnterpriseGuide(false)}>
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-10 shadow-2xl border-2 animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 p-2 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-3xl font-black tracking-tight">Enterprise Success Guide</h3>
            </div>
            <p className="opacity-60 font-bold">Follow these steps to setup and test your premium features.</p>
          </div>
          <button onClick={() => setShowEnterpriseGuide(false)} className="p-3 hover:bg-white/10 rounded-full transition-all">
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h4 className="text-xl font-black text-indigo-500 flex items-center gap-2">
              <Layers className="w-5 h-5" /> 1. Extension Setup
            </h4>
            <div className={`p-6 rounded-3xl space-y-4 ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
              <ol className="list-decimal list-inside space-y-3 text-sm font-medium opacity-80 leading-relaxed">
                <li>Go to <code className="bg-indigo-500/20 px-2 py-0.5 rounded">chrome://extensions/</code> in Chrome.</li>
                <li>Turn ON <strong>Developer mode</strong> (top right toggle).</li>
                <li>Click <strong>Load unpacked</strong>.</li>
                <li>Select the <code className="bg-indigo-500/20 px-2 py-0.5 rounded">extension</code> folder in this project's directory.</li>
                <li>Select some text on any website, right-click, and choose <strong>"Gistify this selection"</strong>.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-xl font-black text-emerald-500 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> 2. Feature Testing
            </h4>
            <div className="space-y-4">
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                <p className="font-black text-xs uppercase tracking-widest mb-1">OCR / Image Analysis</p>
                <p className="text-xs opacity-60">Upload a screenshot or photo of text in the <strong>Files</strong> tab. AI will extract and simplify it.</p>
              </div>
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                <p className="font-black text-xs uppercase tracking-widest mb-1">Contextual Chat</p>
                <p className="text-xs opacity-60">Generate a gist first. Then use the <strong>Deep Dive Chat</strong> below to ask detailed follow-up questions.</p>
              </div>
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                <p className="font-black text-xs uppercase tracking-widest mb-1">Visual Explanations</p>
                <p className="text-xs opacity-60">Try complex technical prompts like "Explain the Kubernetes architecture". It will generate a <strong>Mermaid Diagram</strong>.</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`mt-10 p-8 rounded-[2rem] border-2 border-dashed ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
          <div className="flex items-center gap-4">
            <div className="animate-pulse bg-indigo-500 w-3 h-3 rounded-full"></div>
            <p className="text-sm font-bold">Character Limit Verified: <strong>25,000 Characters</strong> active for your account.</p>
          </div>
        </div>

        <button
          onClick={() => setShowEnterpriseGuide(false)}
          className="w-full mt-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-xl shadow-xl transition-all active:scale-95"
        >
          Got it, let's go!
        </button>
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
          <span className="text-2xl font-black tracking-tighter hidden lg:block">Gist<span className="text-indigo-500">.</span></span>
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
              <h2 className="text-3xl font-black tracking-tight">{userTier} Workspace</h2>
              <p className={isDarkMode ? 'text-slate-500 font-bold' : 'text-slate-400 font-bold text-sm'}>
                {userTier === 'Enterprise' ? 'Team Control Panel' : 'Individual Clarity Console'}
              </p>
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
                    const limit = userTier === 'Enterprise' ? 25000 : userTier === 'Pro' ? 5000 : 800;
                    if (text.length <= limit) {
                      setInputText(text);
                    }
                  }}
                  placeholder="Paste your materials here..."
                  maxLength={userTier === 'Enterprise' ? 25000 : userTier === 'Pro' ? 5000 : 800}
                  className="w-full h-64 bg-transparent resize-none focus:outline-none text-xl leading-relaxed"
                ></textarea>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <span className={`text-xs font-black uppercase tracking-widest ${inputText.length >= (userTier === 'Enterprise' ? 25000 : userTier === 'Pro' ? 5000 : 800) ? 'text-red-500' : 'text-slate-500'}`}>{inputText.length} / {userTier === 'Enterprise' ? '25,000' : userTier === 'Pro' ? '5000' : '800'} Characters</span>
                  <div className="flex flex-wrap gap-4">
                    {userTier === 'Enterprise' && (
                      <button
                        onClick={() => {
                          const vizPrompt = `Please analyze the following and create a detailed visual Mermaid.js flowchart or diagram explaining the process/concept clearly: \n\n ${inputText}`;
                          handleSimplify(vizPrompt);
                        }}
                        disabled={!inputText || isSimplifying}
                        className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 border border-emerald-500/20 px-8 py-5 rounded-[2rem] text-xl font-black transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                      >
                        <Activity className="w-6 h-6" />
                        Visualize
                      </button>
                    )}
                    <button
                      onClick={handleSimplify}
                      disabled={!inputText || isSimplifying}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-[2rem] text-xl font-black shadow-2xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                    >
                      {isSimplifying ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <Wand2 className="w-6 h-6" />}
                      {isSimplifying ? 'Refining...' : 'Generate Gist'}
                    </button>
                  </div>
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
                      <button onClick={() => navigator.clipboard.writeText(outputText)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><Copy className="w-5 h-5" /></button>
                      <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><Share2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {renderOutput(outputText)}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6" style={{ display: view === 'dashboard' ? 'flex' : 'none' }}>
              {userTier === 'Enterprise' && outputText && (
                <div className={`rounded-[3rem] p-8 border-2 flex flex-col flex-1 overflow-hidden min-h-0 ${isDarkMode ? 'bg-slate-900/60 border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)]' : 'bg-white border-slate-100 shadow-xl'}`}>
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
                      <div key={item.id} onClick={() => setSelectedHistoryItem(item)} className={`p-6 rounded-[2rem] border transition-all cursor-pointer group ${isDarkMode ? 'bg-slate-950/40 border-slate-800/50 hover:border-indigo-500/50' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}>
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
          </div>
        )}

        {dashboardView === 'history' && (
          <div className="max-w-5xl">
            <h3 className="text-2xl font-black mb-8">Your History</h3>
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className={`p-12 rounded-3xl border-2 text-center ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-bold opacity-50">No history yet. Start simplifying to see your past work here!</p>
                  <p className="text-sm opacity-30 mt-2">History is saved locally in your browser</p>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} onClick={() => setSelectedHistoryItem(item)} className={`p-6 rounded-3xl border-2 cursor-pointer ${isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-100 hover:border-indigo-200'} transition-all`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs opacity-50">{new Date(item.timestamp).toLocaleString()}</span>
                      <ArrowRight className="w-4 h-4 opacity-50" />
                    </div>
                    <p className="text-sm font-bold line-clamp-2 opacity-80">{item.input}</p>
                  </div>
                ))
              )}
            </div>
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
          )}
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
                        initiatePayment('Enterprise', userEmail);
                      }}
                      className="px-10 py-5 bg-white text-indigo-600 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-95"
                    >
                      UPGRADE TO ENTERPRISE <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}

              {userTier === 'Enterprise' && (
                <div className={`mt-8 p-8 rounded-[2.5rem] border-2 bg-gradient-to-br transition-all hover:scale-[1.01] ${isDarkMode ? 'from-indigo-500/10 via-fuchsia-500/5 to-transparent border-indigo-500/20' : 'from-indigo-50 via-white to-white border-indigo-100'}`}>
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 p-4 rounded-2xl shadow-xl shadow-indigo-500/20">
                        <Zap className="w-8 h-8 text-white fill-current" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black mb-1">Browser Extension Ready</h4>
                        <p className="opacity-60 text-sm font-bold">Simplify jargon on any website with a single right-click.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <a
                        href="/gist-extension.zip"
                        download="gist-extension.zip"
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 text-center"
                      >
                        Download Extension
                      </a>
                      <button
                        onClick={() => setShowEnterpriseGuide(true)}
                        className={`px-8 py-4 rounded-2xl font-black border-2 transition-all ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                      >
                        Setup Guide
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        }
        {
          dashboardView === 'team' && userTier === 'Enterprise' && renderTeam()
        }

      </main>

      {/* History Modal */}
      {selectedHistoryItem && (
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
      )}
    </div>
  );

  const renderPrivacyPolicy = () => (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#020617] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b ${isDarkMode ? 'bg-slate-950/60 border-slate-800/50' : 'bg-white/60 border-slate-200/50'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('landing')}>
            <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 p-2 rounded-xl group-hover:rotate-12 transition-all">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="text-2xl font-black tracking-tighter">Gist<span className="text-indigo-500">.</span></span>
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
            <span className="text-2xl font-black tracking-tighter">Gist<span className="text-indigo-500">.</span></span>
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

  return (
    <div className={`min-h-screen transition-all duration-700 ease-in-out selection:bg-indigo-500 selection:text-white ${isDarkMode ? 'bg-[#020617] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      {view === 'privacy' ? renderPrivacyPolicy() : view === 'terms' ? renderTermsAndConditions() : view === 'dashboard' ? renderDashboard() : (
        <>
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className={`absolute -top-[20%] -left-[10%] w-[60%] h-[60%] blur-[120px] opacity-40 animate-pulse ${isDarkMode ? 'bg-indigo-600' : 'bg-blue-200'}`}></div>
            <div className={`absolute top-[10%] -right-[15%] w-[50%] h-[50%] blur-[120px] opacity-30 ${isDarkMode ? 'bg-fuchsia-700' : 'bg-pink-100'}`}></div>
          </div>

          <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-all duration-500 ${isDarkMode ? 'bg-slate-950/60 border-slate-800/50' : 'bg-white/60 border-slate-200/50'}`}>
            <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('landing')}>
                <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 p-2 rounded-xl group-hover:rotate-12 transition-all">
                  <Zap className="w-5 h-5 text-white fill-current" />
                </div>
                <span className="text-2xl font-black tracking-tighter">Gist<span className="text-indigo-500">.</span></span>
              </div>

              <div className="hidden md:flex items-center space-x-10">
                {['Features', 'Simulator', 'Pricing'].map((item) => (
                  <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold hover:text-indigo-500 transition-colors relative group uppercase tracking-widest">
                    {item}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all group-hover:w-full"></span>
                  </a>
                ))}
                <div className="h-6 w-[1px] bg-slate-800/20"></div>
                {userTier !== 'Starter' && (
                  <button
                    onClick={() => setView('dashboard')}
                    className={`flex items-center gap-2.5 px-6 py-2 rounded-2xl font-black uppercase tracking-tighter transition-all group ${isDarkMode ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:scale-105'}`}
                  >
                    <span className="text-[10px]">Workspace</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setUserTier('Enterprise');
                    setDashboardView('usage');
                    setView('dashboard');
                    alert("Debug: Tier forced to Enterprise. Click on 'Setup Guide' in the Insights tab.");
                  }}
                  className="px-4 py-2 bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase rounded-lg border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all"
                >
                  Test Ent.
                </button>
                <button onClick={toggleTheme} className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-slate-900 text-yellow-500 hover:bg-slate-800' : 'bg-white shadow-sm border text-slate-600 hover:bg-slate-50'}`}>
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>

              <div className="md:hidden flex items-center gap-4">
                {userTier !== 'Starter' && (
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
                  {userTier === 'Starter' && <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="bg-indigo-600 text-white w-full py-4 rounded-2xl text-center shadow-indigo-600/20 shadow-xl">Try Pro</a>}
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
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400">clearer with Gist.</span>
              </h1>
              <p className={`text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed font-medium transition-opacity ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Tired of corporate doublespeak and dense legal jargon? <br className="hidden md:block" />
                We translate the complex into the everyday, instantly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <a href="#simulator" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-[2rem] text-xl font-black shadow-2xl shadow-indigo-500/30 transition-all hover:scale-110 active:scale-95 flex items-center justify-center gap-3">
                  Start Gistifying <ArrowRight className="w-6 h-6" />
                </a>
                <button className={`w-full sm:w-auto px-10 py-5 rounded-[2rem] text-xl font-black transition-all hover:scale-110 active:scale-95 border-2 ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                  Watch Demo
                </button>
              </div>
            </div>
          </section>

          <section id="simulator" className="py-24 px-6 relative">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">One Tool, <span className="text-indigo-500 italic">Unlimited</span> Contexts</h2>
                <p className={`text-lg max-w-2xl mx-auto opacity-60 font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  From medical charts to technical docs, we've got you covered.
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
                        if (text.length <= 800) {
                          setInputText(text);
                        }
                      }}
                      placeholder={activeNiche.placeholder}
                      maxLength={800}
                      className={`w-full h-80 p-8 rounded-[3rem] border-2 bg-transparent resize-none focus:outline-none transition-all duration-500 text-xl leading-relaxed ${isDarkMode ? 'border-slate-800 text-slate-300 focus:border-indigo-500/50' : 'border-slate-100 text-slate-800 focus:border-indigo-200'}`}
                    ></textarea>
                    <div className="mt-2 text-right">
                      <span className={`text-xs font-black uppercase tracking-widest ${inputText.length >= 800 ? 'text-red-500' : 'text-slate-500 opacity-50'}`}>{inputText.length} / 800</span>
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

                    {/* Chat Section (Enterprise) */}
                    {outputText && (
                      <div className={`mt-8 p-6 rounded-[2rem] border-2 transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xs font-black uppercase tracking-widest opacity-50">Deep Dive Chat</span>
                          {userTier !== 'Enterprise' && <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ENTERPRISE</span>}
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
                            placeholder={userTier === 'Enterprise' ? "Ask a follow-up question..." : "Upgrade to ask follow-up questions"}
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
                          <button onClick={() => navigator.clipboard.writeText(outputText)} className={`flex items-center gap-2 text-xs font-black px-6 py-3 rounded-2xl transition-all ${isDarkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-white border text-slate-600 hover:bg-slate-50 shadow-sm'}`}><Copy className="w-4 h-4" /> Copy</button>
                          <button className="flex items-center gap-2 text-xs font-black px-6 py-3 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:-translate-y-1 transition-all"><Share2 className="w-4 h-4" /> Share</button>
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
              <h2 className="text-5xl md:text-6xl font-[900] mb-8 tracking-tight">Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500">Gist?</span></h2>
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
                  <div key={idx} className={`p-12 rounded-[4rem] border-2 flex flex-col transition-all relative ${tier.isPopular ? 'scale-110 z-10 border-indigo-500 bg-indigo-500/5 shadow-2xl shadow-indigo-500/10' : 'border-slate-800 bg-slate-950/20'}`}>
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
                    <button onClick={() => handlePurchase(tier.name)} className={`w-full py-6 rounded-[2.5rem] font-black text-xl transition-all ${userTier === tier.name.replace('Gist ', '') ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20'}`}>
                      {userTier === tier.name.replace('Gist ', '') ? 'Active Gist' : tier.buttonText}
                    </button>
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
                    <span className="text-4xl font-black tracking-tighter uppercase">Gist<span className="text-indigo-500">.</span></span>
                  </div>
                  <p className="text-2xl max-w-sm opacity-50 font-black leading-tight mb-10 uppercase tracking-tighter">Decentralizing complexity. <br /> Empowering the layman.</p>
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
                <span>© 2026 Gist AI Systems. All Rights Reserved.</span>
              </div>
            </div>
          </footer>
        </>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="max-w-md w-full rounded-[4rem] p-12 bg-slate-900 border-2 border-indigo-500/30 relative overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.2)]">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500"></div>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 mx-auto mb-6">
                <Zap className="w-8 h-8 fill-current" />
              </div>
              <h3 className="text-3xl font-black mb-2 uppercase tracking-tighter">{authMode === 'signup' ? 'Create Account' : 'Welcome Back'}</h3>
              <p className="opacity-50 text-sm">Get unlimited access to Gist Pro</p>
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
                  className="w-full px-6 py-4 rounded-2xl bg-slate-800 border-2 border-slate-700 focus:border-indigo-500 outline-none transition-all"
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
                  className="w-full px-6 py-4 rounded-2xl bg-slate-800 border-2 border-slate-700 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg hover:scale-105 transition-all shadow-xl shadow-indigo-600/30 uppercase tracking-widest disabled:opacity-50"
              >
                {isAuthLoading ? 'Processing...' : (authMode === 'signup' ? 'Sign Up & Continue' : 'Login & Continue')}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="max-w-md w-full rounded-[4rem] p-12 bg-slate-900 border-2 border-indigo-500/30 text-center relative overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.2)]">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500"></div>
            <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 mx-auto mb-8 animate-bounce"><Zap className="w-12 h-12 fill-current" /></div>
            <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter leading-none italic">Daily Limit Hit.</h3>
            <p className="opacity-50 mb-10 font-bold uppercase tracking-tight text-sm">Starter tier is restricted to 5 gists per day. Upgrade to Gist Pro for unlimited access and expert tools.</p>
            <button onClick={() => { setShowLimitModal(false); setView('landing'); setTimeout(() => { const el = document.getElementById('pricing'); el?.scrollIntoView({ behavior: 'smooth' }); }, 100); }} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl hover:scale-105 transition-all shadow-xl shadow-indigo-600/30 uppercase tracking-widest">Upgrade to Pro</button>
            <button onClick={() => setShowLimitModal(false)} className="mt-6 text-[10px] font-black uppercase opacity-30 hover:opacity-100 transition-opacity tracking-[0.3em]">Stay Free</button>
          </div>
        </div>
      )}
      {showEnterpriseGuide && renderEnterpriseGuide()}
    </div>
  );
};

export default App;
