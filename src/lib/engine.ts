// ============================================================
// BUYWISE ENGINE — SCORING & COMPARISON (ZERO STORAGE)
// ============================================================
// This engine operates ONLY on live marketplace data.
// It contains NO product catalogs, NO stored listings,
// and NO static marketplace data of any kind.

import { AggregatedProduct, ScoredProduct, ScoredListing, UserPreferences, YouTubeVideo, RedditInsights } from './types';
import { PriceHistoryMetrics } from './priceHistory';

// ============================================================
// DEAL SCORING ENGINE
// Score weights: 40% price | 25% discount | 15% rating | 10% delivery | 10% warranty
// ============================================================

function parseDeliveryDays(deliveryTime: string): number {
  if (!deliveryTime) return 7;
  const lower = deliveryTime.toLowerCase();
  if (lower.includes('same day') || lower.includes('today')) return 0;
  if (lower.includes('tomorrow') || lower.includes('1 day')) return 1;
  if (lower.includes('2 day') || lower.includes('2-day')) return 2;
  if (lower.includes('3 day') || lower.includes('2-3')) return 3;
  const match = lower.match(/(\d+)/);
  if (match) return parseInt(match[1]);
  if (lower.includes('store pickup')) return 1;
  return 5; // default for "standard delivery"
}

export function calculateDealScores(product: AggregatedProduct, preferences?: UserPreferences, historyMetrics?: PriceHistoryMetrics | null): ScoredProduct {
  const listings = product.listings;

  if (listings.length === 0) {
    return {
      ...product,
      listings: [],
      bestPrice: 0,
      bestPlatform: 'N/A',
      overallDealScore: 0,
      dealQuality: 'Unavailable',
      winners: {},
    };
  }

  const availableListings = listings.filter(l => l.price > 0);
  if (availableListings.length === 0) {
    return {
      ...product,
      listings: listings.map(l => ({ ...l, dealScore: 0 })),
      bestPrice: 0,
      bestPlatform: 'N/A',
      overallDealScore: 0,
      dealQuality: 'Out of Stock',
      winners: {},
    };
  }

  const minPrice = Math.min(...availableListings.map(l => l.price));
  const maxPrice = Math.max(...availableListings.map(l => l.price));
  const maxWarranty = Math.max(...availableListings.map(l => l.warrantyYears), 1);
  const maxDiscount = Math.max(...availableListings.map(l => l.discount), 1);
  const deliveryDays = availableListings.map(l => parseDeliveryDays(l.deliveryTime));
  const maxDelivery = Math.max(...deliveryDays, 1);

  const scoredListings: ScoredListing[] = listings.map((l, idx) => {
    if (l.price === 0) return { ...l, dealScore: 0 };

    // Base Weights (spec: 40/25/15/10/10)
    let wPrice = 0.40, wDiscount = 0.25, wRating = 0.15, wDelivery = 0.10, wWarranty = 0.10;

    // Apply Personalization Weights
    if (preferences?.priorities) {
      if (preferences.priorities.includes('price')) { wPrice += 0.15; wRating -= 0.05; wDiscount += 0.05; wDelivery -= 0.05; wWarranty -= 0.10; }
      if (preferences.priorities.includes('performance')) { wRating += 0.15; wPrice -= 0.10; wWarranty -= 0.05; }
      if (preferences.priorities.includes('durability') || preferences.priorities.includes('battery')) {
        wWarranty += 0.15; wPrice -= 0.05; wDiscount -= 0.10;
      }
    }

    const priceScore = maxPrice === minPrice ? 1 : 1 - (l.price - minPrice) / (maxPrice - minPrice || 1);
    const discountScore = l.discount / (maxDiscount || 1);
    const ratingScore = l.rating / 5;
    const deliveryScore = maxDelivery === 0 ? 1 : 1 - (parseDeliveryDays(l.deliveryTime) / (maxDelivery || 1));
    const warrantyScore = l.warrantyYears / maxWarranty;

    let totalScore = (wPrice * priceScore) + (wDiscount * discountScore) + (wRating * ratingScore) + (wDelivery * deliveryScore) + (wWarranty * warrantyScore);
    
    // Historical Boost
    if (historyMetrics && historyMetrics.avgPrice > 0) {
       if (l.price < historyMetrics.avgPrice) {
         totalScore += 0.15 * (1 - l.price / historyMetrics.avgPrice);
       } else if (l.price > historyMetrics.avgPrice) {
         totalScore -= 0.1 * (l.price / historyMetrics.avgPrice - 1);
       }
    }
    
    return {
      ...l,
      dealScore: Math.min(Math.round(totalScore * 100), 100),
    };
  });

  const bestListing = [...scoredListings].sort((a, b) => b.dealScore - a.dealScore)[0];
  const finalScore = bestListing?.dealScore || 0;
  
  let dealQuality = 'Fair Deal';
  if (finalScore >= 90) dealQuality = 'Excellent Deal';
  else if (finalScore >= 80) dealQuality = 'Great Deal';
  else if (finalScore >= 70) dealQuality = 'Good Deal';
  else if (finalScore < 50) dealQuality = 'Wait for Drop';
  
  if (historyMetrics && minPrice >= historyMetrics.maxPrice && historyMetrics.dataPoints > 2) {
    dealQuality = 'Historically High — Wait';
  }
  if (historyMetrics?.isHistoricalLow) {
    dealQuality = finalScore >= 70 ? 'Historical Low — Buy Now!' : dealQuality;
  }

  return {
    ...product,
    listings: scoredListings.sort((a, b) => a.price - b.price),
    bestPrice: minPrice,
    bestPlatform: bestListing?.platform || 'N/A',
    overallDealScore: finalScore,
    dealQuality,
    historicalContext: historyMetrics || null,
    winners: {},
  };
}

