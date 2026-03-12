// ============================================================
// BUYWISE API — REAL-TIME PRODUCT INTELLIGENCE PIPELINE
// ============================================================
// Pipeline: User Query → AI Discovery → Marketplace Fetchers
//           → Normalization → Scoring → Comparison → AI Recommendation
//
// AI NEVER generates marketplace data.
// All marketplace data comes from live platform fetchers.
// ============================================================

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { calculateDealScores, compareScoredProducts, getYouTubeReviews, getRedditInsights } from '@/lib/engine';
import { hydrateProducts, hydrateProduct, fetchAllMarketplaceListings } from '@/lib/marketplaces';
import { getPriceHistoryMetrics } from '@/lib/priceHistory';
import { DiscoveredProduct, ScoredProduct, UserPreferences, MarketplaceListing, RefurbishedOption, PriceTrendSummary, PurchaseAdvisorResponse } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'no-key-provided',
});

// In-memory cache for AI Discovery queries to speed up identical searches
const discoveryCache = new Map<string, { timestamp: number, data: DiscoveredProduct[] }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ============================================================
// MAIN API HANDLER
// ============================================================

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, query, productIds, productId, preferences } = body;

    // ───────────────────────────────────────
    // MODE: SEARCH
    // Pipeline: AI Discover → Marketplace Fetch → Score
    // ───────────────────────────────────────
    if (mode === 'search') {
      // STEP 1: AI discovers product identities (Capped to top 3 for speed)
      const discovered = await discoverProductsFromAI(query);
      const topDiscovered = discovered.slice(0, 3);

      // STEP 2: Marketplace fetchers hydrate with LIVE data (parallel)
      const hydrated = await hydrateProducts(topDiscovered);

      // STEP 2.5: Inject historical context
      const historyMap = await Promise.all(hydrated.map(p => getPriceHistoryMetrics(p.id)));

      // STEP 3: Scoring engine scores based on REAL marketplace data + history
      const scored = hydrated
        .map((p, i) => calculateDealScores(p, preferences, historyMap[i]))
        .filter(p => p.bestPrice > 0 || p.image); // Only return products with real data

      return NextResponse.json({ results: scored.slice(0, 8) });
    }

    // ───────────────────────────────────────
    // MODE: DETAIL
    // Pipeline: AI Discover → Marketplace Fetch → Score → YouTube + Reddit
    // ───────────────────────────────────────
    if (mode === 'detail' && productId) {
      const queryFromId = productId.replace('ai-', '').replace(/-/g, ' ');
      
      // STEP 1: Re-discover product identity
      const discovered = await discoverProductsFromAI(queryFromId);
      const target = discovered.find(p => p.id === productId) || discovered[0];
      if (!target) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // STEP 2: Hydrate with FRESH marketplace data
      const hydrated = await hydrateProduct(target);
      const historyMetrics = await getPriceHistoryMetrics(hydrated.id);

      // STEP 3: Score using real data + history
      const scored = calculateDealScores(hydrated, preferences, historyMetrics);

      // STEP 4: Fetch refurbished listings + check alerts in parallel with other data
      const refurbProduct: DiscoveredProduct = {
        id: `${productId}-refurb`, name: target.name, brand: target.brand,
        category: target.category, searchKeywords: `${target.searchKeywords} renewed refurbished`,
        aiReasoning: 'Refurbished variant search', confidenceScore: 70, baseSpecs: {},
      };

      const [videos, redditInsights, refurbData, triggeredAlerts] = await Promise.all([
        getYouTubeReviews(scored.name),
        getRedditInsights(scored.name),
        fetchAllMarketplaceListings(refurbProduct).catch(() => ({ listings: [] as MarketplaceListing[], bestImage: '', avgRating: 0, errors: [] })),
        prisma.priceAlert.findMany({ where: { productId, isTriggered: true } }).catch(() => []),
      ]);

      const refurbListings = refurbData.listings.filter(l =>
        l.condition === 'refurbished' || l.seller.toLowerCase().includes('renewed') || l.seller.toLowerCase().includes('refurbished')
      );

      const advisorData = await getAIPurchaseAdvice(scored, historyMetrics, preferences, refurbListings, triggeredAlerts.length > 0);

      return NextResponse.json({ product: scored, videos, redditInsights, advisor: advisorData, historicalMetrics: historyMetrics });
    }

    // ───────────────────────────────────────
    // MODE: COMPARE
    // Pipeline: AI Discover → Marketplace Fetch → Score → Compare → AI Verdict
    // ───────────────────────────────────────
    if (mode === 'compare' && productIds) {
      // Re-discover all products for comparison
      const queries = productIds.map((id: string) => id.replace('ai-', '').replace(/-/g, ' '));
      const uniqueQueries = [...new Set(queries)] as string[];

      // Discover products from all unique queries in parallel
      const allDiscovered = (await Promise.all(
        uniqueQueries.map(q => discoverProductsFromAI(q))
      )).flat();

      // Find the specific products requested
      const targetProducts = productIds.map((id: string) =>
        allDiscovered.find(p => p.id === id)
      ).filter(Boolean) as DiscoveredProduct[];

      if (targetProducts.length === 0) {
        return NextResponse.json({ error: 'No products found for comparison' }, { status: 404 });
      }

      // Hydrate all with FRESH marketplace data in parallel
      const hydrated = await hydrateProducts(targetProducts);
      
      const historyMap = await Promise.all(hydrated.map(p => getPriceHistoryMetrics(p.id)));

      // Score and compare
      const scored = hydrated.map((p, i) => calculateDealScores(p, preferences, historyMap[i]));
      const compared = compareScoredProducts(scored);

      const topProductName = compared[0]?.name || '';

      // Fetch external content + AI analysis in parallel
      const [videos, redditInsightsMap, aiAnalysis] = await Promise.all([
        getYouTubeReviews(topProductName),
        Promise.all(compared.map(p => getRedditInsights(p.name))),
        getAIComparisonSummary(compared, preferences),
      ]);

      return NextResponse.json({
        products: compared.map((p, i) => ({
          ...p,
          redditSummary: redditInsightsMap[i]?.summary,
        })),
        videos,
        aiAnalysis,
      });
    }

    // ───────────────────────────────────────
    // MODE: ADVISOR
    // Full AI Purchase Advisor with buy/wait/alternative recommendation
    // ───────────────────────────────────────
    if (mode === 'advisor' && productId) {
      const queryFromId = productId.replace('ai-', '').replace(/-/g, ' ');
      const discovered = await discoverProductsFromAI(queryFromId);
      const target = discovered.find(p => p.id === productId) || discovered[0];
      if (!target) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      const hydrated = await hydrateProduct(target);
      const historyMetrics = await getPriceHistoryMetrics(hydrated.id);
      const scored = calculateDealScores(hydrated, preferences, historyMetrics);

      // Fetch refurbished + alerts
      const refurbProduct: DiscoveredProduct = {
        id: `${productId}-refurb`, name: target.name, brand: target.brand,
        category: target.category, searchKeywords: `${target.searchKeywords} renewed refurbished`,
        aiReasoning: 'Refurbished variant search', confidenceScore: 70, baseSpecs: {},
      };
      const [refurbData, triggeredAlerts] = await Promise.all([
        fetchAllMarketplaceListings(refurbProduct).catch(() => ({ listings: [] as MarketplaceListing[], bestImage: '', avgRating: 0, errors: [] })),
        prisma.priceAlert.findMany({ where: { productId, isTriggered: true } }).catch(() => []),
      ]);
      const refurbListings = refurbData.listings.filter(l =>
        l.condition === 'refurbished' || l.seller.toLowerCase().includes('renewed') || l.seller.toLowerCase().includes('refurbished')
      );

      const advisorResponse = await getAIPurchaseAdvice(scored, historyMetrics, preferences, refurbListings, triggeredAlerts.length > 0);

      return NextResponse.json({
        product: scored,
        advisor: advisorResponse,
        historicalMetrics: historyMetrics,
      });
    }

    // ───────────────────────────────────────
    // MODE: REFURBISHED
    // Search specifically for renewed/refurbished variants
    // ───────────────────────────────────────
    if (mode === 'refurbished' && productId) {
      const queryFromId = productId.replace('ai-', '').replace(/-/g, ' ');
      const refurbKeywords = `${queryFromId} renewed refurbished`;

      const refurbProduct: DiscoveredProduct = {
        id: `${productId}-refurb`,
        name: queryFromId,
        brand: '',
        category: 'other',
        searchKeywords: refurbKeywords,
        aiReasoning: 'Refurbished variant search',
        confidenceScore: 70,
        baseSpecs: {},
      };

      const hydrated = await hydrateProduct(refurbProduct);
      // Filter to only refurbished listings or significantly cheaper listings
      const refurbListings = hydrated.listings.filter(l =>
        l.condition === 'refurbished' ||
        l.seller.toLowerCase().includes('renewed') ||
        l.seller.toLowerCase().includes('refurbished') ||
        l.seller.toLowerCase().includes('2gud')
      );

      return NextResponse.json({
        listings: refurbListings,
        allListings: hydrated.listings,
        searchKeywords: refurbKeywords,
      });
    }

    return NextResponse.json({ error: 'Invalid request mode' }, { status: 400 });
  } catch (error: any) {
    console.error('[BuyWise API Error]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================
// AI PRODUCT DISCOVERY — IDENTIFICATION ONLY
// ============================================================
// AI returns ONLY product identity and technical specs.
// AI NEVER returns: price, discount, rating, delivery,
// seller, warranty, image, or marketplace listings.
// ============================================================

async function discoverProductsFromAI(query: string): Promise<DiscoveredProduct[]> {
  const cacheKey = query.toLowerCase().trim();
  const cached = discoveryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Cache Hit] Discovery for: "${query}"`);
    return cached.data;
  }

  const prompt = `You are a professional product researcher. User query: "${query}".

TASK: Identify up to 6 UNIQUE real-world products that best match this query.

CRITICAL RULES:
1. Return ONLY product identification data.
2. Do NOT return any marketplace data whatsoever.
3. Do NOT return: price, discount, rating, delivery time, seller, warranty, image URL, or marketplace listings.
4. Return ONLY: product name, brand, category, technical specifications, and search keywords.
5. The "searchKeywords" field should be optimized for searching on Amazon India / Flipkart.

RETURN ONLY THIS JSON FORMAT:
{
  "products": [
    {
      "id": "ai-[unique-kebab-case-slug]",
      "name": "Full Official Product Name",
      "brand": "Brand Name",
      "category": "smartphone | laptop | tablet | headphones | watch | camera | tv | appliance | other",
      "searchKeywords": "Optimized search string for Indian e-commerce platforms",
      "aiReasoning": "One sentence explaining why this product matches the user query",
      "confidenceScore": 95,
      "baseSpecs": {
        "Display": "6.7-inch AMOLED",
        "Processor": "Snapdragon 8 Gen 3",
        "RAM": "12GB",
        "Storage": "256GB",
        "Battery": "5000mAh"
      }
    }
  ]
}

REMEMBER: NO prices. NO images. NO marketplace data. ONLY identification.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const data = JSON.parse(response.choices[0].message.content || '{"products":[]}');
    const products: DiscoveredProduct[] = (data.products || []).map((p: any) => ({
      id: p.id || `ai-${p.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
      name: p.name || 'Unknown Product',
      brand: p.brand || 'Unknown',
      category: p.category || 'other',
      searchKeywords: p.searchKeywords || p.name || query,
      aiReasoning: p.aiReasoning || '',
      confidenceScore: p.confidenceScore || 80,
      baseSpecs: p.baseSpecs || {},
    }));

    discoveryCache.set(cacheKey, { timestamp: Date.now(), data: products });
    return products;
  } catch (error) {
    console.error('[AI Discovery] Failed:', error);
    // Create a single fallback product from the raw query
    return [{
      id: `ai-${query.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
      name: query,
      brand: 'Unknown',
      category: 'other',
      searchKeywords: query,
      aiReasoning: 'Direct search from user query',
      confidenceScore: 50,
      baseSpecs: {},
    }];
  }
}

// ============================================================
// AI COMPARISON SUMMARY
// ============================================================

async function getAIComparisonSummary(products: ScoredProduct[], preferences?: UserPreferences) {
  const productSummary = products.map(p => ({
    name: p.name,
    bestPrice: p.bestPrice,
    bestPlatform: p.bestPlatform,
    dealScore: p.overallDealScore,
    rating: p.rating,
    specs: p.baseSpecs,
  }));

  const prompt = `Act as an AI Shopping Advisor. Analyze these products based on REAL marketplace data and historical price context:
${JSON.stringify(productSummary, null, 2)}

User Priorities: ${JSON.stringify(preferences || {})}

Determine the BEST OVERALL choice and advise the user on purchasing strategy. Do not fabricate prices. Return JSON:
{
  "bestOverall": "exact product name",
  "buyRecommendation": "Buy Now | Wait for Drop | Consider Alternatives",
  "reasoning": ["point1 based on real data", "point2", "point3"],
  "alternativeSuggestion": "A suggested alternative or 'None' if this is perfect."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch {
    return {
      bestOverall: products[0]?.name || 'Unknown',
      reasoning: ['Best available match based on marketplace data'],
      personalizedAdvice: 'Based on live market data, this product offers the best value.',
    };
  }
}

// ============================================================
// AI PURCHASE ADVISOR — SMART BUY/WAIT RECOMMENDATIONS
// ============================================================

import { PriceHistoryMetrics } from '@/lib/priceHistory';

function buildPriceTrendSummary(currentPrice: number, historyMetrics: PriceHistoryMetrics | null): PriceTrendSummary | null {
  if (!historyMetrics || historyMetrics.dataPoints === 0) return null;

  // Calculate volatility
  const volatilityPct = historyMetrics.avgPrice ? (historyMetrics.volatility / historyMetrics.avgPrice) * 100 : 0;
  const volatilityLabel = volatilityPct > 10 ? 'High' : volatilityPct > 4 ? 'Medium' : 'Low';

  // Calculate slope
  let priceDirection: 'rising' | 'falling' | 'stable' = 'stable';
  const n = historyMetrics.prices?.length || 0;
  if (n > 1) {
    const slope = (historyMetrics.prices[n-1] - historyMetrics.prices[0]) / n;
    if (slope > 50) priceDirection = 'rising';
    else if (slope < -50) priceDirection = 'falling';
  }

  const predictedBestBuyingWindow = priceDirection === 'falling' ? 'Prices falling — consider buying soon'
    : priceDirection === 'rising' ? 'Prices rising — buy now to avoid higher price'
    : historyMetrics.bestBuyingDay ? `Historically best prices on ${historyMetrics.bestBuyingDay}s` : 'Prices stable — safe to buy anytime';

  return {
    currentPrice,
    historicalAverage: historyMetrics.avgPrice,
    lowestPrice: historyMetrics.minPrice,
    volatility: volatilityLabel,
    predictedBestBuyingWindow,
  };
}

function buildRefurbishedOptions(listings: MarketplaceListing[], bestNewPrice: number): RefurbishedOption[] {
  return listings
    .filter(l => l.price > 0 && l.price < bestNewPrice) // Only include if cheaper than new
    .map(l => ({
      platform: l.seller.includes('Renewed') ? `${l.platform} Renewed` : l.platform,
      price: l.price,
      conditionGrade: l.condition === 'refurbished' ? 'A' : 'B',
      warranty: l.warranty || '6 Months Seller Warranty',
    }));
}

function buildMarketplaceAvailability(product: ScoredProduct): Record<string, string> {
  const platforms = ['Amazon', 'Flipkart', 'Reliance Digital', 'Croma'] as const;
  const availability: Record<string, string> = {};
  for (const platform of platforms) {
    const listing = product.listings.find(l => l.platform === platform);
    if (listing) {
      if (listing.price > 0 && listing.price === product.bestPrice) {
        availability[platform] = `Available - Best Price ₹${listing.price.toLocaleString()}`;
      } else if (listing.price > 0) {
        availability[platform] = `Available - ₹${listing.price.toLocaleString()}`;
      } else {
        availability[platform] = `Available - Check stock`;
      }
    } else {
      availability[platform] = 'Not Available';
    }
  }
  return availability;
}

async function getAIPurchaseAdvice(
  product: ScoredProduct,
  historyMetrics: PriceHistoryMetrics | null,
  preferences?: UserPreferences,
  refurbishedListings: MarketplaceListing[] = [],
  alertTriggered: boolean = false,
): Promise<PurchaseAdvisorResponse> {
  const marketSummary = {
    name: product.name,
    bestPrice: product.bestPrice,
    bestPlatform: product.bestPlatform,
    dealScore: product.overallDealScore,
    dealQuality: product.dealQuality,
    rating: product.rating,
    listings: product.listings.map(l => ({
      platform: l.platform,
      price: l.price,
      discount: l.discount,
      rating: l.rating,
      deliveryTime: l.deliveryTime,
      warranty: l.warranty,
      condition: l.condition,
    })),
  };

  const histSummary = historyMetrics ? {
    avgPrice: historyMetrics.avgPrice,
    minPrice: historyMetrics.minPrice,
    maxPrice: historyMetrics.maxPrice,
    volatility: historyMetrics.volatility,
    isHistoricalLow: historyMetrics.isHistoricalLow,
    priceDirection: historyMetrics.priceDirection,
    bestBuyingDay: historyMetrics.bestBuyingDay,
    dataPoints: historyMetrics.dataPoints,
  } : null;

  const refurbOptions = buildRefurbishedOptions(refurbishedListings, product.bestPrice);
  const priceTrendSummary = buildPriceTrendSummary(product.bestPrice, historyMetrics);
  const marketplaceAvailability = buildMarketplaceAvailability(product);

  const prompt = `You are an AI Purchase Advisor for BuyWise. Analyze this product based on REAL marketplace data and price history.

Product Data:
${JSON.stringify(marketSummary, null, 2)}

Price History (30 days):
${JSON.stringify(histSummary, null, 2)}

Refurbished Options Available: ${refurbOptions.length > 0 ? JSON.stringify(refurbOptions) : 'None found'}

User Preferences: ${JSON.stringify(preferences || {})}

Marketplace Availability:
${JSON.stringify(marketplaceAvailability, null, 2)}

Price Alert Triggered: ${alertTriggered ? 'Yes — price has dropped to user target!' : 'No'}

Provide a clear purchase recommendation. Consider:
- Is the current price good relative to historical average?
- Is the price trending up or down?
- Which platform offers the safest/best purchase?
- Are there better alternatives the user should consider?
- If refurbished options exist AND are cheaper than new, mention them as a savings opportunity.
- If a price alert was triggered, emphasize urgency.
- Include marketplace availability in reasoning (which stores have it, which don't).

Return ONLY this JSON:
{
  "buyRecommendation": "Buy Now" | "Wait for Drop" | "Consider Alternatives",
  "reasoning": ["reason 1 with specific data", "reason 2", "reason 3", "reason 4"],
  "alternativeSuggestion": "A specific alternative product suggestion, or 'None'",
  "historicalInsight": "One sentence about the price history context"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    return {
      buyRecommendation: parsed.buyRecommendation || 'Buy Now',
      reasoning: parsed.reasoning || ['Based on live market data, this appears to be a fair deal.'],
      alternativeSuggestion: parsed.alternativeSuggestion || 'None',
      historicalInsight: parsed.historicalInsight || 'Insufficient historical data for trend analysis.',
      dealScore: product.overallDealScore,
      dealQuality: product.dealQuality || 'Fair Deal',
      bestDealPlatform: product.bestPlatform,
      refurbishedOptions: refurbOptions,
      priceTrendSummary,
      priceDropAlertTriggered: alertTriggered,
      marketplaceAvailability,
    };
  } catch {
    return {
      buyRecommendation: product.overallDealScore >= 70 ? 'Buy Now' : 'Wait for Drop',
      reasoning: [
        `Current best price: ₹${product.bestPrice.toLocaleString()} on ${product.bestPlatform}`,
        `BuyWise Deal Score: ${product.overallDealScore}%`,
        historyMetrics ? `Historical average: ₹${historyMetrics.avgPrice.toLocaleString()}` : 'Building price history...',
        alertTriggered ? '🔔 Your price alert was triggered — the price has dropped to your target!' : '',
      ].filter(Boolean),
      alternativeSuggestion: 'None',
      historicalInsight: historyMetrics
        ? `Price has been tracked for ${historyMetrics.dataPoints} data points. Currently ${historyMetrics.priceDirection}.`
        : 'No historical data yet. Prices will be tracked over time.',
      dealScore: product.overallDealScore,
      dealQuality: product.dealQuality || 'Fair Deal',
      bestDealPlatform: product.bestPlatform,
      refurbishedOptions: refurbOptions,
      priceTrendSummary,
      priceDropAlertTriggered: alertTriggered,
      marketplaceAvailability,
    };
  }
}
