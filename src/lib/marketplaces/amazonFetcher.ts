// ============================================================
// AMAZON MARKETPLACE FETCHER — LIVE PRODUCT DATA
// ============================================================
import * as cheerio from 'cheerio';
import { MarketplaceFetchResult } from '../types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function fetchAmazonListing(searchKeywords: string): Promise<MarketplaceFetchResult> {
  try {
    const query = encodeURIComponent(searchKeywords);
    const url = `https://www.amazon.in/s?k=${query}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { platform: 'Amazon', success: false, listing: null, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find first valid product result
    const firstResult = $('[data-component-type="s-search-result"]').first();
    if (!firstResult.length) {
      return { platform: 'Amazon', success: false, listing: null, error: 'No results found' };
    }

    // Extract price
    const priceWhole = firstResult.find('.a-price-whole').first().text().replace(/[,.]/g, '').trim();
    const price = parseInt(priceWhole) || 0;

    // Extract original price for discount calculation
    const originalPriceText = firstResult.find('.a-text-price .a-offscreen').first().text().replace(/[₹,]/g, '').trim();
    const originalPrice = parseInt(originalPriceText) || price;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    // Extract rating
    const ratingText = firstResult.find('.a-icon-star-small .a-icon-alt').first().text();
    const ratingMatch = ratingText.match(/([\d.]+)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    // Extract image
    const image = firstResult.find('img.s-image').first().attr('src') || '';

    // Extract product URL
    const productPath = firstResult.find('a.a-link-normal.s-no-outline').first().attr('href') || '';
    const productUrl = productPath ? `https://www.amazon.in${productPath}` : '';

    // Extract delivery
    const deliveryText = firstResult.find('.a-text-bold[aria-label]').first().attr('aria-label') 
      || firstResult.find('.a-color-base.a-text-bold').first().text().trim()
      || 'Check availability';

    // Condition Detection
    const titleText = firstResult.find('h2 a span').text().toLowerCase();
    const isRefurbished = titleText.includes('renewed') || productUrl.includes('renewed');
    const condition = isRefurbished ? 'refurbished' : 'new';
    const warrantyStatus = isRefurbished ? '6 Months Seller Warranty' : '1 Year Manufacturer';
    const warrantyLength = isRefurbished ? 0.5 : 1;

    if (price === 0 && !image) {
      return { platform: 'Amazon', success: false, listing: null, error: 'Could not parse listing data' };
    }

    return {
      platform: 'Amazon',
      success: true,
      listing: {
        platform: 'Amazon',
        price,
        discount,
        rating,
        seller: isRefurbished ? 'Amazon Renewed' : 'Amazon.in',
        deliveryTime: deliveryText,
        warranty: warrantyStatus,
        warrantyYears: warrantyLength,
        image,
        productUrl,
        available: price > 0,
        condition
      }
    };
  } catch (error: any) {
    return { 
      platform: 'Amazon', 
      success: false, 
      listing: null, 
      error: error.message || 'Fetch failed' 
    };
  }
}
