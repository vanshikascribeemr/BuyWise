
import { NextResponse } from 'next/server';
import { searchProducts, compareProducts, calculateDealScores } from '@/lib/scoring';
import { getYouTubeReviews } from '@/lib/youtube';
import { getRedditInsights } from '@/lib/reddit';
import { mockProducts } from '@/lib/data';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'no-key-provided',
});

const isKeyValid = (key: string | undefined) => 
  key && key !== 'your_openai_key' && key !== 'no-key-provided';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, query, budget, productIds, productId } = body;

    // --- SEARCH MODE ---
    if (mode === 'search') {
      const results = searchProducts(query, budget);
      return NextResponse.json({ results });
    }

    // --- DETAIL MODE (Single Product Analysis) ---
    if (mode === 'detail' && productId) {
      const product = mockProducts.find(p => p.id === productId);
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      
      const scoredProduct = calculateDealScores(product);
      const [videos, redditInsights] = await Promise.all([
        getYouTubeReviews(scoredProduct.name),
        getRedditInsights(scoredProduct.name)
      ]);

      return NextResponse.json({
        product: scoredProduct,
        videos,
        redditInsights
      });
    }

    // --- COMPARE MODE ---
    if (mode === 'compare' && productIds) {
      const selectedProducts = compareProducts(productIds);
      
      if (selectedProducts.length === 0) {
        return NextResponse.json({ error: 'No products found' }, { status: 404 });
      }

      const topProductName = selectedProducts[0].name;

      // Parallel Fetch: YouTube + Reddit + AI Analysis
      const [videos, redditInsights, aiAnalysis] = await Promise.all([
        getYouTubeReviews(topProductName),
        getRedditInsights(topProductName),
        getAIComparisonSummary(selectedProducts)
      ]);

      return NextResponse.json({
        products: selectedProducts,
        videos,
        redditInsights,
        aiAnalysis
      });
    }

    return NextResponse.json({ error: 'Invalid request mode' }, { status: 400 });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function getAIComparisonSummary(products: any[]) {
  if (!isKeyValid(process.env.OPENAI_API_KEY)) {
    // Premium Mock Data
    const winner = products.reduce((prev, current) => 
      (prev.overallDealScore > current.overallDealScore) ? prev : current
    );

    return {
      bestOverall: winner.name,
      confidenceScore: 92,
      reasoning: [
        `Best weighted deal score of ${winner.overallDealScore}`,
        "Superior balance between price and manufacturer specifications",
        "Better long-term value based on warranty and current discounts"
      ],
      alternatives: products.filter(p => p.id !== winner.id).map(p => ({
        name: p.name,
        whyNot: ["Higher price relative to specs", "Fewer platform-verified reviews"]
      }))
    };
  }

  const prompt = `Compare these products: ${products.map(p => `${p.name} (Price: ${p.bestPrice})`).join(', ')}.
  Determine the BEST OVERALL choice.
  Return JSON: { 
    "bestOverall": "product name", 
    "confidenceScore": number, 
    "reasoning": ["str", "str"], 
    "alternatives": [{ "name": "str", "whyNot": ["str"] }] 
  }`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0125",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}
