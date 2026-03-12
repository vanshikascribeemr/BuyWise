
import { AggregatedProduct, PlatformListing, mockProducts } from './data';

export interface ScoredListing extends PlatformListing {
  dealScore: number;
}

export interface ScoredProduct extends Omit<AggregatedProduct, 'listings'> {
  listings: ScoredListing[];
  bestPrice: number;
  overallDealScore: number;
  winners: {
    bestPrice?: boolean;
    bestPerformance?: boolean;
    highestWarranty?: boolean;
    bestValue?: boolean;
  };
}

export function calculateDealScores(product: AggregatedProduct): ScoredProduct {
  const listings = product.listings;
  
  // Find scores within listings of ONE product to find the best platform deal
  const minPrice = Math.min(...listings.map(l => l.price));
  const maxPrice = Math.max(...listings.map(l => l.price));
  const maxWarranty = Math.max(...listings.map(l => l.warrantyYears), 1);
  const maxDiscount = Math.max(...listings.map(l => l.discount), 1);

  const scoredListings = listings.map(l => {
    const priceScore = maxPrice === minPrice ? 1 : 1 - (l.price - minPrice) / (maxPrice - minPrice || 1);
    const warrantyScore = l.warrantyYears / maxWarranty;
    const discountScore = l.discount / maxDiscount;
    const ratingScore = l.rating / 5;

    // Weighted Formula for Platform Ranking
    const totalScore = (0.4 * priceScore) + (0.3 * ratingScore) + (0.2 * warrantyScore) + (0.1 * discountScore);

    return {
      ...l,
      dealScore: Math.round(totalScore * 100)
    };
  });

  const bestListing = [...scoredListings].sort((a, b) => b.dealScore - a.dealScore)[0];

  return {
    ...product,
    listings: scoredListings.sort((a, b) => a.price - b.price),
    bestPrice: minPrice,
    overallDealScore: bestListing?.dealScore || 0,
    winners: {} // To be filled by comparison engine
  };
}

export function compareProducts(productIds: string[]): ScoredProduct[] {
  const selected = mockProducts.filter(p => productIds.includes(p.id)).map(calculateDealScores);
  
  if (selected.length === 0) return [];

  // Cross-product "Winners" detection
  const minPrice = Math.min(...selected.map(p => p.bestPrice));
  const maxRating = Math.max(...selected.map(p => p.rating));
  const maxWarranty = Math.max(...selected.map(p => Math.max(...p.listings.map(l => l.warrantyYears))));
  const maxScore = Math.max(...selected.map(p => p.overallDealScore));

  return selected.map(p => ({
    ...p,
    winners: {
      bestPrice: p.bestPrice === minPrice,
      bestPerformance: p.rating === maxRating,
      highestWarranty: Math.max(...p.listings.map(l => l.warrantyYears)) === maxWarranty,
      bestValue: p.overallDealScore === maxScore
    }
  }));
}

export function searchProducts(query: string, budget?: number) {
  const q = query.toLowerCase();
  let matches = mockProducts.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(q);
    const categoryMatch = p.category.toLowerCase().includes(q);
    const specsMatch = Object.values(p.baseSpecs).some(v => String(v).toLowerCase().includes(q));
    return nameMatch || categoryMatch || specsMatch;
  });

  // FALLBACK: If no matches in mock data, create a dynamic synthetic product for "Any Product" search
  if (matches.length === 0 && query.length > 2) {
    const syntheticProduct: AggregatedProduct = {
      id: `synthetic-${query.replace(/\s+/g, '-').toLowerCase()}`,
      name: query.charAt(0).toUpperCase() + query.slice(1),
      category: 'Uncategorized',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=300&auto=format&fit=crop', // Generic high-quality product placeholder
      rating: 4.5,
      baseSpecs: {
        "Type": "Standard Model",
        "Availability": "High",
        "Source": "Aggregated Marketplace"
      },
      listings: [
        { platform: 'Amazon', price: 49999, discount: 5, warranty: '1 Year', warrantyYears: 1, seller: 'Retailer A', rating: 4.5, deliveryTime: '2 Days', productUrl: '#' },
        { platform: 'Flipkart', price: 48500, discount: 8, warranty: '1 Year', warrantyYears: 1, seller: 'Retailer B', rating: 4.2, deliveryTime: '3 Days', productUrl: '#' },
      ]
    };
    matches = [syntheticProduct];
  }

  if (budget) {
    matches = matches.filter(p => Math.min(...p.listings.map(l => l.price)) <= budget);
  }

  return matches.map(calculateDealScores);
}
