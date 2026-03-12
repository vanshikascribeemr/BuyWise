// ============================================================
// FLIPKART MARKETPLACE FETCHER — LIVE PRODUCT DATA
// ============================================================
import * as cheerio from 'cheerio';
import { MarketplaceFetchResult } from '../types';
import { isAccessory } from './utils';

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
      signal: AbortSignal.timeout(4500),
    });

    if (!response.ok) {
      return { platform: 'Flipkart', success: false, listing: null, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // ── Find First Genuine Product Result ──
    // Instead of grabbing the absolute first element, iterate to skip accessories
    let targetCard: any = null;
    let price = 0;
    
    // Flipkart uses several card layouts
    const cardSelectors = ['div._1AtVbE', 'div.cPHDOP', 'div.slAVV4', 'div[data-id]'];
    
    for (const cardSel of cardSelectors) {
      if (targetCard) break;
      $(cardSel).each((_, el) => {
        if (targetCard) return; // already found
        
        const titleText = $(el).find('div.KzDlHZ, div._4rR01T, a.s1Q9rs, a.wjcEIp, a.IRpwTa, a.WKTcLC').first().text();
        if (!titleText || titleText.length < 5) return;
        
        // Skip obvious accessories unless explicitly searched
        if (isAccessory(titleText, searchKeywords)) return;
        
        // Extract price for this specific card
        let cardPrice = 0;
        const pSel = ['div.Nx9bqj', 'div.hZ3P6w', 'div._30jeq3', 'div._1_WHN1'];
        for (const sel of pSel) {
          const pt = $(el).find(sel).first().text().replace(/[₹,]/g, '').trim();
          const parsed = parseInt(pt);
          if (parsed > 0) { cardPrice = parsed; break; }
        }
        
        if (cardPrice > 0) {
          targetCard = $(el);
          price = cardPrice;
        }
      });
    }

    // Fallback if structured cards aren't found, try page-level
    if (!targetCard) {
      const pSel = ['div.Nx9bqj', 'div.hZ3P6w', 'div._30jeq3', 'div._1_WHN1'];
      for (const sel of pSel) {
        const pt = $(sel).first().text().replace(/[₹,]/g, '').trim();
        const parsed = parseInt(pt);
        if (parsed > 0) { price = parsed; break; }
      }
    }

    // ── Original Price for Discount ──
    let originalPrice = 0;
    const origSelectors = ['div.yRaY8j', 'div.kRYCnD', 'div._3I9_wc', 'div._27UcVY'];
    for (const sel of origSelectors) {
      const elem = targetCard ? targetCard.find(sel).first() : $(sel).first();
      const origText = elem.text().replace(/[₹,]/g, '').trim();
      const parsed = parseInt(origText);
      if (parsed > 0) { originalPrice = parsed; break; }
    }
    const discount = originalPrice > price && price > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    // ── Rating ──
    let rating = 0;
    const ratingSelectors = ['div.XQDdHH', 'div._3LWZlK'];
    for (const sel of ratingSelectors) {
      const elem = targetCard ? targetCard.find(sel).first() : $(sel).first();
      const ratingText = elem.text().trim();
      const parsed = parseFloat(ratingText);
      if (parsed > 0 && parsed <= 5) { rating = parsed; break; }
    }

    // ── Image ──
    let image = '';
    const imgSelectors = ['img.DByuf4', 'img._396cs4', 'img._2r_T1I', 'img.cxL_5r'];
    for (const sel of imgSelectors) {
      const elem = targetCard ? targetCard.find(sel).first() : $(sel).first();
      const src = elem.attr('src') || '';
      if (src && src.startsWith('http')) { image = src; break; }
    }
    // Fallback: any product image
    if (!image) {
      const scope = targetCard ? targetCard : $('body');
      scope.find('img').each((_: any, el: any) => {
        const src = $(el).attr('src') || '';
        if (src.includes('rukminim') && !image) image = src;
      });
    }

    // ── Product URL ──
    let productUrl = '';
    const linkSelectors = ['a.k7wcnx', 'a.CGtC98', 'a._1fQZEK', 'a._2UzuFa', 'a.VJA3rP', 'a.wjcEIp', 'a.IRpwTa'];
    for (const sel of linkSelectors) {
      const elem = targetCard ? targetCard.find(sel).first() : $(sel).first();
      const href = elem.attr('href') || '';
      if (href) { productUrl = `https://www.flipkart.com${href}`; break; }
    }
    // Fallback: any product link
    if (!productUrl) {
      const scope = targetCard ? targetCard : $('body');
      scope.find('a[href*="/p/"]').each((_: any, el: any) => {
        const href = $(el).attr('href') || '';
        if (href && !productUrl) productUrl = `https://www.flipkart.com${href}`;
      });
    }

    // ── Condition Detection ──
    const titleScope = targetCard ? targetCard : $('body');
    const titleText = titleScope.find('div.KzDlHZ, div._4rR01T, a.s1Q9rs, a.wjcEIp, a.IRpwTa').first().text().toLowerCase();
    const isRefurbished = titleText.includes('refurbished') || titleText.includes('renewed');
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
        originalPrice,
        discount,
        rating,
        seller: isRefurbished ? '2GUD / Refurbished' : 'Flipkart',
        deliveryTime: 'Standard Delivery',
        warranty: isRefurbished ? '6 Months Seller Warranty' : '1 Year Manufacturer',
        warrantyYears: isRefurbished ? 0.5 : 1,
        image,
        productUrl: productUrl || `https://www.flipkart.com/search?q=${query}`,
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
