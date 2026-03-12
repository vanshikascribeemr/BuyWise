// ============================================================
// FLIPKART MARKETPLACE FETCHER — LIVE PRODUCT DATA
// ============================================================
import * as cheerio from 'cheerio';
import { MarketplaceFetchResult } from '../types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function fetchFlipkartListing(searchKeywords: string): Promise<MarketplaceFetchResult> {
  try {
    const query = encodeURIComponent(searchKeywords);
    const url = `https://www.flipkart.com/search?q=${query}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { platform: 'Flipkart', success: false, listing: null, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Flipkart uses different selectors — try common patterns
    // Price extraction
    let price = 0;
    const priceSelectors = ['div._30jeq3', 'div._1_WHN1', 'div.Nx9bqj'];
    for (const sel of priceSelectors) {
      const priceText = $(sel).first().text().replace(/[₹,]/g, '').trim();
      const parsed = parseInt(priceText);
      if (parsed > 0) { price = parsed; break; }
    }

    // Original price for discount
    let originalPrice = 0;
    const origSelectors = ['div._3I9_wc', 'div._27UcVY', 'div.yRaY8j'];
    for (const sel of origSelectors) {
      const origText = $(sel).first().text().replace(/[₹,]/g, '').trim();
      const parsed = parseInt(origText);
      if (parsed > 0) { originalPrice = parsed; break; }
    }
    const discount = originalPrice > price && price > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    // Rating
    let rating = 0;
    const ratingSelectors = ['div._3LWZlK', 'div.XQDdHH'];
    for (const sel of ratingSelectors) {
      const ratingText = $(sel).first().text().trim();
      const parsed = parseFloat(ratingText);
      if (parsed > 0 && parsed <= 5) { rating = parsed; break; }
    }

    // Image
    let image = '';
    const imgSelectors = ['img._396cs4', 'img.DByuf4', 'img._2r_T1I'];
    for (const sel of imgSelectors) {
      const src = $(sel).first().attr('src') || '';
      if (src && src.startsWith('http')) { image = src; break; }
    }

    // Product URL
    let productUrl = '';
    const linkSelectors = ['a._1fQZEK', 'a.CGtC98', 'a._2UzuFa', 'a.VJA3rP'];
    for (const sel of linkSelectors) {
      const href = $(sel).first().attr('href') || '';
      if (href) { productUrl = `https://www.flipkart.com${href}`; break; }
    }

    // Condition Detection
    const titleText = $('div._4rR01T, div.KzDlHZ, a.s1Q9rs').first().text().toLowerCase();
    const isRefurbished = titleText.includes('refurbished');
    const condition = isRefurbished ? 'refurbished' : 'new';

    if (price === 0 && !image) {
      return { platform: 'Flipkart', success: false, listing: null, error: 'Could not parse listing data' };
    }

    return {
      platform: 'Flipkart',
      success: true,
      listing: {
        platform: 'Flipkart',
        price,
        discount,
        rating,
        seller: isRefurbished ? '2GUD / Refurbished' : 'Flipkart',
        deliveryTime: 'Standard Delivery',
        warranty: isRefurbished ? '6 Months Seller Warranty' : '1 Year Manufacturer',
        warrantyYears: isRefurbished ? 0.5 : 1,
        image,
        productUrl,
        available: price > 0,
        condition
      }
    };
  } catch (error: any) {
    return { 
      platform: 'Flipkart', 
      success: false, 
      listing: null, 
      error: error.message || 'Fetch failed' 
    };
  }
}
