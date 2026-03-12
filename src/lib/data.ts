
export interface PlatformListing {
  platform: 'Amazon' | 'Flipkart' | 'Reliance Digital';
  price: number;
  discount: number;
  warranty: string;
  warrantyYears: number;
  seller: string;
  productUrl: string;
  rating: number;
  deliveryTime: string;
}

export interface AggregatedProduct {
  id: string;
  name: string;
  category: string;
  image: string;
  rating: number;
  baseSpecs: {
    [key: string]: string | number;
  };
  listings: PlatformListing[];
}

export const mockProducts: AggregatedProduct[] = [
  // LAPTOPS
  {
    id: 'macbook-air-m2',
    name: 'Apple MacBook Air M2 (8GB, 256GB)',
    category: 'laptop',
    image: 'https://m.media-amazon.com/images/I/71f5Eu5lJSL._SX679_.jpg',
    rating: 4.8,
    baseSpecs: { processor: 'M2', ram: '8GB', storage: '256GB SSD', weight: '1.24kg', display: '13.6 Liquid Retina' },
    listings: [
      { platform: 'Amazon', price: 92000, discount: 8, warranty: '1 Year Apple Warranty', warrantyYears: 1, seller: 'Appario', rating: 4.5, deliveryTime: 'Tomorrow', productUrl: '#' },
      { platform: 'Flipkart', price: 89999, discount: 10, warranty: '1 Year Apple Warranty', warrantyYears: 1, seller: 'MPDSLR', rating: 4.2, deliveryTime: '2 Days', productUrl: '#' },
    ]
  },
  {
    id: 'hp-victus-15',
    name: 'HP Victus 15 (Ryzen 5, RTX 3050)',
    category: 'laptop',
    image: 'https://m.media-amazon.com/images/I/71hXTS-DndL._SX679_.jpg',
    rating: 4.3,
    baseSpecs: { processor: 'Ryzen 5 5600H', ram: '16GB', storage: '512GB SSD', weight: '2.29kg', display: '15.6 FHD 144Hz' },
    listings: [
      { platform: 'Amazon', price: 62000, discount: 15, warranty: '1 Year Warranty', warrantyYears: 1, seller: 'HP Auth', rating: 4.7, deliveryTime: '3 Days', productUrl: '#' },
      { platform: 'Flipkart', price: 59990, discount: 18, warranty: '1 Year Warranty', warrantyYears: 1, seller: 'Sellers Hub', rating: 4.0, deliveryTime: '5 Days', productUrl: '#' },
    ]
  },
  // SMARTPHONES
  {
    id: 'samsung-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra (256GB)',
    category: 'smartphone',
    image: 'https://m.media-amazon.com/images/I/71RVuBr6QsL._SX679_.jpg',
    rating: 4.9,
    baseSpecs: { processor: 'Snapdragon 8 Gen 3', ram: '12GB', battery: '5000mAh', display: '6.8 Dynamic AMOLED 2X', weight: '232g' },
    listings: [
      { platform: 'Amazon', price: 129000, discount: 5, warranty: '1 Year Brand Warranty', warrantyYears: 1, seller: 'Samsung India', rating: 4.9, deliveryTime: 'Tomorrow', productUrl: '#' },
      { platform: 'Reliance Digital', price: 128000, discount: 6, warranty: '1 Year Brand Warranty', warrantyYears: 1, seller: 'Reliance', rating: 4.6, deliveryTime: 'Today', productUrl: '#' },
    ]
  },
  {
    id: 'samsung-s24-base',
    name: 'Samsung Galaxy S24 (128GB)',
    category: 'smartphone',
    image: 'https://m.media-amazon.com/images/I/71RVuBr6QsL._SX679_.jpg',
    rating: 4.4,
    baseSpecs: { processor: 'Exynos 2400', ram: '8GB', battery: '4000mAh', display: '6.2 Dynamic AMOLED 2X', weight: '167g' },
    listings: [
      { platform: 'Amazon', price: 79000, discount: 10, warranty: '1 Year Brand Warranty', warrantyYears: 1, seller: 'Samsung India', rating: 4.5, deliveryTime: 'Tomorrow', productUrl: '#' },
      { platform: 'Flipkart', price: 78500, discount: 11, warranty: '1 Year Brand Warranty', warrantyYears: 1, seller: 'RetailNet', rating: 4.2, deliveryTime: '2 Days', productUrl: '#' },
    ]
  },
  // MATTRESSES
  {
    id: 'sleepycat-hybrid',
    name: 'SleepyCat Hybrid Latex Mattress',
    category: 'mattress',
    image: 'https://m.media-amazon.com/images/I/71OqfB-zT+L._SX679_.jpg',
    rating: 4.6,
    baseSpecs: { material: 'Latex & Spring', size: 'Queen', thickness: '8 inch', firmness: 'Medium Firm', trialPeriod: '100 Nights' },
    listings: [
      { platform: 'Amazon', price: 18000, discount: 12, warranty: '10 Years Warranty', warrantyYears: 10, seller: 'SleepyCat Official', rating: 4.8, deliveryTime: '7 Days', productUrl: '#' },
      { platform: 'Flipkart', price: 17500, discount: 15, warranty: '10 Years Warranty', warrantyYears: 10, seller: 'RetailNet', rating: 4.5, deliveryTime: '9 Days', productUrl: '#' },
    ]
  },
  {
    id: 'wakefit-ortho',
    name: 'Wakefit Orthopedic Memory Foam',
    category: 'mattress',
    image: 'https://m.media-amazon.com/images/I/71ZpTfB-zT+L._SX679_.jpg',
    rating: 4.5,
    baseSpecs: { material: 'Memory Foam', size: 'Queen', thickness: '6 inch', firmness: 'Medium', trialPeriod: '100 Nights' },
    listings: [
      { platform: 'Amazon', price: 12500, discount: 20, warranty: '7 Years Warranty', warrantyYears: 7, seller: 'Wakefit Auth', rating: 4.9, deliveryTime: '3 Days', productUrl: '#' },
      { platform: 'Flipkart', price: 12200, discount: 22, warranty: '7 Years Warranty', warrantyYears: 7, seller: 'RetailNet', rating: 4.7, deliveryTime: '5 Days', productUrl: '#' },
    ]
  },
  // BOTTLES
  {
    id: 'milton-thermosteel',
    name: 'Milton Thermosteel Duo DLX',
    category: 'bottle',
    image: 'https://m.media-amazon.com/images/I/51r+Br6QsL._SX679_.jpg',
    rating: 4.4,
    baseSpecs: { capacity: '1000ml', material: 'Stainless Steel', insulation: '24 Hours Hot/Cold', leakProof: 'Yes', dishwasherSafe: 'No' },
    listings: [
      { platform: 'Amazon', price: 950, discount: 10, warranty: '1 Year Warranty', warrantyYears: 1, seller: 'Milton Store', rating: 4.6, deliveryTime: 'Tomorrow', productUrl: '#' },
    ]
  }
];