// ============================================================
// CROSS-PRODUCT COMPARISON ENGINE
// Uses ONLY real marketplace data to identify category winners.
// ============================================================

export function compareScoredProducts(products: ScoredProduct[]): ScoredProduct[] {
  if (products.length === 0) return [];

  const withPrices = products.filter(p => p.bestPrice > 0);
  const minPrice = withPrices.length > 0 ? Math.min(...withPrices.map(p => p.bestPrice)) : 0;
  const maxRating = Math.max(...products.map(p => p.rating));
  const maxScore = Math.max(...products.map(p => p.overallDealScore));

  return products.map(p => ({
    ...p,
    winners: {
      bestPrice: p.bestPrice === minPrice && minPrice > 0,
      bestPerformance: p.rating === maxRating && maxRating > 0,
      bestValue: p.overallDealScore === maxScore && maxScore > 0,
      personalizedBest: p.overallDealScore === maxScore && maxScore > 0,
    },
  }));
}

// ============================================================
// YOUTUBE REVIEWS — LIVE FETCH (YouTube Data API v3)
// ============================================================

export async function getYouTubeReviews(productName: string): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[YouTube] No API key configured');
    return getFallbackYouTubeReviews(productName);
  }

  try {
    const query = encodeURIComponent(`${productName} review India`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=3&relevanceLanguage=en&key=${apiKey}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      console.warn(`[YouTube] API returned ${response.status}`);
      return getFallbackYouTubeReviews(productName);
    }

    const data = await response.json();
    if (!data.items?.length) return getFallbackYouTubeReviews(productName);

    return data.items.map((item: any, idx: number) => ({
      id: item.id.videoId || `v${idx}`,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      views: '', // Would need separate stats API call
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));
  } catch (error) {
    console.warn('[YouTube] Fetch failed:', error);
    return getFallbackYouTubeReviews(productName);
  }
}

function getFallbackYouTubeReviews(productName: string): YouTubeVideo[] {
  return [
    {
      id: 'yt-search-1',
      title: `${productName} — Detailed Review`,
      channel: 'Search on YouTube',
      views: '',
      thumbnail: `https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(productName + ' review')}`,
    },
  ];
}

// ============================================================
// REDDIT INSIGHTS — LIVE SEARCH
// ============================================================

export async function getRedditInsights(productName: string): Promise<RedditInsights> {
  try {
    const query = encodeURIComponent(`${productName} review`);
    const url = `https://www.reddit.com/search.json?q=${query}&sort=relevance&limit=5&type=link`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'BuyWise/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return getFallbackRedditInsights(productName);
    }

    const data = await response.json();
    const posts = (data?.data?.children || []).slice(0, 3).map((child: any, idx: number) => ({
      id: child.data?.id || `r${idx}`,
      title: child.data?.title || `${productName} Discussion`,
      subreddit: `r/${child.data?.subreddit || 'technology'}`,
      upvotes: child.data?.ups ? `${child.data.ups}` : '0',
      preview: child.data?.selftext?.substring(0, 200) || 'Click to view full discussion...',
    }));

    return {
      summary: {
        sentiment: 'Community Sourced',
        pros: ['Real user discussions available', 'Multiple perspectives found'],
        cons: ['Individual experiences may vary'],
        longTermFeedback: `Found ${posts.length} relevant community discussions about ${productName}.`,
      },
      posts: posts.length > 0 ? posts : getFallbackRedditInsights(productName).posts,
    };
  } catch (error) {
    return getFallbackRedditInsights(productName);
  }
}

function getFallbackRedditInsights(productName: string): RedditInsights {
  return {
    summary: {
      sentiment: 'Unknown',
      pros: ['Community data unavailable'],
      cons: ['Could not fetch Reddit data'],
      longTermFeedback: `Search Reddit directly for "${productName}" reviews.`,
    },
    posts: [
      {
        id: 'reddit-search',
        title: `Search Reddit for ${productName} reviews`,
        subreddit: 'r/gadgets',
        upvotes: '—',
        preview: 'Click to search Reddit for real user experiences...',
      },
    ],
  };
}
