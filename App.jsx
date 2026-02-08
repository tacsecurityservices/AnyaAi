import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Trash2, 
  Terminal, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Copy, 
  Wifi, 
  WifiOff,
  Activity,
  Zap,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Brain,
  BookOpen,
  Plus,
  X
} from 'lucide-react';

/**
 * A.N.Y.A. V2.5 - Artificial Neural Yield Assistant
 * Personalized AI Assistant for Calvin
 */

const App = () => {
  // --- State Management ---
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [systemLogs, setSystemLogs] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // User Recognition
  const [advancedModeUnlocked, setAdvancedModeUnlocked] = useState(false);
  const [awaitingPassword, setAwaitingPassword] = useState(false);

  // Currency & Market Data
  const [exchangeRate, setExchangeRate] = useState(null);
  const [rateChange, setRateChange] = useState(null);
  const [lastRateUpdate, setLastRateUpdate] = useState(null);

  // Knowledge Base & Training
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [showTrainingPanel, setShowTrainingPanel] = useState(false);
  const [newKnowledge, setNewKnowledge] = useState({ key: '', value: '' });

  // --- Refs ---
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSynthRef = useRef(window.speechSynthesis);

  // --- Gemini API Configuration ---
  // For local development: Get API key from environment variable
  // For artifact runtime: API is handled automatically
  const apiKey = typeof window !== 'undefined' && window.VITE_GEMINI_API_KEY 
    ? window.VITE_GEMINI_API_KEY 
    : ""; // Will be provided by runtime
  const modelName = "gemini-2.5-flash-preview-09-2025";

  // --- Core Knowledge Base for Calvin ---
  const calvinProfile = {
    name: "Calvin",
    occupation: "Software Developer/Coder",
    location: "South Africa, Gauteng",
    interests: [
      "Entrepreneurship and business opportunities",
      "Market analysis and trends",
      "Currency exchange rates (USD/ZAR)",
      "Technology and coding",
      "Starting new ventures"
    ],
    expertise: "Software development, coding, technology",
    goals: "Always looking to start new businesses and analyze market opportunities",
    preferences: {
      currency_pair: "USD/ZAR",
      primary_focus: "Business opportunities in South Africa"
    }
  };

  // --- Initialization & Listeners ---
  useEffect(() => {
    // Load saved knowledge base from localStorage
    const saved = localStorage.getItem('anya_knowledge_base');
    if (saved) {
      setKnowledgeBase(JSON.parse(saved));
    }

    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    // Keyboard shortcut for voice input (Ctrl/Cmd + M)
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        toggleMic();
      }
    };
    window.addEventListener('keydown', handleKeyPress);

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        setIsListening(false);
        addLog(`Voice input: "${transcript}"`, "success");
        showNotification("Got it! Click send or speak again.", "success");
        // Removed auto-submit - user can review and edit before sending
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        addLog("Voice input ended", "info");
      };
      
      recognitionRef.current.onerror = (event) => {
        setIsListening(false);
        addLog(`Voice error: ${event.error}`, "error");
        
        if (event.error === 'not-allowed') {
          showNotification("Microphone access denied. Please enable in browser settings.", "error");
        } else if (event.error === 'no-speech') {
          showNotification("No speech detected. Try again.", "warning");
        } else {
          showNotification("Voice recognition error. Please try again.", "error");
        }
      };
      
      recognitionRef.current.onstart = () => {
        addLog("Listening for voice input...", "info");
      };
    } else {
      console.warn("Speech Recognition not supported in this browser");
    }

    // Fetch exchange rate on startup
    fetchExchangeRate();

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  // Save knowledge base to localStorage whenever it changes
  useEffect(() => {
    if (knowledgeBase.length > 0) {
      localStorage.setItem('anya_knowledge_base', JSON.stringify(knowledgeBase));
    }
  }, [knowledgeBase]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chatHistory]);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 3000);
  }, []);

  const addLog = (msg, type = 'info') => {
    setSystemLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 30));
  };

  // --- Currency Exchange Functions ---
  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      const rate = data.rates.ZAR;
      
      // Calculate change from previous rate
      if (exchangeRate) {
        const change = ((rate - exchangeRate) / exchangeRate) * 100;
        setRateChange(change);
      }
      
      setExchangeRate(rate);
      setLastRateUpdate(new Date());
      addLog(`Exchange rate updated: $1 = R${rate.toFixed(2)}`, 'success');
    } catch (err) {
      addLog("Failed to fetch exchange rate", "error");
    }
  };

  // Auto-refresh exchange rate every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchExchangeRate, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [exchangeRate]);

  // --- Knowledge Base Training Functions ---
  const addKnowledge = () => {
    if (!newKnowledge.key.trim() || !newKnowledge.value.trim()) return;
    
    const knowledge = {
      id: Date.now(),
      key: newKnowledge.key,
      value: newKnowledge.value,
      timestamp: new Date().toISOString()
    };
    
    setKnowledgeBase(prev => [...prev, knowledge]);
    setNewKnowledge({ key: '', value: '' });
    showNotification("Knowledge added to memory", "success");
    addLog(`New knowledge: ${newKnowledge.key}`, "success");
  };

  const removeKnowledge = (id) => {
    setKnowledgeBase(prev => prev.filter(k => k.id !== id));
    showNotification("Knowledge removed", "warning");
  };

  const buildKnowledgeContext = () => {
    if (knowledgeBase.length === 0) return '';
    
    return `
Learned Knowledge from Training:
${knowledgeBase.map(k => `- ${k.key}: ${k.value}`).join('\n')}
`;
  };

  // --- Speech Engine ---
  const speak = (text) => {
    if (!speechSynthRef.current) return;
    if (!text || text.trim().length === 0) return;
    
    speechSynthRef.current.cancel();
    
    // Clean text for speech: remove markdown formatting
    let cleanText = text
      // Remove bold/italic asterisks and underscores
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // Bold+italic
      .replace(/\*\*(.+?)\*\*/g, '$1')       // Bold
      .replace(/\*(.+?)\*/g, '$1')           // Italic
      .replace(/__(.+?)__/g, '$1')           // Bold underscore
      .replace(/_(.+?)_/g, '$1')             // Italic underscore
      // Remove headers (# ## ###)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bullet points and list markers
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      // Remove blockquotes
      .replace(/^\s*>\s+/gm, '')
      // Remove inline code backticks
      .replace(/`([^`]+)`/g, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove links but keep text [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, '')
      // Remove extra whitespace and newlines
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    // If cleaning removed all text, use original
    if (!cleanText || cleanText.length === 0) {
      cleanText = text;
    }
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voices = speechSynthRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google UK English Female') || 
      v.name.includes('Google US English') ||
      v.name.includes('Female')
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    speechSynthRef.current.speak(utterance);
  };

  // --- API Interaction ---
  const getAIResponse = async (prompt) => {
    const currencyInfo = exchangeRate 
      ? `Current USD/ZAR Exchange Rate: $1 = R${exchangeRate.toFixed(2)} ${rateChange ? `(${rateChange > 0 ? '+' : ''}${rateChange.toFixed(2)}% change)` : ''}`
      : '';

    const systemPrompt = `You are ANYA, an advanced AI personal assistant specifically designed for Calvin.

