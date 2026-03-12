
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ArrowRight, Check, AlertCircle, ShoppingCart, 
  Youtube, Sparkles, Scale, ExternalLink, ShieldCheck, 
  Tag, Loader2, TrendingUp, Info, Filter, X, ChevronLeft,
  Trophy, Plus, Minus, BarChart3, Star, ChevronDown, 
  MessageCircle, ThumbsUp, MessageSquare, PlusCircle, Heart,
  MinusCircle, Mic, MicOff, Volume2, StopCircle,
  Bell, BellRing, RefreshCw, Recycle, TrendingDown, DollarSign, Zap, Activity
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function BuyWiseV2() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [view, setView] = useState<'landing' | 'results' | 'personalize' | 'analysis' | 'compare'>('landing');
  const [showReddit, setShowReddit] = useState(false);
  const [showCompareSelection, setShowCompareSelection] = useState(false);
  const [compareSearchQuery, setCompareSearchQuery] = useState('');
  const [compareError, setCompareError] = useState<string | null>(null);
  
  // AI Advisor & Personalization States
  const [aiPreferences, setAiPreferences] = useState<any>({
    budget: '',
    useCase: '',
    priorities: []
  });
  const [advisorResults, setAdvisorResults] = useState<any[]>([]);
  
  // Price Alert States
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);

  // Refurbished Deals States
  const [refurbListings, setRefurbListings] = useState<any[]>([]);
  const [refurbLoading, setRefurbLoading] = useState(false);
  const [showRefurbished, setShowRefurbished] = useState(false);

  // Voice System States
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupport, setVoiceSupport] = useState({ recognition: false, synthesis: false });

  React.useEffect(() => {
    const hasRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasSynthesis = 'speechSynthesis' in window;
    setVoiceSupport({ recognition: !!hasRecognition, synthesis: hasSynthesis });
  }, []);

  const speak = (text: string) => {
    if (!voiceSupport.synthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = (onFinal?: (text: string) => void) => {
    if (!voiceSupport.recognition) return;
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      if (onFinal) onFinal(transcript);
      else performVoiceSearch(transcript);
    };
    recognition.start();
  };

  const performVoiceSearch = async (voiceQuery: string) => {
    setLoading(true);
    try {
      const searchRes = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'search', query: voiceQuery, preferences: aiPreferences })
      });
      const searchData = await searchRes.json();
      setSearchResults(searchData.results || []);
      setView('results');
      if (searchData.results?.[0]?.aiReasoning) {
        speak(`I found some products for you. The top match is ${searchData.results[0].name}. ${searchData.results[0].aiReasoning}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Marketplace image failed to load â€” use a neutral tech placeholder
    e.currentTarget.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none"><rect width="200" height="200" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14" font-weight="bold">No Image</text></svg>');
    e.currentTarget.onerror = null;
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query) return;

    setLoading(true);
    try {
      const searchRes = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'search', query, preferences: aiPreferences })
      });
      const searchData = await searchRes.json();
      setSearchResults(searchData.results || []);
      setView('results');
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleSelectProduct = async (productId: string) => {
    setLoading(true);
    try {
      const detailRes = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'detail', productId, preferences: aiPreferences })
      });
      const dData = await detailRes.json();
      setDetailData(dData);
      setSelectedIds([productId]);
      setView('analysis');
      setShowReddit(false);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const toggleCompare = (product: any) => {
    if (selectedIds.length > 0) {
      const firstSelectedId = selectedIds[0];
      const isProductInCategory = true; // In current mock, categories are enforced in selection
    }

    if (selectedIds.includes(product.id)) {
      setSelectedIds(prev => prev.filter(id => id !== product.id));
    } else {
      if (selectedIds.length < 5) {
        setSelectedIds(prev => [...prev, product.id]);
      }
    }
  };

  const handleAddToCompareInModal = (product: any) => {
    // Loosen category check for AI results which might vary slightly in naming
    const pCat = product.category.toLowerCase().replace(/s$/, '');
    const dCat = detailData.product.category.toLowerCase().replace(/s$/, '');
    
    if (pCat !== dCat && !pCat.includes(dCat) && !dCat.includes(pCat)) {
      setCompareError(`This product appears to be a ${product.category}, not a ${detailData.product.category}`);
      setTimeout(() => setCompareError(null), 3000);
      return;
    }
    if (selectedIds.includes(product.id)) return;
    if (selectedIds.length >= 5) return;
    setSelectedIds(prev => [...prev, product.id]);
  };

  const handleCompareSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!compareSearchQuery) return;
    
    setLoading(true);
    setSearchResults([]); // Clear old results to avoid image mismatch/confusion
    try {
      const searchRes = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'search', query: compareSearchQuery, preferences: aiPreferences })
      });
      const searchData = await searchRes.json();
      setSearchResults(searchData.results || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareFinal = async () => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'compare', productIds: selectedIds, preferences: aiPreferences })
      });
      const data = await response.json();
      setCompareData(data);
      setView('compare');
      setShowCompareSelection(false);
      setShowReddit(false);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  // ── Price Alert Handler ──
  const handleCreateAlert = async () => {
    if (!alertTargetPrice || !detailData?.product?.id) return;
    setAlertLoading(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: detailData.product.id,
          targetPrice: parseFloat(alertTargetPrice),
          email: alertEmail || undefined,
        }),
      });
      if (res.ok) {
        setAlertSuccess(true);
        setTimeout(() => { setAlertSuccess(false); setShowAlertModal(false); }, 2500);
      }
    } catch (err) {
      console.error('Alert creation failed:', err);
    } finally {
      setAlertLoading(false);
    }
  };

  // ── Refurbished Deals Fetcher ──
  const fetchRefurbishedDeals = async () => {
    if (!detailData?.product?.id) return;
    setRefurbLoading(true);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'refurbished', productId: detailData.product.id }),
      });
      const data = await res.json();
      setRefurbListings(data.allListings || data.listings || []);
      setShowRefurbished(true);
    } catch (err) {
      console.error('Refurbished fetch failed:', err);
    } finally {
      setRefurbLoading(false);
    }
  };

  const getDynamicAttributes = () => {
    if (!compareData) return [];
    const keys = new Set<string>();
    compareData.products.forEach((p: any) => {
      Object.keys(p.baseSpecs).forEach(k => keys.add(k));
    });
    return Array.from(keys);
  };

  const fadeVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] font-sans selection:bg-blue-100">
      {/* Premium Header */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => { setView('landing'); setQuery(''); setDetailData(null); setSelectedIds([]); setCompareData(null); }}
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-right text-black"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            BuyWise
          </button>
          
          <div className="flex items-center gap-6">
            {view === 'analysis' && detailData && (
              <button 
                onClick={() => setShowCompareSelection(true)}
                className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95"
              >
                <Scale className="w-4 h-4" /> Compare (+{selectedIds.length-1})
              </button>
            )}
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none text-right text-black">Buy Smarter,<br/>Not Harder.</div>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-40 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          
          {/* 1. LANDING VIEW */}
          {view === 'landing' && !loading && (
            <motion.div key="landing" initial="hidden" animate="visible" exit="exit" variants={fadeVariants} className="text-center py-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-8">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Next-Gen Product Research</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-8 bg-gradient-to-b from-black to-gray-500 bg-clip-text text-transparent leading-[1.1]">
                Your Intelligent <br/>Purchase Advisor.
              </h1>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-16 leading-relaxed font-medium">
                Describe what you need in natural language or search specifically. AI does the deep research for you.
              </p>

              <div className="max-w-3xl mx-auto space-y-12">
                {/* AI ADVISOR SEARCH */}
                <div className="relative group">
                   <div className="absolute -top-3 left-8 px-3 bg-white text-[10px] font-black text-blue-600 uppercase tracking-widest z-10">Ask AI Counselor</div>
                   <form onSubmit={handleSearch} className="relative group max-w-3xl mx-auto w-full">
                     <input 
                       type="text" 
                       value={query}
                       onChange={(e) => setQuery(e.target.value)}
                       placeholder="I need a lightweight laptop for coding..."
                       className="w-full pl-16 pr-32 py-8 bg-white border border-gray-100 rounded-[32px] text-2xl shadow-2xl shadow-blue-100/50 outline-none focus:border-blue-500 transition-all text-black font-medium"
                     />
                     <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-gray-300 group-focus-within:text-blue-500" />
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {voiceSupport.recognition && (
                           <button 
                             type="button"
                             onClick={() => startListening()}
                             className={cn(
                               "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                               isListening ? "bg-red-500 text-white animate-pulse" : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-black"
                             )}
                           >
                             <Mic className="w-5 h-5" />
                           </button>
                        )}
                        <button type="submit" className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-colors">
                           <ArrowRight className="w-6 h-6" />
                        </button>
                     </div>
                  </form>
                </div>

                <div className="flex items-center gap-4 py-4">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">OR</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* QUICK CATEGORY SEARCH */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['S25 Ultra', 'MacBook Air', 'Mattress', 'Gaming Mouse'].map(term => (
                    <button 
                      key={term} onClick={() => { setQuery(term); handleSearch(); }}
                      className="px-6 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-500 hover:border-black hover:text-black transition-all"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}          {/* 2. AI ADVISOR RESULTS */}
          {view === 'results' && !loading && (
            <motion.div key="results" initial="hidden" animate="visible" variants={fadeVariants} className="space-y-12">
               <div className="text-center max-w-2xl mx-auto">
                  <h2 className="text-4xl font-black tracking-tight mb-4 text-black">Live Market Results</h2>
                  <p className="text-gray-400 font-medium">Found {searchResults.length} products with real-time pricing from Amazon, Flipkart, Croma \u0026 Reliance Digital.</p>
               </div>
               
                <div className="flex flex-wrap justify-center gap-6">
                  {searchResults.length > 0 ? (
                    searchResults.map(p => (
                      <div 
                        key={p.id} 
                        className="group bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col items-center gap-6 min-w-[320px] max-w-[400px] relative overflow-hidden"
                      >
                         {p.confidenceScore && (
                           <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                             {p.confidenceScore}% Match
                           </div>
                         )}
                         
                         <div className="w-40 h-40 relative flex items-center justify-center bg-white rounded-[24px] group-hover:bg-blue-50 transition-colors border border-gray-50">
                            <img 
                              src={p.image} 
                              onError={handleImageError}
                              className="max-h-[85%] object-contain transition-transform group-hover:scale-110" 
                            />
                         </div>
                         
                         <div className="text-center space-y-3">
                            <div>
                               <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">{p.category}</div>
                               <div className="font-black text-xl leading-tight text-black line-clamp-1">{p.name}</div>
                            </div>
                            
                            {p.aiReasoning && (
                              <div className="bg-blue-50/50 p-4 rounded-2xl text-[11px] font-medium text-blue-800 leading-relaxed italic">
                                "{p.aiReasoning}"
                              </div>
                            )}
                            
                            <div className="text-lg font-black text-black">{p.bestPrice > 0 ? `Starting at ₹${p.bestPrice.toLocaleString()}` : 'Check market'}</div>
                         </div>

                         <div className="flex gap-3 w-full">
                           <button 
                             onClick={() => handleSelectProduct(p.id)}
                             className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
                           >
                              Analyze Detail <ArrowRight className="w-3.5 h-3.5" />
                           </button>
                           <button 
                             onClick={() => toggleCompare(p)}
                             className={cn(
                               "px-4 rounded-2xl transition-all flex items-center justify-center",
                               selectedIds.includes(p.id) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                             )}
                           >
                             <Scale className="w-5 h-5" />
                           </button>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 flex flex-col items-center gap-6">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-black">
                        <Search className="w-10 h-10 text-gray-300" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-2xl font-black text-black">No products found</h3>
                        <p className="text-gray-400 font-medium">Try refining your search query</p>
                      </div>
                      <button onClick={() => setView('landing')} className="text-blue-600 font-bold hover:underline">Go back to home</button>
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="flex justify-center pt-8">
                     <button 
                       onClick={() => setView('personalize')}
                       className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-12 py-6 rounded-full text-sm font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-blue-200 hover:scale-105 transition-all"
                     >
                       <Sparkles className="w-5 h-5" /> Personalize My Choice
                     </button>
                  </div>
                )}
            </motion.div>
          )}

          {/* 3. PERSONALIZATION VIEW */}
          {view === 'personalize' && !loading && (
            <motion.div key="personalize" initial="hidden" animate="visible" exit="exit" variants={fadeVariants} className="max-w-4xl mx-auto space-y-12 py-12">
               <div className="text-center space-y-4">
                  <h2 className="text-4xl font-black tracking-tight text-black">What Matters Most?</h2>
                  <p className="text-gray-400 font-medium text-black">Help us find the perfect match by defining your priorities.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
                  <div className="space-y-8">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Primary Priorities</h3>
                     <div className="grid grid-cols-2 gap-4">
                        {['performance', 'battery', 'price', 'portability', 'durability'].map(priority => {
                           const active = aiPreferences.priorities.includes(priority);
                           return (
                             <button 
                               key={priority}
                               onClick={() => {
                                 const next = active 
                                   ? aiPreferences.priorities.filter((p: string) => p !== priority)
                                   : [...aiPreferences.priorities, priority];
                                 setAiPreferences({ ...aiPreferences, priorities: next });
                               }}
                               className={cn(
                                 "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group",
                                 active ? "border-blue-600 bg-blue-50/50" : "border-gray-50 bg-white hover:border-gray-200"
                               )}
                             >
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400")}>
                                   {priority === 'performance' && <TrendingUp className="w-5 h-5" />}
                                   {priority === 'battery' && <Sparkles className="w-5 h-5" />}
                                   {priority === 'price' && <Tag className="w-5 h-5" />}
                                   {priority === 'portability' && <ExternalLink className="w-5 h-5" />}
                                   {priority === 'durability' && <ShieldCheck className="w-5 h-5" />}
                                </div>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", active ? "text-blue-600" : "text-gray-400")}>{priority}</span>
                             </button>
                           );
                        })}
                     </div>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Context & Budget</h3>
                    <div className="space-y-6">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Primary Use Case</label>
                          <div className="grid grid-cols-2 gap-3">
                             {['gaming', 'work', 'photography', 'daily'].map(useCase => (
                               <button 
                                 key={useCase}
                                 onClick={() => setAiPreferences({ ...aiPreferences, useCase })}
                                 className={cn(
                                   "py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all",
                                   aiPreferences.useCase === useCase ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
                                 )}
                               >
                                 {useCase}
                               </button>
                             ))}
                          </div>
                       </div>
                       
                       <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Max Budget (Optional)</label>
                          <input 
                            type="number"
                            placeholder="e.g. 70000"
                            value={aiPreferences.budget}
                            onChange={(e) => setAiPreferences({ ...aiPreferences, budget: e.target.value })}
                            className="w-full px-6 py-5 bg-white border border-gray-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-black"
                          />
                       </div>
                    </div>
                  </div>
               </div>

               <div className="flex justify-center pt-12 gap-6">
                  <button onClick={() => setView('results')} className="px-12 py-5 font-black text-[10px] uppercase text-gray-400 hover:text-black tracking-widest transition-colors">Go Back</button>
                  <button 
                    onClick={() => {
                      if (selectedIds.length >= 2) {
                        handleCompareFinal();
                      } else {
                        handleSearch();
                      }
                    }}
                    className="bg-black text-white px-16 py-6 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all"
                  >
                    Apply & Re-Score
                  </button>
               </div>
            </motion.div>
          )}


          {/* 3. PRODUCT ANALYSIS VIEW */}
          {view === 'analysis' && !loading && detailData && (
            <motion.div key="analysis" initial="hidden" animate="visible" variants={fadeVariants} className="space-y-20">
              <button 
                onClick={() => setView('results')}
                className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Selection
              </button>

              <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-10 items-center">
                 <div className="w-full md:w-64 aspect-square relative flex items-center justify-center p-8 bg-white rounded-[32px] border border-gray-50 flex-none">
                    <img 
                      src={detailData.product.image} 
                      onError={handleImageError}
                      className="max-h-full object-contain" 
                    />
                 </div>
                 <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Analysis Match</span>
                       <div className="flex items-center gap-1 text-xs font-bold text-gray-400"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {detailData.product.rating}</div>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight text-black">{detailData.product.name}</h2>
                    <div className="flex gap-8 items-center">
                       <div>
                          <div className="text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">Market Lowest</div>
                          <div className="text-3xl font-black text-black">₹{detailData.product.bestPrice.toLocaleString()}</div>
                       </div>
                       <div className="w-px h-10 bg-gray-100" />
                       <div>
                          <div className="text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">BuyWise Score</div>
                          <div className="text-3xl font-black text-blue-600">{detailData.product.overallDealScore}%</div>
                       </div>
                       <div className="w-px h-10 bg-gray-100" />
                       <button 
                         onClick={() => speak(`The BuyWise score for ${detailData.product.name} is ${detailData.product.overallDealScore} percent. Here is our analysis: ${detailData.product.aiReasoning}`)}
                         className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                       >
                         <Volume2 className="w-4 h-4" /> Listen
                       </button>
                    </div>
                 </div>
              </div>

               {/* AI PURCHASE ADVISOR — FULL RESPONSE */}
               <div className="bg-gradient-to-br from-indigo-900 to-black rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
                  
                  {/* ALERT TRIGGERED BANNER */}
                  {detailData.advisor?.priceDropAlertTriggered && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 bg-emerald-500/20 border border-emerald-400/30 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-sm relative z-10">
                      <div className="w-12 h-12 bg-emerald-400 rounded-xl flex items-center justify-center animate-pulse"><BellRing className="w-6 h-6 text-white" /></div>
                      <div>
                        <div className="text-sm font-black text-emerald-300 uppercase tracking-widest">Price Drop Alert Triggered!</div>
                        <p className="text-emerald-100/80 text-xs font-medium mt-1">The price has dropped to your target — act now!</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
                    <div className="space-y-8">
                      {/* HEADER: Advisor + Recommendation Badge */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <Sparkles className="w-7 h-7 text-blue-400" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black tracking-[0.2em] text-blue-300 uppercase mb-1">AI Purchase Advisor</div>
                            <div className="text-4xl font-black tracking-tight">{detailData.advisor?.dealQuality || detailData.product.dealQuality}</div>
                          </div>
                        </div>
                        {/* BUY RECOMMENDATION BADGE */}
                        {detailData.advisor?.buyRecommendation && (
                          <div className={cn(
                            "px-5 py-3 rounded-2xl text-sm font-black uppercase tracking-widest whitespace-nowrap flex items-center gap-2 shadow-lg",
                            detailData.advisor.buyRecommendation === 'Buy Now' ? "bg-emerald-500 text-white shadow-emerald-500/30" :
                            detailData.advisor.buyRecommendation === 'Wait for Drop' ? "bg-amber-500 text-white shadow-amber-500/30" :
                            "bg-blue-500 text-white shadow-blue-500/30"
                          )}>
                            {detailData.advisor.buyRecommendation === 'Buy Now' && <ShoppingCart className="w-4 h-4" />}
                            {detailData.advisor.buyRecommendation === 'Wait for Drop' && <TrendingDown className="w-4 h-4" />}
                            {detailData.advisor.buyRecommendation === 'Consider Alternatives' && <RefreshCw className="w-4 h-4" />}
                            {detailData.advisor.buyRecommendation}
                          </div>
                        )}
                      </div>

                      {/* DEAL SCORE METER */}
                      <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> Deal Score</div>
                          <div className="text-3xl font-black">{detailData.advisor?.dealScore || detailData.product.overallDealScore}%</div>
                        </div>
                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} animate={{ width: `${detailData.advisor?.dealScore || detailData.product.overallDealScore}%` }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            className={cn(
                              "h-full rounded-full",
                              (detailData.advisor?.dealScore || detailData.product.overallDealScore) >= 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-300" :
                              (detailData.advisor?.dealScore || detailData.product.overallDealScore) >= 60 ? "bg-gradient-to-r from-blue-400 to-blue-300" :
                              "bg-gradient-to-r from-amber-400 to-amber-300"
                            )}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                          <span>Poor</span><span>Fair</span><span>Good</span><span>Excellent</span>
                        </div>
                      </div>
                      
                      {/* REASONING LIST */}
                      <div className="space-y-4">
                        {(detailData.advisor?.reasoning || detailData.aiAnalysis?.reasoning || []).map((reason: string, i: number) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-6 h-6 mt-1 flex-shrink-0 bg-blue-500/20 rounded-full flex items-center justify-center"><Check className="w-3.5 h-3.5 text-blue-400" /></div>
                            <p className="text-gray-300 text-sm leading-relaxed">{reason}</p>
                          </div>
                        ))}
                      </div>

                      {/* MARKETPLACE AVAILABILITY */}
                      {detailData.advisor?.marketplaceAvailability && (
                        <div className="bg-white/5 p-5 rounded-3xl border border-white/10 space-y-3">
                          <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><ShoppingCart className="w-3.5 h-3.5" /> Marketplace Availability</div>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(detailData.advisor.marketplaceAvailability).map(([platform, status]: [string, any]) => (
                              <div key={platform} className={cn(
                                "p-3 rounded-xl flex items-center gap-3",
                                String(status).includes('Not') ? "bg-red-500/10" : "bg-emerald-500/10"
                              )}>
                                <div className={cn(
                                  "w-2 h-2 rounded-full flex-shrink-0",
                                  String(status).includes('Not') ? "bg-red-400" : "bg-emerald-400"
                                )} />
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-white truncate">{platform}</div>
                                  {typeof status === 'string' && status.includes('₹') ? (
                                    <div className={cn(
                                      "text-[10px] uppercase font-bold tracking-wider truncate flex items-center gap-1.5",
                                      status.includes('Not') ? "text-red-300" : "text-emerald-300"
                                    )}>
                                      <span>{status}</span>
                                      {detailData.product.listings?.find((l: any) => l.platform === platform)?.originalPrice > 
                                       detailData.product.listings?.find((l: any) => l.platform === platform)?.price && (
                                        <div className="flex items-center gap-1.5 translate-y-[0.5px]">
                                          <span className="text-gray-500 line-through text-[9px]">
                                            ₹{detailData.product.listings.find((l: any) => l.platform === platform).originalPrice.toLocaleString()}
                                          </span>
                                          {detailData.product.listings.find((l: any) => l.platform === platform).discount > 0 && (
                                            <span className="text-emerald-400 text-[9px] font-black bg-emerald-500/10 px-1 py-0.5 rounded">
                                              {detailData.product.listings.find((l: any) => l.platform === platform).discount}% OFF
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className={cn(
                                      "text-[9px] font-bold uppercase tracking-wider truncate",
                                      String(status).includes('Not') ? "text-red-300" : "text-emerald-300"
                                    )}>{String(status)}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PRICE TREND SUMMARY */}
                      {detailData.advisor?.priceTrendSummary && (
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-5">
                          <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Price Intelligence</div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Current</div>
                              <div className="text-lg font-black text-white">₹{detailData.advisor.priceTrendSummary.currentPrice.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Avg (30d)</div>
                              <div className="text-lg font-black text-blue-300">₹{detailData.advisor.priceTrendSummary.historicalAverage.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Lowest</div>
                              <div className="text-lg font-black text-emerald-300">₹{detailData.advisor.priceTrendSummary.lowestPrice.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1 bg-white/5 p-3 rounded-xl">
                              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1">Volatility</div>
                              <div className={cn("text-sm font-black",
                                detailData.advisor.priceTrendSummary.volatility === 'Low' ? 'text-emerald-300' :
                                detailData.advisor.priceTrendSummary.volatility === 'Medium' ? 'text-amber-300' : 'text-red-300'
                              )}>{detailData.advisor.priceTrendSummary.volatility}</div>
                            </div>
                            <div className="flex-[2] bg-white/5 p-3 rounded-xl">
                              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1">Best Buying Window</div>
                              <div className="text-sm font-black text-blue-200">{detailData.advisor.priceTrendSummary.predictedBestBuyingWindow}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* HISTORICAL INSIGHTS ROW */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                           <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Best Buying Day</div>
                           <div className="text-lg font-black text-white">{detailData.product.historicalContext?.bestBuyingDay || "Tracking..."}</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                           <div className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Price Stability</div>
                           <div className="text-lg font-black text-white">{detailData.product.historicalContext?.volatility < 500 ? "Stable" : "Volatile"}</div>
                        </div>
                      </div>

                      {/* REFURBISHED OPTIONS */}
                      {detailData.advisor?.refurbishedOptions?.length > 0 && (
                        <div className="bg-emerald-500/10 border border-emerald-400/20 p-6 rounded-3xl space-y-4">
                          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Recycle className="w-3.5 h-3.5" /> Refurbished Options</div>
                          {detailData.advisor.refurbishedOptions.map((opt: any, i: number) => (
                            <div key={i} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                              <div>
                                <div className="text-sm font-black text-white">{opt.platform}</div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Grade {opt.conditionGrade} · {opt.warranty}</div>
                              </div>
                              <div className="text-xl font-black text-emerald-300">₹{opt.price.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* DETAILED ALTERNATIVES & UPGRADES */}
                      {detailData.advisor?.cheaperAlternative && (
                        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
                           <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingDown className="w-3.5 h-3.5" /> Cheaper Alternative</div>
                           <div className="flex justify-between items-start mb-2">
                             <div className="font-bold text-white text-sm">{detailData.advisor.cheaperAlternative.name}</div>
                             <div className="text-amber-300 font-black text-sm whitespace-nowrap">₹{detailData.advisor.cheaperAlternative.price?.toLocaleString()}</div>
                           </div>
                           <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Available on {detailData.advisor.cheaperAlternative.platform}</div>
                           <p className="text-xs text-gray-300 leading-relaxed">{detailData.advisor.cheaperAlternative.reasoning}</p>
                        </div>
                      )}

                      {detailData.advisor?.premiumUpgrade && (
                        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/20">
                           <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Premium Upgrade</div>
                           <div className="flex justify-between items-start mb-2">
                             <div className="font-bold text-white text-sm">{detailData.advisor.premiumUpgrade.name}</div>
                             <div className="text-purple-300 font-black text-sm whitespace-nowrap">₹{detailData.advisor.premiumUpgrade.price?.toLocaleString()}</div>
                           </div>
                           <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Available on {detailData.advisor.premiumUpgrade.platform}</div>
                           <p className="text-xs text-gray-300 leading-relaxed">{detailData.advisor.premiumUpgrade.reasoning}</p>
                        </div>
                      )}

                      {/* TOTAL COST OF OWNERSHIP & RESALE */}
                      {(detailData.advisor?.totalCostOfOwnership || detailData.advisor?.resaleValueEstimate) && (
                        <div className="grid grid-cols-2 gap-4 mt-2">
                           {detailData.advisor?.totalCostOfOwnership && (
                             <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                               <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Est. Total Cost</div>
                               <p className="text-xs text-gray-300 leading-snug">{detailData.advisor.totalCostOfOwnership}</p>
                             </div>
                           )}
                           {detailData.advisor?.resaleValueEstimate && (
                             <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                               <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Recycle className="w-3 h-3" /> Resale Value</div>
                               <p className="text-xs text-gray-300 leading-snug">{detailData.advisor.resaleValueEstimate}</p>
                             </div>
                           )}
                        </div>
                      )}
                      
                      <button 
                        onClick={() => setShowAlertModal(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white w-full py-5 rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-900/50 flex items-center justify-center gap-3"
                      >
                        <Bell className="w-5 h-5" /> Set Price Drop Alert
                      </button>
                    </div>

                    {/* PRICE TREND GRAPH */}
                    <div className="bg-black/50 border border-white/10 rounded-[32px] p-8 flex flex-col justify-between">
                      <div className="mb-6 flex justify-between items-end">
                        <div>
                          <h4 className="text-lg font-black text-white">30-Day Price Trend</h4>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Historical tracking</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-white">
                            {detailData.product.historicalContext?.avgPrice ? `₹${detailData.product.historicalContext.avgPrice.toLocaleString()}` : "—"}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Average Price</div>
                        </div>
                      </div>
                      
                      <div className="h-64 w-full">
                        {detailData.product.historicalContext?.trend?.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={detailData.product.historicalContext.trend}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                              <XAxis 
                                dataKey="date" 
                                stroke="#666" 
                                fontSize={10} 
                                tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis 
                                stroke="#666" 
                                fontSize={10} 
                                tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                              />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                labelStyle={{ color: '#999', fontSize: '10px', marginBottom: '4px' }}
                              />
                                <Line 
                                  type="monotone" 
                                  dataKey="price" 
                                  stroke="#3b82f6" 
                                  strokeWidth={3}
                                  dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#111' }}
                                  activeDot={{ r: 6, fill: '#fff' }}
                                />
                                {detailData.product.historicalContext?.minPrice && (
                                  <ReferenceLine 
                                    y={detailData.product.historicalContext.minPrice} 
                                    stroke="#22c55e" 
                                    strokeDasharray="3 3" 
                                    label={{ value: 'Best Price', position: 'right', fill: '#22c55e', fontSize: 10, fontWeight: 'bold' }} 
                                  />
                                )}
                              </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                             <TrendingUp className="w-8 h-8 mb-4 opacity-50" />
                             <p className="text-sm font-bold">Collecting price data...</p>
                             <p className="text-[10px] uppercase tracking-widest mt-1">Check back later for trends</p>
                          </div>
                        )}
                      </div>

                      {/* HISTORICAL INSIGHT QUOTE */}
                      {detailData.advisor?.historicalInsight && (
                        <div className="mt-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                          <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Historical Insight</div>
                          <p className="text-xs text-gray-400 italic leading-relaxed">"{detailData.advisor.historicalInsight}"</p>
                        </div>
                      )}
                    </div>
                  </div>
               </div>

               {/* Platform Comparison Row */}
              <div className="space-y-10">
                 <div className="flex justify-between items-end">
                    <h3 className="text-3xl font-black tracking-tight flex items-center gap-4 text-black">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center"><ShoppingCart className="w-6 h-6 text-blue-600" /></div> Market Availability
                    </h3>
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Across 4 Major Platforms</div>
                 </div>
                 <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar snap-x">
                    {['Amazon', 'Flipkart', 'Reliance Digital', 'Croma'].map(platform => {
                       const listing = detailData.product.listings.find((l: any) => l.platform === platform);
                       const isBest = listing?.price === detailData.product.bestPrice;
                       
                       return (
                        <div key={platform} className={cn(
                          "min-w-[320px] bg-white p-8 rounded-[40px] border snap-start flex flex-col gap-6 transition-all duration-500",
                          isBest ? "border-blue-500 shadow-xl shadow-blue-50" : "border-gray-100 shadow-sm"
                        )}>
                           <div className="flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center font-black text-[10px] uppercase text-black">{platform[0]}</div>
                                 <div className="font-black text-lg text-black">{platform}</div>
                              </div>
                              {isBest && <span className="text-[9px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">â­ Best Price</span>}
                           </div>
                           
                           {listing ? (
                             <>
                               <div className="flex justify-between items-end">
                                  <div>
                                     <div className="text-sm font-black text-green-600 uppercase tracking-widest">{listing.discount}% OFF</div>
                                     <div className="text-3xl font-black text-black">₹{listing.price.toLocaleString()}</div>
                                  </div>
                                  <div className="text-right">
                                     <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{listing.deliveryTime}</div>
                                     <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{listing.seller}</div>
                                  </div>
                               </div>
                               <button className="w-full py-4 bg-gray-50 hover:bg-black hover:text-white rounded-2xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 text-black">
                                 Buy on {platform} <ExternalLink className="w-3.5 h-3.5" />
                               </button>
                             </>
                           ) : (
                             <div className="flex-1 flex flex-col items-center justify-center text-center py-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                <div className="text-xs font-black text-gray-300 uppercase tracking-widest">Not Available</div>
                                <div className="text-[10px] text-gray-400 mt-1">Check other stores</div>
                             </div>
                           )}
                        </div>
                       );
                    })}
                 </div>
              </div>

              {/* REFURBISHED DEALS SECTION */}
              <div className="bg-emerald-50/50 rounded-[48px] p-12 border border-emerald-100 mt-12 mb-12">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      <Recycle className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-black">Refurbished & Renewed</h3>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Sustainability & Savings</p>
                    </div>
                  </div>
                  {!showRefurbished ? (
                    <button 
                      onClick={fetchRefurbishedDeals}
                      disabled={refurbLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      {refurbLoading ? "Searching..." : "Search Refurbished"}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowRefurbished(false)}
                      className="text-emerald-600 font-black text-xs uppercase tracking-widest"
                    >
                      Hide Deals
                    </button>
                  )}
                </div>

                {showRefurbished && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {refurbListings.length > 0 ? (
                      refurbListings.map((l: any, i: number) => (
                        <div key={i} className="bg-white p-6 rounded-[32px] border border-emerald-100 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{l.platform}</span>
                            <span className="text-lg font-black text-black">₹{l.price.toLocaleString()}</span>
                          </div>
                          <p className="text-sm font-bold text-gray-800 line-clamp-2 mb-4">{l.title}</p>
                          <a 
                            href={l.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2 hover:gap-3 transition-all"
                          >
                            View Deal <ArrowRight className="w-3 h-3" />
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center text-gray-500 font-bold text-sm">
                        No refurbished deals found for this product.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reddit Community Insights (Collapsible) */}
              <div className="bg-white rounded-[48px] border border-gray-100 overflow-hidden shadow-sm">
                <button onClick={() => setShowReddit(!showReddit)} className="w-full flex justify-between items-center px-12 py-12 hover:bg-gray-50 transition-all group">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 bg-[#FF4500]/10 rounded-3xl flex items-center justify-center"><MessageSquare className="w-8 h-8 text-[#FF4500]" /></div>
                     <div className="text-left">
                        <h3 className="text-3xl font-black tracking-tight text-black">Reddit Community Insights</h3>
                        <p className="text-sm font-medium text-gray-400">Real user experiences and long-term durability threads</p>
                     </div>
                  </div>
                  <motion.div animate={{ rotate: showReddit ? 180 : 0 }} className="p-4 bg-gray-50 rounded-full"><ChevronDown className="w-7 h-7 text-gray-400 group-hover:text-black transition-colors" /></motion.div>
                </button>
                <AnimatePresence>
                  {showReddit && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                       <div className="px-12 pb-16 pt-4 space-y-12">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                             {detailData.redditInsights.posts.map((post: any) => (
                               <div key={post.id} className="bg-gray-50 p-10 rounded-[40px] border border-transparent hover:border-gray-200 transition-all group/post">
                                  <div className="flex justify-between items-start mb-6">
                                     <span className="text-[10px] font-black text-[#FF4500] uppercase bg-[#FF4500]/10 px-4 py-1.5 rounded-full">{post.subreddit}</span>
                                     <div className="flex items-center gap-3 text-gray-400 text-xs font-bold"><ThumbsUp className="w-4 h-4" /> {post.upvotes}</div>
                                  </div>
                                  <h4 className="font-bold text-xl mb-4 leading-tight group-hover/post:text-[#FF4500] transition-colors text-black">{post.title}</h4>
                                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-8 italic">"{post.preview}"</p>
                                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">View Discussion <ArrowRight className="w-3 h-3" /></div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* YouTube Reviews */}
              <div className="space-y-12">
                 <h3 className="text-3xl font-black tracking-tight flex items-center gap-5 text-black">
                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center"><Youtube className="w-6 h-6 text-red-600" /></div> Video Reviews
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {detailData.videos.map((video: any) => (
                      <a key={video.id} href={video.url} target="_blank" className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                         <div className="aspect-video relative overflow-hidden bg-gray-100">
                            <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                               <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"><ArrowRight className="w-6 h-6" /></div>
                            </div>
                         </div>
                         <div className="p-6 space-y-4">
                            <h4 className="font-bold text-lg leading-tight group-hover:text-red-600 transition-colors line-clamp-2 text-black">{video.title}</h4>
                            <div className="flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-widest pt-4 border-t border-gray-50">
                               <span>{video.channel}</span>
                               <span>{video.views}</span>
                            </div>
                         </div>
                      </a>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}

          {/* 4. COMPARISON VIEW */}
          {view === 'compare' && !loading && compareData && (
            <motion.div key="compare" initial="hidden" animate="visible" variants={fadeVariants} className="space-y-20">
              <div className="flex items-center justify-between">
                <button onClick={() => setView('analysis')} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors"><ChevronLeft className="w-4 h-4" /> Back to Analysis</button>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Side-by-Side Analysis</div>
              </div>
              
              <div className="bg-white rounded-[56px] overflow-hidden shadow-2xl shadow-gray-100 border border-gray-50">
                <div className="p-12 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-white flex justify-between items-center">
                   <h2 className="text-4xl font-black tracking-tight ml-4 text-black">The Direct Face-Off</h2>
                   <button onClick={() => setShowCompareSelection(true)} className="bg-black text-white px-8 py-3 rounded-full text-xs font-black uppercase flex items-center gap-2 hover:bg-gray-800 transition-all"><PlusCircle className="w-5 h-5" /> Add More</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/20">
                        <th className="py-12 px-12 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-50">Specification</th>
                        {compareData.products.map((p:any) => (
                          <th key={p.id} className="py-12 px-10 min-w-[300px] border-r border-gray-50 last:border-0">
                            <div className="flex flex-col items-center text-center gap-6">
                               <div className="w-36 h-36 bg-white rounded-[32px] p-6 flex items-center justify-center border border-gray-50">
                                  <img 
                                    src={p.image} 
                                    onError={handleImageError}
                                    className="max-h-full object-contain" 
                                  />
                                </div>
                               <div className="space-y-1">
                                  <div className="font-black text-lg text-black leading-tight line-clamp-2 px-4">{p.name}</div>
                                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">₹{p.bestPrice.toLocaleString()}</div>
                               </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 border-t border-gray-50">
                      <tr>
                        <td className="py-8 px-12 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/10 border-r border-gray-50">Overall Score</td>
                        {compareData.products.map((p:any) => (<td key={p.id} className="py-8 px-10 text-center border-r border-gray-50 last:border-0"><div className={cn("inline-block px-6 py-3 rounded-2xl font-black text-2xl text-black", p.winners.bestValue ? "bg-blue-600 text-white shadow-xl shadow-blue-100" : "bg-gray-100")}>{p.overallDealScore}%</div></td>))}
                      </tr>
                      
                      {/* Price Rows */}
                      {['Amazon', 'Flipkart', 'Reliance Digital', 'Croma'].map(platform => (
                        <tr key={platform} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-6 px-12 text-sm font-bold text-gray-700 border-r border-gray-50">{platform} Price</td>
                          {compareData.products.map((p:any) => {
                            const listing = p.listings.find((l: any) => l.platform === platform);
                            const isBest = listing?.price === p.bestPrice;
                            return (
                              <td key={p.id} className="py-6 px-10 text-center border-r border-gray-50 last:border-0">
                                {listing ? (
                                  <div className="space-y-1">
                                    <div className={cn("font-black text-lg", isBest ? "text-blue-600" : "text-black")}>
                                      ₹{listing.price.toLocaleString()}
                                    </div>
                                    <div className="text-[9px] font-black text-green-600 uppercase tracking-widest">{listing.discount}% OFF</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 text-xs font-medium">N/A</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Dynamic Specs */}
                      {getDynamicAttributes().map(attr => (
                        <tr key={attr} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-6 px-12 text-sm font-bold text-gray-700 border-r border-gray-50">{attr}</td>
                          {compareData.products.map((p:any) => (<td key={p.id} className="py-6 px-10 text-center text-sm font-semibold text-black border-r border-gray-50 last:border-0">{p.baseSpecs[attr] || 'â€”'}</td>))}
                        </tr>
                      ))}

                      {/* Reddit Community Summary */}
                      <tr className="bg-orange-50/30">
                        <td className="py-10 px-12 border-r border-gray-50">
                           <div className="flex items-center gap-3 mb-2">
                             <div className="w-8 h-8 bg-[#FF4500] rounded-lg flex items-center justify-center"><MessageSquare className="w-4 h-4 text-white" /></div>
                             <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Community Sentiment</div>
                           </div>
                           <div className="text-xs text-gray-500 font-medium leading-tight">Summarized from Reddit discussions</div>
                        </td>
                        {compareData.products.map((p:any) => (
                          <td key={p.id} className="py-10 px-8 border-r border-gray-50 last:border-0 align-top">
                             <div className="space-y-6">
                                <div>
                                   <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><ThumbsUp className="w-3 h-3" /> Positive</div>
                                   <ul className="space-y-2">
                                      {p.redditSummary?.pros.map((pro: string, idx: number) => (
                                        <li key={idx} className="text-xs font-bold text-black flex gap-2 items-start leading-tight">
                                           <span className="text-emerald-500 mt-0.5">â€¢</span> {pro}
                                        </li>
                                      ))}
                                   </ul>
                                </div>
                                <div>
                                   <div className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><MinusCircle className="w-3 h-3" /> Concerns</div>
                                   <ul className="space-y-2">
                                      {p.redditSummary?.cons.map((con: string, idx: number) => (
                                        <li key={idx} className="text-xs font-bold text-black flex gap-2 items-start leading-tight">
                                           <span className="text-red-400 mt-0.5">â€¢</span> {con}
                                        </li>
                                      ))}
                                   </ul>
                                </div>
                             </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Recommendation Summary */}
               <div className="bg-gray-900 p-10 rounded-[48px] text-white relative overflow-hidden group shadow-2xl">
                  <div className="relative z-10 flex flex-col items-center">
                     <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-3xl shadow-blue-500/40"><Sparkles className="w-6 h-6 fill-current" /></div>
                     <div className="flex items-center gap-4 mb-2">
                        <div className="text-[9px] font-black uppercase text-blue-400 tracking-[0.4em]">AI Verdict</div>
                        {voiceSupport.synthesis && (
                           <button 
                             onClick={() => speak(`I recommend the ${compareData.aiAnalysis.bestOverall}. Here is why: ${compareData.aiAnalysis.reasoning.join('. ')}`)}
                             className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-blue-600 transition-colors"
                           >
                             <Volume2 className="w-4 h-4" />
                           </button>
                        )}
                     </div>
                     <h3 className="text-3xl font-black mb-10 text-center">AI recommends <span className="text-blue-400">{compareData.aiAnalysis.bestOverall}</span></h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl text-left border-t border-white/10 pt-10">
                        <div className="space-y-6">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2"><Check className="w-4 h-4" /> Winning Rationale</h4>
                           <ul className="space-y-4">
                              {compareData.aiAnalysis.reasoning.map((r: string, i: number) => (
                                <li key={i} className="flex gap-3 items-start text-gray-400 text-sm leading-relaxed">
                                   <span className="text-emerald-500 font-bold opacity-50">{i+1}.</span>
                                   {r}
                                </li>
                              ))}
                           </ul>
                        </div>
                        <div className="space-y-6">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Personalized Insight</h4>
                           <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                              <p className="text-sm text-gray-300 leading-relaxed italic">
                                "{compareData.aiAnalysis.personalizedAdvice}"
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-blue-600/20 transition-all duration-1000" />
               </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* COMPARISON SELECTION MODAL */}
      <AnimatePresence>
        {showCompareSelection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-4xl rounded-[56px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-12 border-b border-gray-100 flex justify-between items-center text-black">
                  <div>
                    <h3 className="text-3xl font-black tracking-tight">Expand Comparison</h3>
                    <p className="text-gray-400 text-sm font-medium">Add products within the <span className="text-blue-600 font-black uppercase text-xs tracking-widest">{detailData?.product.category}</span> category</p>
                  </div>
                  <button onClick={() => setShowCompareSelection(false)} className="p-6 hover:bg-gray-100 rounded-full transition-colors"><X className="w-7 h-7" /></button>
               </div>
               
               <div className="p-12 flex-1 overflow-y-auto space-y-10 text-black">
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={compareSearchQuery} 
                      onChange={(e) => setCompareSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCompareSearch()}
                      placeholder={`Find more ${detailData?.product.category}s... (Press Enter to search)`}
                      className="w-full pl-16 pr-32 py-7 bg-gray-50 border border-transparent focus:border-blue-500 rounded-[32px] text-2xl transition-all outline-none"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                       {voiceSupport.recognition && (
                          <button 
                            type="button"
                            onClick={() => startListening((text) => setCompareSearchQuery(text))}
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                              isListening ? "bg-red-500 text-white animate-pulse" : "bg-white text-gray-400 border border-gray-100 hover:text-black"
                            )}
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                       )}
                       <button 
                         onClick={handleCompareSearch}
                         className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors"
                       >
                         <ArrowRight className="w-6 h-6" />
                       </button>
                    </div>
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-gray-300 group-focus-within:text-blue-500" />
                  </div>

                  {compareError && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-red-50 text-red-600 rounded-3xl flex items-center gap-4 text-sm font-bold border border-red-100 italic">
                       <AlertCircle className="w-6 h-6" /> {compareError}
                    </motion.div>
                  )}

                  <div className="space-y-6">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Inventory to Compare</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {searchResults.filter(p => 
                           !selectedIds.includes(p.id) && 
                           (p.name.toLowerCase().includes(compareSearchQuery.toLowerCase()) || 
                            p.category.toLowerCase().includes(compareSearchQuery.toLowerCase()))
                         ).map(p => (
                          <button 
                            key={p.id} 
                            onClick={() => handleAddToCompareInModal(p)}
                            className="p-8 rounded-[40px] bg-white border border-gray-100 hover:border-blue-500 hover:shadow-xl transition-all flex items-center justify-between text-left group"
                          >
                             <div className="flex items-center gap-5">
                                <div className="w-20 h-20 bg-white rounded-[20px] p-3 flex items-center justify-center group-hover:bg-blue-50 flex-shrink-0 border border-gray-50">
                                   <img 
                                     src={p.image} 
                                     onError={handleImageError}
                                     className="max-h-full object-contain" 
                                   />
                                </div>
                                <div className="text-black overflow-hidden">
                                  <div className="font-bold text-lg leading-tight line-clamp-1">{p.name}</div>
                                  <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-2 font-black">₹{p.bestPrice.toLocaleString()}</div>
                                </div>
                             </div>
                             <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all ml-4">
                                <Plus className="w-6 h-6" />
                             </div>
                          </button>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="p-12 bg-gray-50 border-t border-gray-100 flex justify-end items-center gap-8">
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest">{selectedIds.length}/5 Selected</div>
                  <button onClick={() => setShowCompareSelection(false)} className="px-10 py-5 font-bold text-gray-500 hover:text-black transition-colors">Cancel</button>
                  <button 
                    disabled={selectedIds.length < 2} onClick={handleCompareFinal}
                    className="bg-blue-600 text-white px-12 py-5 rounded-3xl font-black hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all disabled:opacity-30"
                  >
                    Compare Side-by-Side
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* FLOATING VOICE ASSISTANT */}
      {voiceSupport.recognition && view !== 'landing' && (
        <div className="fixed bottom-10 right-10 z-[150] flex flex-col items-end gap-4">
           {isSpeaking && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xl text-xs font-bold text-blue-600 flex items-center gap-3">
                 <Volume2 className="w-4 h-4 animate-bounce" /> AI is speaking...
                 <button onClick={() => window.speechSynthesis.cancel()} className="text-gray-300 hover:text-red-500 ml-4"><X className="w-3 h-3" /></button>
              </motion.div>
           )}
           <button 
             onClick={() => startListening()}
             className={cn(
               "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90",
               isListening ? "bg-red-500 text-white animate-pulse" : "bg-blue-600 text-white hover:bg-black"
             )}
           >
             {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
           </button>
        </div>
      )}

      {/* PRICE ALERT MODAL */}
      {showAlertModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAlertModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl">
            <div className="bg-blue-600 p-12 text-white">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                <BellRing className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black tracking-tight mb-2">Set Price Alert</h2>
              <p className="text-blue-100 text-sm font-bold opacity-80 uppercase tracking-widest">We'll notify you when it drops</p>
            </div>
            
            <div className="p-12 space-y-8">
              {alertSuccess ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-black">Alert Active!</h3>
                  <p className="text-gray-500 font-bold">We will send you an email when the price drops below ₹{parseFloat(alertTargetPrice).toLocaleString()}.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Target Price (₹)</label>
                    <input 
                      type="number" 
                      value={alertTargetPrice}
                      onChange={(e) => setAlertTargetPrice(e.target.value)}
                      placeholder={`Current: ₹${detailData.product.bestPrice}`}
                      className="w-full bg-gray-50 border-none rounded-3xl p-6 text-xl font-black focus:ring-2 focus:ring-blue-600 transition-all"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Email Address</label>
                    <input 
                      type="email" 
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full bg-gray-50 border-none rounded-3xl p-6 text-lg font-bold focus:ring-2 focus:ring-blue-600 transition-all"
                    />
                  </div>
                  <button 
                    onClick={handleCreateAlert}
                    disabled={alertLoading || !alertTargetPrice}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
                  >
                    {alertLoading ? "Activating..." : "Enable Tracking"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[200] flex flex-col items-center justify-center text-black">
          <Loader2 className="w-20 h-20 text-blue-600 animate-spin mb-10" />
          <h2 className="text-4xl font-black tracking-tighter italic">Fetching live prices from marketplaces...</h2>
          <p className="text-gray-400 font-medium mt-4">Scanning Amazon, Flipkart, Croma & Reliance Digital in real-time</p>
        </div>
      )}
    </div>
  );
}
