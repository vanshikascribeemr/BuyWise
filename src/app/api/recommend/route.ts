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
import { hydrateProducts, hydrateProduct } from '@/lib/marketplaces';
import { getPriceHistoryMetrics } from '@/lib/priceHistory';
import { DiscoveredProduct, ScoredProduct, UserPreferences } from '@/lib/types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'no-key-provided',
});

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
      // STEP 1: AI discovers product identities (ZERO marketplace data)
      const discovered = await discoverProductsFromAI(query);

      // STEP 2: Marketplace fetchers hydrate with LIVE data (parallel)
      const hydrated = await hydrateProducts(discovered);

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

      // STEP 4: Fetch external content in parallel
      const [videos, redditInsights] = await Promise.all([
        getYouTubeReviews(scored.name),
        getRedditInsights(scored.name),
      ]);

      return NextResponse.json({ product: scored, videos, redditInsights });
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
