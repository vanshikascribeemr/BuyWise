// ============================================================
// MARKETPLACE ORCHESTRATOR — PARALLEL LIVE FETCHING
// ============================================================
// Coordinates all marketplace fetchers in parallel,
// normalizes results, selects the best product image,
// and records real-time pricing to the history engine.

import { fetchAmazonListing } from './amazonFetcher';
import { fetchFlipkartListing } from './flipkartFetcher';
import { fetchCromaListing } from './cromaFetcher';
import { fetchRelianceListing } from './relianceFetcher';
import { recordPrice } from '../priceHistory';
import { 
  DiscoveredProduct, 
  AggregatedProduct, 
  MarketplaceListing, 
  MarketplaceFetchResult 
} from '../types';

/**
 * Fetch live marketplace data for a single product across all platforms.
 * Runs all fetchers in parallel for minimum latency.
 */
export async function fetchAllMarketplaceListings(
  product: DiscoveredProduct
): Promise<{ listings: MarketplaceListing[]; bestImage: string; avgRating: number; errors: string[] }> {

  const searchQuery = product.searchKeywords || `${product.brand} ${product.name}`;

  // PARALLEL FETCH across all 4 platforms
  const results: MarketplaceFetchResult[] = await Promise.all([
    fetchAmazonListing(searchQuery),
    fetchFlipkartListing(searchQuery),
    fetchCromaListing(searchQuery),
    fetchRelianceListing(searchQuery),
  ]);

  const listings: MarketplaceListing[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.success && result.listing) {
      listings.push(result.listing);
      // 🔥 ASYNC TRACKING: Record every discovered price to DB
      recordPrice(product.id, result.listing).catch(() => {});
    } else {
      errors.push(`${result.platform}: ${result.error || 'Unavailable'}`);
    }
  }

  // IMAGE PRIORITY: Amazon > Flipkart > Croma > Reliance
  const imagePriority: ('Amazon' | 'Flipkart' | 'Croma' | 'Reliance Digital')[] = ['Amazon', 'Flipkart', 'Croma', 'Reliance Digital'];
  let bestImage = '';
  for (const platform of imagePriority) {
    const listing = listings.find(l => l.platform === platform && l.image);
    if (listing?.image) {
      bestImage = listing.image;
      break;
    }
  }

  // Aggregate rating from available platforms
  const ratingsWithValues = listings.filter(l => l.rating > 0);
  const avgRating = ratingsWithValues.length > 0
    ? parseFloat((ratingsWithValues.reduce((sum, l) => sum + l.rating, 0) / ratingsWithValues.length).toFixed(1))
    : 0;

  return { listings, bestImage, avgRating, errors };
}

/**
 * Hydrate an AI-discovered product with live marketplace data.
 * Transforms a DiscoveredProduct into a fully AggregatedProduct.
 */
export async function hydrateProduct(product: DiscoveredProduct): Promise<AggregatedProduct> {
  const { listings, bestImage, avgRating, errors } = await fetchAllMarketplaceListings(product);

  if (errors.length > 0) {
    console.warn(`[Marketplace] Partial data for "${product.name}":`, errors);
  }

  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    image: bestImage,
    rating: avgRating,
    aiReasoning: product.aiReasoning,
    confidenceScore: product.confidenceScore,
    baseSpecs: product.baseSpecs,
    listings,
  };
}

/**
 * Hydrate multiple products in parallel.
 */
export async function hydrateProducts(products: DiscoveredProduct[]): Promise<AggregatedProduct[]> {
  return Promise.all(products.map(p => hydrateProduct(p)));
}
