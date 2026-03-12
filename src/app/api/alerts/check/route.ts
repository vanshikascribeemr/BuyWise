// ============================================================
// PRICE ALERT CHECK API
// ============================================================
// POST — Check all active alerts against current marketplace prices.
// Triggers alerts where current price <= target price.

export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchAllMarketplaceListings } from '@/lib/marketplaces';
import { DiscoveredProduct } from '@/lib/types';

export async function POST() {
  try {
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { isTriggered: false },
    });

    if (activeAlerts.length === 0) {
      return NextResponse.json({ checked: 0, triggered: [] });
    }

    const triggered: { alertId: string; productId: string; currentPrice: number; targetPrice: number }[] = [];

    // Group alerts by productId to avoid redundant marketplace fetches
    const alertsByProduct = new Map<string, typeof activeAlerts>();
    for (const alert of activeAlerts) {
      if (!alertsByProduct.has(alert.productId)) {
        alertsByProduct.set(alert.productId, []);
      }
      alertsByProduct.get(alert.productId)!.push(alert);
    }

    for (const [productId, alerts] of alertsByProduct) {
      const searchQuery = productId.replace('ai-', '').replace(/-/g, ' ');
      const mockProduct: DiscoveredProduct = {
        id: productId,
        name: searchQuery,
        brand: '',
        category: 'other',
        searchKeywords: searchQuery,
        aiReasoning: '',
        confidenceScore: 50,
        baseSpecs: {},
      };

      const { listings } = await fetchAllMarketplaceListings(mockProduct);
      const currentMinPrice = listings.length > 0
        ? Math.min(...listings.filter(l => l.price > 0).map(l => l.price))
        : Infinity;

      for (const alert of alerts) {
        if (currentMinPrice <= alert.targetPrice) {
          await prisma.priceAlert.update({
            where: { id: alert.id },
            data: { isTriggered: true },
          });
          triggered.push({
            alertId: alert.id,
            productId: alert.productId,
            currentPrice: currentMinPrice,
            targetPrice: alert.targetPrice,
          });
        }
      }
    }

    return NextResponse.json({
      checked: activeAlerts.length,
      triggered,
    });
  } catch (error: any) {
    console.error('[Alert Check] Failed:', error);
    return NextResponse.json({ error: 'Alert check failed', details: error.message }, { status: 500 });
  }
}
