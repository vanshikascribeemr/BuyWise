// ============================================================
// BUYWISE TYPE SYSTEM — FULLY DYNAMIC ARCHITECTURE
// ============================================================

// --- AI INTELLIGENCE LAYER TYPES ---

/** Product identity as discovered by AI. Contains ZERO marketplace data. */
export interface DiscoveredProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  searchKeywords: string;
  aiReasoning: string;
  confidenceScore: number;
  baseSpecs: {
    [key: string]: string | number;
  };
}

// --- MARKETPLACE DATA LAYER TYPES ---

/** Single platform listing fetched LIVE from a marketplace. */
export interface MarketplaceListing {
  platform: 'Amazon' | 'Flipkart' | 'Reliance Digital' | 'Croma';
  price: number;
  originalPrice?: number; // Added to support strikethrough MRP UI
  discount: number;
  rating: number;
  seller: string;
  deliveryTime: string;
  warranty: string;
  warrantyYears: number;
  image: string;
  productUrl: string;
  available: boolean;
  condition: 'new' | 'refurbished';
}

/** Result from a single marketplace fetcher. */
export interface MarketplaceFetchResult {
  platform: 'Amazon' | 'Flipkart' | 'Reliance Digital' | 'Croma';
  success: boolean;
  listing: MarketplaceListing | null;
  error?: string;
}

// --- NORMALIZED / AGGREGATED TYPES ---

/** Fully hydrated product: AI identity + live marketplace data. */
export interface AggregatedProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  image: string; // Best image from marketplace fetchers
  rating: number; // Aggregated from marketplace ratings
  aiReasoning: string;
  confidenceScore: number;
  baseSpecs: {
    [key: string]: string | number;
  };
  listings: MarketplaceListing[];
}

// --- SCORING / COMPARISON TYPES ---

export interface ScoredListing extends MarketplaceListing {
  dealScore: number;
}

export interface ScoredProduct extends Omit<AggregatedProduct, 'listings'> {
  listings: ScoredListing[];
  bestPrice: number;
  bestPlatform: string;
  overallDealScore: number;
  dealQuality?: string;
  historicalContext?: any;
  winners: {
    bestPrice?: boolean;
    bestPerformance?: boolean;
    highestWarranty?: boolean;
    bestValue?: boolean;
    personalizedBest?: boolean;
  };
}

// --- USER PREFERENCES ---

export interface UserPreferences {
  budget?: number;
  useCase?: 'gaming' | 'work' | 'photography' | 'daily';
  priorities: ('price' | 'performance' | 'battery' | 'portability' | 'durability')[];
}

// --- EXTERNAL CONTENT ---

export interface RedditSummary {
  pros: string[];
  cons: string[];
  sentiment: string;
  longTermFeedback: string;
}

export interface RedditInsights {
  summary: RedditSummary;
  posts: {
    id: string;
    title: string;
    subreddit: string;
    upvotes: string;
    preview: string;
  }[];
}

export interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  views: string;
  thumbnail: string;
  url: string;
}

// --- AI PURCHASE ADVISOR TYPES ---

export interface RefurbishedOption {
  platform: string;
  price: number;
  conditionGrade: string;
  warranty: string;
}

export interface PriceTrendSummary {
  currentPrice: number;
  historicalAverage: number;
  lowestPrice: number;
  volatility: 'High' | 'Medium' | 'Low';
  predictedBestBuyingWindow: string;
}

export interface PurchaseAdvisorResponse {
  buyRecommendation: 'Buy Now' | 'Wait for Drop' | 'Consider Alternatives';
  reasoning: string[];
  alternativeSuggestion: string;
  dealScore: number;
  dealQuality: string;
  bestDealPlatform: string;
  historicalInsight: string;
  refurbishedOptions: RefurbishedOption[];
  priceTrendSummary: PriceTrendSummary | null;
  priceDropAlertTriggered: boolean;
  marketplaceAvailability: Record<string, string>;
}

// --- PRICE ALERT TYPES ---

export interface PriceAlertInput {
  productId: string;
  productName: string;
  targetPrice: number;
  email?: string;
}

export interface PriceAlertRecord {
  id: string;
  productId: string;
  targetPrice: number;
  email: string | null;
  isTriggered: boolean;
  createdAt: string;
}
