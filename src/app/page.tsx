
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ArrowRight, Check, AlertCircle, ShoppingCart, 
  Youtube, Sparkles, Scale, ExternalLink, ShieldCheck, 
  Tag, Loader2, TrendingUp, Info, Filter, X, ChevronLeft,
  Trophy, Plus, Minus, BarChart3, Star, ChevronDown, 
  MessageCircle, ThumbsUp, MessageSquare, PlusCircle, Heart
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  const [view, setView] = useState<'landing' | 'results' | 'analysis' | 'compare'>('landing');
  const [showReddit, setShowReddit] = useState(false);
  const [showCompareSelection, setShowCompareSelection] = useState(false);
  const [compareSearchQuery, setCompareSearchQuery] = useState('');
  const [compareError, setCompareError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query) return;

    setLoading(true);
    try {
      const searchRes = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'search', query })
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
        body: JSON.stringify({ mode: 'detail', productId })
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
    if (product.category !== detailData.product.category) {
      setCompareError(`This search doesn't belong to the ${detailData.product.category} category`);
      setTimeout(() => setCompareError(null), 3000);
      return;
    }
    if (selectedIds.includes(product.id)) return;
    if (selectedIds.length >= 5) return;
    setSelectedIds(prev => [...prev, product.id]);
  };

  const handleCompareFinal = async () => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'compare', productIds: selectedIds })
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
            <motion.div key="landing" initial="hidden" animate="visible" exit="exit" variants={fadeVariants} className="text-center py-20">
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-8 bg-gradient-to-b from-black to-gray-500 bg-clip-text text-transparent">
                Where You and AI Decide What’s Worth Buying.
              </h1>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-16 leading-relaxed font-medium text-black">
                Compare products, analyze features, and make smarter purchases together.
              </p>
              <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative group">
                <input 
                  type="text" autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search 'S24', 'MacBook' or 'Mattress'..."
                  className="w-full pl-8 pr-44 py-8 bg-white border border-gray-100 rounded-[40px] text-2xl shadow-2xl shadow-gray-200 focus:border-blue-500 transition-all outline-none"
                />
                <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-8 py-4 rounded-[28px] font-bold flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-200">
                  Find Deals <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          )}

          {/* 2. STICKER SELECTION VIEW */}
          {view === 'results' && !loading && (
            <motion.div key="results" initial="hidden" animate="visible" variants={fadeVariants} className="space-y-12">
               <div className="text-center max-w-2xl mx-auto">
                  <h2 className="text-4xl font-black tracking-tight mb-4">Choose Your Focus</h2>
                  <p className="text-gray-400 font-medium">Found multiple matches. Select one to start your deep analysis.</p>
               </div>
               
               <div className="flex flex-wrap justify-center gap-8">
                  {searchResults.map(p => (
                    <button 
                      key={p.id} onClick={() => handleSelectProduct(p.id)}
                      className="group bg-white p-8 rounded-[48px] border border-gray-50 shadow-sm hover:shadow-2xl hover:border-blue-500 hover:-translate-y-2 transition-all duration-700 flex flex-col items-center gap-8 min-w-[320px]"
                    >
                       <div className="w-40 h-40 relative flex items-center justify-center bg-gray-50 rounded-[32px] group-hover:bg-blue-50 transition-colors">
                          <img src={p.image} className="max-h-[80%] object-contain mix-blend-multiply transition-transform group-hover:scale-110" />
                       </div>
                       <div className="text-center">
                          <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">{p.category}</div>
                          <div className="font-black text-2xl leading-tight mb-3 text-black">{p.name}</div>
                          <div className="text-xl font-black text-gray-400">₹{p.bestPrice.toLocaleString()}</div>
                       </div>
                       <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <ArrowRight className="w-6 h-6" />
                       </div>
                    </button>
                  ))}
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

              <div className="bg-white p-12 rounded-[56px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-16 items-center">
                 <div className="w-full md:w-1/3 aspect-square relative flex items-center justify-center p-12 bg-gray-50 rounded-[48px]">
                    <img src={detailData.product.image} className="max-h-full object-contain mix-blend-multiply" />
                 </div>
                 <div className="flex-1 space-y-8">
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full">Top Analysis Match</span>
                       <div className="flex items-center gap-1 text-xs font-bold text-gray-400"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {detailData.product.rating} / 5.0</div>
                    </div>
                    <h2 className="text-6xl font-black tracking-tight leading-[0.9] text-black">{detailData.product.name}</h2>
                    <p className="text-lg text-gray-500 font-medium max-w-xl text-black">
                      We've analyzed this product across multiple dimensions. See verified deals and community sentiment below.
                    </p>
                    <div className="flex gap-8">
                       <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Market Lowest</div>
                          <div className="text-4xl font-black text-black">₹{detailData.product.bestPrice.toLocaleString()}</div>
                       </div>
                       <div className="w-px h-16 bg-gray-100" />
                       <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">BuyWise Score</div>
                          <div className="text-4xl font-black text-blue-600">{detailData.product.overallDealScore}%</div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Platform Comparison Row */}
              <div className="space-y-10">
                 <h3 className="text-3xl font-black tracking-tight flex items-center gap-4 text-black">
                   <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center"><ShoppingCart className="w-6 h-6 text-blue-600" /></div> Verified Platform Prices
                 </h3>
                 <div className="flex gap-8 overflow-x-auto pb-8 no-scrollbar snap-x">
                    {detailData.product.listings.map((l: any) => (
                      <div key={l.platform} className="min-w-[360px] bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm snap-start flex justify-between items-center group hover:border-blue-300 transition-all duration-500">
                         <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-xs group-hover:bg-blue-50 transition-colors uppercase text-black">{l.platform[0]}</div>
                            <div>
                               <div className="font-black text-xl text-black">{l.platform}</div>
                               <div className="text-[10px] text-green-600 font-black uppercase tracking-widest mt-1">{l.discount}% OFF • {l.deliveryTime}</div>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-2xl font-black text-black">₹{l.price.toLocaleString()}</div>
                            <button className="text-[10px] font-black text-blue-600 uppercase mt-2 flex items-center gap-1 hover:underline ml-auto">Buy Now <ExternalLink className="w-3 h-3" /></button>
                         </div>
                      </div>
                    ))}
                 </div>
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
                    <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center"><Youtube className="w-8 h-8 text-red-600" /></div> YouTube Expert Reviews
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {detailData.videos.map((video: any) => (
                      <a key={video.id} href={video.url} target="_blank" className="bg-white rounded-[48px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all group">
                         <div className="aspect-video relative overflow-hidden bg-gray-100">
                            <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                               <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white"><ArrowRight className="w-10 h-10" /></div>
                            </div>
                         </div>
                         <div className="p-10 space-y-6">
                            <h4 className="font-bold text-xl leading-tight group-hover:text-red-600 transition-colors line-clamp-2 text-black">{video.title}</h4>
                            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest pt-6 border-t border-gray-50">
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
                               <div className="w-36 h-36 bg-gray-50 rounded-[32px] p-6 flex items-center justify-center">
                                  <img src={p.image} className="max-h-full object-contain mix-blend-multiply" />
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
                      <tr><td className="py-8 px-12 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/10 border-r border-gray-50">Overall Score</td>
                        {compareData.products.map((p:any) => (<td key={p.id} className="py-8 px-10 text-center border-r border-gray-50 last:border-0"><div className={cn("inline-block px-6 py-3 rounded-2xl font-black text-2xl text-black", p.winners.bestValue ? "bg-blue-600 text-white shadow-xl shadow-blue-100" : "bg-gray-100")}>{p.overallDealScore}%</div></td>))}
                      </tr>
                      {getDynamicAttributes().map(attr => (
                        <tr key={attr} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-8 px-12 text-sm font-bold text-gray-700 border-r border-gray-50">{attr}</td>
                          {compareData.products.map((p:any) => (<td key={p.id} className="py-8 px-10 text-center text-sm font-semibold text-black border-r border-gray-50 last:border-0">{p.baseSpecs[attr] || '—'}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Recommendation Summary */}
              <div className="bg-gray-900 p-16 rounded-[64px] text-white relative overflow-hidden group shadow-2xl">
                 <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-[32px] flex items-center justify-center mb-10 shadow-3xl shadow-blue-500/40 animate-pulse"><Sparkles className="w-10 h-10 fill-current" /></div>
                    <div className="text-[10px] font-black uppercase text-blue-400 tracking-[0.4em] mb-4">The Verdict</div>
                    <h3 className="text-6xl font-black mb-16 leading-[0.9]">AI recommends <br/><span className="text-white underline decoration-blue-600 underline-offset-8">{compareData.aiAnalysis.bestOverall}</span></h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-20 max-w-5xl text-left border-t border-white/10 pt-16">
                       <div className="space-y-10">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-3"><Check className="w-5 h-5" /> Winning Rationale</h4>
                          <ul className="space-y-6">
                             {compareData.aiAnalysis.reasoning.map((r: string, i: number) => (
                               <li key={i} className="flex gap-4 items-start text-gray-400 italic text-lg leading-relaxed">
                                  <span className="text-emerald-500 font-bold">0{i+1}.</span>
                                  {r}
                               </li>
                             ))}
                          </ul>
                       </div>
                       <div className="space-y-10">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-3"><AlertCircle className="w-5 h-5" /> Consideration Trade-offs</h4>
                          <div className="space-y-8">
                             {compareData.aiAnalysis.alternatives.map((alt: any) => (
                               <div key={alt.name} className="group/alt">
                                  <div className="text-sm font-bold text-white mb-2 uppercase tracking-[0.2em] group-hover/alt:text-orange-400 transition-colors">{alt.name}</div>
                                  <p className="text-sm text-gray-500 leading-relaxed italic">"{alt.whyNot[0]}"</p>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[140px] -mr-80 -mt-80 group-hover:bg-blue-600/20 transition-all duration-1000" />
                 <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] -ml-64 -mb-64 group-hover:bg-purple-600/20 transition-all duration-1000" />
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
                      type="text" value={compareSearchQuery} onChange={(e) => setCompareSearchQuery(e.target.value)}
                      placeholder={`Find more ${detailData?.product.category}s...`}
                      className="w-full pl-16 pr-6 py-7 bg-gray-50 border border-transparent focus:border-blue-500 rounded-[32px] text-2xl transition-all outline-none"
                    />
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
                        {searchResults.filter(p => !selectedIds.includes(p.id) && p.name.toLowerCase().includes(compareSearchQuery.toLowerCase())).map(p => (
                          <button 
                            key={p.id} 
                            onClick={() => handleAddToCompareInModal(p)}
                            className="p-8 rounded-[40px] bg-white border border-gray-100 hover:border-blue-500 hover:shadow-xl transition-all flex items-center justify-between text-left group"
                          >
                             <div className="flex items-center gap-5">
                                <div className="w-20 h-20 bg-gray-50 rounded-[28px] p-4 flex items-center justify-center group-hover:bg-blue-50 flex-shrink-0">
                                  <img src={p.image} className="max-h-full object-contain mix-blend-multiply" />
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

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[200] flex flex-col items-center justify-center text-black">
          <Loader2 className="w-20 h-20 text-blue-600 animate-spin mb-10" />
          <h2 className="text-4xl font-black tracking-tighter italic">Engine Deciphering...</h2>
          <p className="text-gray-400 font-bold mt-4 uppercase tracking-[0.2em]">Aggregating Deep Insights</p>
        </div>
      )}
    </div>
  );
}