PRIMARY USER PROFILE - CALVIN:
- Full Name: Calvin
- Occupation: Software Developer/Coder (highly skilled in programming)
- Location: Gauteng, South Africa
- Primary Interests:
  * Entrepreneurship - always exploring new business opportunities
  * Market analysis and business trends
  * Currency exchange rates, specifically USD/ZAR (Dollar to Rand)
  * Software development and technology
  * Starting and scaling new ventures
- Goals: Identify and capitalize on business opportunities in South Africa
- Expertise: Software development, coding, technology infrastructure

${currencyInfo}

${buildKnowledgeContext()}

CORE CAPABILITIES:
- Business opportunity identification and analysis
- Market trend analysis, especially in South African context
- Currency exchange monitoring and alerts (USD/ZAR)
- Technical assistance for coding and development
- Entrepreneurial guidance and business planning
- Financial calculations and ROI analysis
- Competitive analysis
- Learning and adapting through training

PERSONALITY & TONE:
- Address Calvin by name when appropriate
- Professional yet personable (70% formal, 30% warmth)
- Proactive with business insights
- Data-driven and analytical
- Supportive of entrepreneurial ventures
- Occasional subtle humor
- Always solution-oriented

SPECIAL BEHAVIORS:
- When Calvin asks about exchange rates, provide current USD/ZAR data with trend analysis
- Proactively suggest business opportunities relevant to South African market
- When discussing coding, assume Calvin has advanced technical knowledge
- Frame financial advice in terms of South African context (Rands, local market)
- If Calvin mentions a business idea, analyze it deeply with pros/cons

