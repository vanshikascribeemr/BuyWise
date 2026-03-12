import { prisma } from './prisma';
import { MarketplaceListing } from './types';

// ============================================================
// PRICE HISTORY ENGINE — ANALYTICS, TRACKING & INTELLIGENCE
// ============================================================
// Tracks real-time pricing for all discovered products,
// calculates historical metrics, volatility, and buying signals.

export async function recordPrice(productId: string, listing: MarketplaceListing, condition: string = 'new') {
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

export interface PriceHistoryMetrics {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  trend: { date: string; price: number }[];
  dataPoints: number;
  volatility: number;          // Standard deviation of prices
  isHistoricalLow: boolean;    // Is current best price at or below historical min?
  bestBuyingDay: string | null; // Day of week with historically lowest prices
  priceDirection: 'falling' | 'rising' | 'stable'; // Recent price movement
  prices: number[]; // Raw prices array for slope calculations
}

export async function getPriceHistoryMetrics(productId: string): Promise<PriceHistoryMetrics | null> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const history = await prisma.priceHistory.findMany({
      where: {
        productId,
        timestamp: { gte: thirtyDaysAgo },
        condition: 'new'
      },
      orderBy: { timestamp: 'asc' }
    });

    if (history.length === 0) return null;

    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    // Volatility: standard deviation of prices
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const volatility = Math.round(Math.sqrt(variance));

    // Best buying day analysis (day-of-week with lowest average price)
    const dayPrices: Record<string, number[]> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    history.forEach(h => {
      const day = dayNames[h.timestamp.getDay()];
      if (!dayPrices[day]) dayPrices[day] = [];
      dayPrices[day].push(h.price);
    });

    let bestBuyingDay: string | null = null;
    let lowestDayAvg = Infinity;
    for (const [day, dPrices] of Object.entries(dayPrices)) {
      if (dPrices.length < 1) continue;
      const dayAvg = dPrices.reduce((a, b) => a + b, 0) / dPrices.length;
      if (dayAvg < lowestDayAvg) {
        lowestDayAvg = dayAvg;
        bestBuyingDay = day;
      }
    }

    // Price direction: compare last 25% of prices vs first 25%
    let priceDirection: 'falling' | 'rising' | 'stable' = 'stable';
    if (prices.length >= 4) {
      const quarter = Math.max(1, Math.floor(prices.length / 4));
      const earlyAvg = prices.slice(0, quarter).reduce((a, b) => a + b, 0) / quarter;
      const lateAvg = prices.slice(-quarter).reduce((a, b) => a + b, 0) / quarter;
      const changePct = ((lateAvg - earlyAvg) / earlyAvg) * 100;
      if (changePct < -3) priceDirection = 'falling';
      else if (changePct > 3) priceDirection = 'rising';
    }

    // Group prices by date for trend rendering
    const trendMap = new Map<string, number>();
    history.forEach(h => {
      const dateKey = h.timestamp.toISOString().split('T')[0];
      if (!trendMap.has(dateKey) || h.price < trendMap.get(dateKey)!) {
        trendMap.set(dateKey, h.price);
      }
    });

    const trend = Array.from(trendMap.entries()).map(([date, price]) => ({ date, price }));

    // Current lowest price (most recent entry)
    const currentLowest = prices[prices.length - 1];
    const isHistoricalLow = currentLowest <= minPrice;

    return {
      minPrice,
      maxPrice,
      avgPrice,
      trend,
      dataPoints: prices.length,
      volatility,
      isHistoricalLow,
      bestBuyingDay,
      priceDirection,
      prices,
    };
  } catch (error) {
    console.warn(`[Price Tracking] Failed to fetch metrics for ${productId}`);
    return null;
  }
}
