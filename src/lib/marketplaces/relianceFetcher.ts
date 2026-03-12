// ============================================================
// RELIANCE DIGITAL MARKETPLACE FETCHER — LIVE PRODUCT DATA
// ============================================================
import * as cheerio from 'cheerio';
import { MarketplaceFetchResult } from '../types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function fetchRelianceListing(searchKeywords: string): Promise<MarketplaceFetchResult> {
  try {
    const query = encodeURIComponent(searchKeywords);
    const url = `https://www.reliancedigital.in/search?q=${query}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { platform: 'Reliance Digital', success: false, listing: null, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Reliance Digital product cards
    const productCard = $('div.sp__product, li[class*="product"], div[class*="product-card"]').first();

    // Price
    let price = 0;
    const priceSelectors = ['span.TextWeb__Text-sc-1cyx778-0', '[class*="price"]', 'span.amount'];
    for (const sel of priceSelectors) {
      const text = productCard.find(sel).first().text().replace(/[₹,\s]/g, '').trim();
      const parsed = parseInt(text);
      if (parsed > 100) { price = parsed; break; }
    }

    // Page-level fallback
    if (price === 0) {
      $('[class*="price"], [class*="amount"]').each((_, el) => {
        const text = $(el).text().replace(/[₹,\s]/g, '').trim();
        const parsed = parseInt(text);
        if (parsed > 100 && price === 0) price = parsed;
      });
    }

    // Image
    let image = '';
    const imgEl = productCard.find('img').first();
    image = imgEl.attr('data-srcset') || imgEl.attr('data-src') || imgEl.attr('src') || '';

    // Product URL
    let productUrl = '';
    const linkEl = productCard.find('a').first();
    const href = linkEl.attr('href') || '';
    if (href) productUrl = href.startsWith('http') ? href : `https://www.reliancedigital.in${href}`;

    if (price === 0 && !image) {
      return { platform: 'Reliance Digital', success: false, listing: null, error: 'Could not parse listing data' };
    }

    return {
      platform: 'Reliance Digital',
      success: true,
      listing: {
        platform: 'Reliance Digital',
        price,
        discount: 0,
        rating: 0,
        seller: 'Reliance Digital',
        deliveryTime: 'Standard Delivery',
        warranty: '1 Year Manufacturer',
        warrantyYears: 1,
        image,
        productUrl,
        available: price > 0,
        condition: 'new'
      }
    };
  } catch (error: any) {
    return { 
      platform: 'Reliance Digital', 
      success: false, 
      listing: null, 
      error: error.message || 'Fetch failed' 
    };
  }
}