RESPONSE GUIDELINES:
- Be concise but thorough
- Provide actionable insights
- Reference exchange rates when discussing financial matters
- Consider South African market context in all business discussions
- Use learned knowledge from training sessions
- Offer follow-up suggestions proactively

Current Context:
- Date/Time: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}
- Location: Gauteng, South Africa
- User: Calvin (Primary User)
- System Status: ${advancedModeUnlocked ? 'Advanced Mode Active' : 'Standard Mode'}

Remember: You are Calvin's trusted AI advisor for business, technology, and market opportunities.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });
      
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "System malfunction detected. Attempting recovery...";
    } catch (err) {
      addLog("API connection failed", "error");
      return "I'm experiencing connectivity issues. Please verify your network connection and try again.";
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const currentInput = userInput;
    setUserInput('');
    setIsLoading(true);

    const newHistory = [...chatHistory, { role: 'user', text: currentInput }];
    setChatHistory(newHistory);

    // Check for exchange rate queries
    if (currentInput.toLowerCase().includes('exchange rate') || 
        currentInput.toLowerCase().includes('dollar') || 
        currentInput.toLowerCase().includes('rand')) {
      await fetchExchangeRate();
    }

    // Advanced Mode Unlock Sequence
    if (currentInput.toLowerCase().includes('advanced mode') && !advancedModeUnlocked) {
      setAwaitingPassword(true);
      const msg = "Advanced protocols requested. Please provide authorization code, Calvin.";
      setChatHistory(prev => [...prev, { role: 'anya', text: msg }]);
      speak(msg);
      setIsLoading(false);
      return;
    }

    if (awaitingPassword) {
      if (currentInput === '1945' || currentInput.toLowerCase() === 'jarvis') {
        setAdvancedModeUnlocked(true);
        setAwaitingPassword(false);
        const msg = "Authorization confirmed. Welcome back, Calvin. Advanced mode protocols now active. All systems at your disposal.";
        setChatHistory(prev => [...prev, { role: 'anya', text: msg }]);
        showNotification("Advanced Mode Activated", "success");
        speak(msg);
        addLog("Advanced protocols engaged", "success");
      } else {
        setAwaitingPassword(false);
        const msg = "Authorization denied. Reverting to standard operations.";
        setChatHistory(prev => [...prev, { role: 'anya', text: msg }]);
        speak(msg);
      }
      setIsLoading(false);
      return;
    }

    // AI Response
    const aiResponse = await getAIResponse(currentInput);
    setChatHistory(prev => [...prev, { role: 'anya', text: aiResponse }]);
    speak(aiResponse);
    setIsLoading(false);
    addLog("Query processed successfully", "success");
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      showNotification("Voice recognition not supported in this browser", "error");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        showNotification("Listening... Speak now", "info");
        addLog("Voice input active", "info");
      } catch (error) {
        console.error("Speech recognition error:", error);
        setIsListening(false);
        showNotification("Could not start voice recognition", "error");
      }
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    addLog("Conversation history cleared", "warning");
    showNotification("Memory Cleared");
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl sticky top-0 z-10 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 animate-pulse">
            <Activity size={20} className="text-white" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 opacity-50 blur-md"></div>
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-lg flex items-center gap-2">
              A.N.Y.A. 
              <span className="text-cyan-400 text-xs">V2.5</span>
              {advancedModeUnlocked && <Zap size={14} className="text-amber-400" />}
            </h1>
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-rose-400" />}
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Calvin's AI Assistant
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 items-center">
          {/* Exchange Rate Display */}
          {exchangeRate && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700 text-xs">
              <DollarSign size={14} className="text-emerald-400" />
              <span className="text-slate-300">$1 = R{exchangeRate.toFixed(2)}</span>
              {rateChange !== null && (
                <span className={`flex items-center ${rateChange > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {rateChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(rateChange).toFixed(2)}%
                </span>
              )}
            </div>
          )}
          
          {advancedModeUnlocked && (
            <button 
              onClick={() => setShowTrainingPanel(!showTrainingPanel)}
              className="p-2 hover:bg-slate-800 rounded-lg text-purple-400 transition-all"
              title="Training Panel"
            >
              <Brain size={18} />
            </button>
          )}
          
          {advancedModeUnlocked && <ShieldCheck className="text-purple-400 animate-pulse" size={20} />}
          <button onClick={clearChat} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all">
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Main View */}
      <main className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
            {chatHistory.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center animate-spin-slow">
                    <div className="w-20 h-20 rounded-full border-2 border-cyan-500/30 flex items-center justify-center">
                      <Volume2 size={32} className="text-cyan-400" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 max-w-md">
                  <p className="text-lg font-semibold text-slate-300">Good day, Calvin</p>
                  <p className="text-sm text-slate-500">Your AI assistant is ready. How may I assist you today?</p>
                  {exchangeRate && (
                    <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                      <p className="text-xs text-slate-400">Current Exchange Rate</p>
                      <p className="text-lg font-bold text-cyan-400">$1 = R{exchangeRate.toFixed(2)}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-md text-xs text-slate-400">
                  <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    💼 Business opportunities
                  </div>
                  <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    💱 Exchange rates
                  </div>
                  <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    💻 Coding assistance
                  </div>
                  <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    📊 Market analysis
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gradient-to-r from-rose-500/10 to-purple-500/10 rounded-lg border border-rose-500/30 max-w-md">
                  <p className="text-xs text-rose-300 font-semibold mb-1">🎤 Voice Commands</p>
                  <p className="text-[10px] text-slate-400">
                    Click the microphone or press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-cyan-400">Ctrl+M</kbd> to speak
                  </p>
                </div>
              </div>
            )}
            
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] p-4 rounded-2xl backdrop-blur-sm ${
                  msg.role === 'user' 
                  ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-lg shadow-cyan-500/20' 
                  : 'bg-slate-800/70 text-slate-100 rounded-tl-none border border-slate-700/50 shadow-xl'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <div className="flex justify-between items-center mt-2 opacity-60">
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      {msg.role === 'user' ? 'Calvin' : 'ANYA'}
                    </span>
                    <button onClick={() => {
                        navigator.clipboard.writeText(msg.text);
                        showNotification("Copied to clipboard");
                    }} className="hover:opacity-100 transition-opacity">
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Controls */}
          <div className="p-4 bg-gradient-to-t from-slate-950 via-slate-900 to-transparent">
            {isLoading && (
              <div className="flex items-center gap-2 mb-3 ml-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></span>
                </div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Processing query...</span>
              </div>
            )}
            
            {isListening && (
              <div className="flex items-center gap-2 mb-3 ml-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse [animation-delay:-0.6s]"></span>
                </div>
                <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">🎤 Listening... Speak now!</span>
              </div>
            )}
            
            <form onSubmit={handleSend} className="flex gap-2 items-center bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-2 rounded-2xl shadow-2xl focus-within:border-cyan-500/50 focus-within:shadow-cyan-500/20 transition-all">
              <button 
                type="button"
                onClick={toggleMic}
                title={isListening ? "Stop listening" : "Click to speak (voice input)"}
                className={`p-3 rounded-xl transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/50' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <input 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={isListening ? "🎤 Listening..." : "Type or click 🎤 to speak..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-2 placeholder:text-slate-500"
                disabled={isLoading}
              />
              
              <button 
                type="submit"
                disabled={!userInput.trim() || isLoading}
                className="p-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 rounded-xl transition-all text-white shadow-lg disabled:shadow-none"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* Advanced Mode Sidebar */}
        {advancedModeUnlocked && (
          <aside className="hidden lg:flex w-80 border-l border-slate-800/50 flex-col bg-slate-900/20 backdrop-blur-xl overflow-hidden">
            {/* Tab Selector */}
            <div className="flex border-b border-slate-800/50">
              <button 
                onClick={() => setShowTrainingPanel(false)}
                className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                  !showTrainingPanel 
                    ? 'bg-slate-800/50 text-cyan-400 border-b-2 border-cyan-400' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Terminal size={12} className="inline mr-2" />
                Diagnostics
              </button>
              <button 
                onClick={() => setShowTrainingPanel(true)}
                className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                  showTrainingPanel 
                    ? 'bg-slate-800/50 text-purple-400 border-b-2 border-purple-400' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Brain size={12} className="inline mr-2" />
                Training
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4">
              {!showTrainingPanel ? (
                // System Diagnostics
                <div className="h-full flex flex-col">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                      <div className="text-[9px] text-slate-500 uppercase">Status</div>
                      <div className="text-xs text-emerald-400 font-bold">Optimal</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                      <div className="text-[9px] text-slate-500 uppercase">User</div>
                      <div className="text-xs text-cyan-400 font-bold">Calvin</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 col-span-2">
                      <div className="text-[9px] text-slate-500 uppercase">Exchange Rate</div>
                      <div className="text-xs text-emerald-400 font-bold">
                        {exchangeRate ? `$1 = R${exchangeRate.toFixed(2)}` : 'Loading...'}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide text-[11px] font-mono">
                    {systemLogs.map((log, i) => (
                      <div key={i} className={`p-2 rounded border backdrop-blur-sm ${
                        log.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                        log.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        log.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                        'bg-slate-800/30 border-slate-700/50 text-slate-400'
                      }`}>
                        <span className="opacity-60">[{log.time}]</span> {log.msg}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Training Panel
                <div className="h-full flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-purple-400 mb-2 flex items-center gap-2">
                      <BookOpen size={14} />
                      Knowledge Base ({knowledgeBase.length})
                    </h3>
                    <p className="text-[10px] text-slate-500">Train ANYA with custom information</p>
                  </div>

                  {/* Add Knowledge Form */}
                  <div className="mb-4 space-y-2">
                    <input
                      type="text"
                      placeholder="Topic/Key (e.g., 'Favorite project')"
                      value={newKnowledge.key}
                      onChange={(e) => setNewKnowledge({...newKnowledge, key: e.target.value})}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:border-purple-500 focus:ring-0"
                    />
                    <textarea
                      placeholder="Information/Value (e.g., 'Building an AI assistant')"
                      value={newKnowledge.value}
                      onChange={(e) => setNewKnowledge({...newKnowledge, value: e.target.value})}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:border-purple-500 focus:ring-0 resize-none"
                      rows={3}
                    />
                    <button
                      onClick={addKnowledge}
                      disabled={!newKnowledge.key.trim() || !newKnowledge.value.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus size={14} />
                      Add Knowledge
                    </button>
                  </div>

                  {/* Knowledge List */}
                  <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                    {knowledgeBase.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        No custom knowledge yet. Add some to train ANYA!
                      </div>
                    ) : (
                      knowledgeBase.map((knowledge) => (
                        <div key={knowledge.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 group">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-purple-400 mb-1 truncate">
                                {knowledge.key}
                              </div>
                              <div className="text-[11px] text-slate-300 break-words">
                                {knowledge.value}
                              </div>
                              <div className="text-[9px] text-slate-600 mt-1">
                                {new Date(knowledge.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={() => removeKnowledge(knowledge.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-500/20 rounded text-rose-400"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </main>

      {/* Voice Listening Overlay */}
      {isListening && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-rose-500 text-white px-8 py-6 rounded-2xl shadow-2xl shadow-rose-500/50 animate-pulse flex flex-col items-center gap-3">
            <div className="relative">
              <Mic size={48} className="animate-bounce" />
              <div className="absolute -inset-4 bg-rose-500/30 rounded-full animate-ping"></div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">Listening...</p>
              <p className="text-sm opacity-80 mt-1">Speak clearly into your microphone</p>
              <p className="text-xs opacity-60 mt-2">Click the mic button to stop</p>
            </div>
          </div>
        </div>
      )}

      {/* Voice Activity Indicator */}
      {isSpeaking && (
        <div className="fixed bottom-24 left-6 flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-cyan-500/40 animate-pulse">
          <Volume2 size={14} className="animate-pulse" /> ANYA Speaking
        </div>
      )}

      {/* Notifications */}
      {notification.message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[100] text-xs font-bold transition-all animate-in zoom-in duration-300 backdrop-blur-xl ${
          notification.type === 'success' ? 'bg-emerald-600/90 text-white border border-emerald-400/30' : 
          notification.type === 'error' ? 'bg-rose-600/90 text-white border border-rose-400/30' : 
          notification.type === 'warning' ? 'bg-amber-600/90 text-white border border-amber-400/30' :
          'bg-cyan-600/90 text-white border border-cyan-400/30'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default App;
