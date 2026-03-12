import { prisma } from './prisma';
import { MarketplaceListing } from './types';

// ============================================================
// PRICE HISTORY ENGINE (INTERNAL ANALYTICS & TRACKING)
// ============================================================
// Tracks the real-time pricing for all discovered products
// over time, allowing the AI to understand historical trends.

export async function recordPrice(productId: string, listing: MarketplaceListing, condition: string = 'new') {
  // We don't block the actual user request on this DB insert; it runs async in the background.
  try {
    if (listing.price <= 0) return;

    await prisma.priceHistory.create({
      data: {
        productId,
        platform: listing.platform,
        price: listing.price,
        condition,
      }
    });
  } catch (error) {
    console.warn(`[Price Tracking] Failed to record price for ${productId} on ${listing.platform}`);
  }
}

export async function getPriceHistoryMetrics(productId: string) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const history = await prisma.priceHistory.findMany({
      where: {
        productId,
        timestamp: { gte: thirtyDaysAgo },
        condition: 'new' // Base metrics on new items
      },
      orderBy: { timestamp: 'asc' }
    });

    if (history.length === 0) return null;

    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    
    // Group prices by date for trend rendering
    const trendMap = new Map<string, number>();
    history.forEach(h => {
      const dateKey = h.timestamp.toISOString().split('T')[0];
      if (!trendMap.has(dateKey) || h.price < trendMap.get(dateKey)!) {
        trendMap.set(dateKey, h.price); // Keep minimum price for that day
      }
    });

    const trend = Array.from(trendMap.entries()).map(([date, price]) => ({ date, price }));

    return {
      minPrice,
      maxPrice,
      avgPrice,
      trend,
      dataPoints: prices.length
    };
  } catch (error) {
    console.warn(`[Price Tracking] Failed to fetch metrics for ${productId}`);
    return null;
  }
}
