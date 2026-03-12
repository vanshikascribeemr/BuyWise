import { fetchAllMarketplaceListings } from './src/lib/marketplaces/index';
import { DiscoveredProduct } from './src/lib/types';

async function runDiscountValidation() {
  console.log("=== INITIATING LIVE PRICING & DISCOUNT VALIDATION ===");
  try {
    const product: DiscoveredProduct = {
      id: "val-test-1",
      name: "Samsung Galaxy S24 Ultra",
      brand: "Samsung",
      category: "Smartphone",
      searchKeywords: "Samsung Galaxy S24 Ultra 5G 256GB Titanium",
      aiReasoning: "",
      confidenceScore: 99,
      baseSpecs: {}
    };

    console.log(`Searching for: ${product.searchKeywords}`);
    const { listings, errors } = await fetchAllMarketplaceListings(product);
    
    if (errors.length > 0) {
      console.log("Fetcher warnings:", errors);
    }

    console.log("\n--- EXTRACTED PRICING DATA ---");
    let hasIssues = false;
    
    for (const l of listings) {
      console.log(`\nPlatform: ${l.platform}`);
      console.log(` - Product URL:     ${l.productUrl}`);
      console.log(` - Selling Price:   ₹${l.price.toLocaleString()}`);
      console.log(` - Original MRP:    ₹${l.originalPrice?.toLocaleString() || 'N/A'}`);
      console.log(` - Discount %:       ${l.discount}% OFF`);
      
      // Validation Logic checks
      if (l.price > 0 && l.originalPrice) {
         if (l.originalPrice < l.price) {
           console.log(`   ❌ ERROR: Original MRP (₹${l.originalPrice}) is less than Selling Price (₹${l.price})`);
           hasIssues = true;
         }
         
         const expectedDiscount = Math.round(((l.originalPrice - l.price) / l.originalPrice) * 100);
         if (l.discount !== expectedDiscount && l.discount > 0) {
           console.log(`   ❌ ERROR: Discount calc mismatch. Expected ${expectedDiscount}%, got ${l.discount}%`);
           hasIssues = true;
         } else if (l.discount > 0) {
           console.log(`   ✅ Discount Math Verified: ${expectedDiscount}%`);
         }
      } else if (l.price > 0 && (!l.originalPrice || l.originalPrice === 0)) {
         console.log(`   ⚠️ WARNING: Valid selling price found, but no explicit MRP extracted (normal for some sites).`);
      }
    }
    
    console.log("\n=== VALIDATION SUMMARY ===");
    console.log(hasIssues ? "❌ Issues found with the pricing math or extraction!" : "✅ All extracted pricing metrics and discount calculations are mathematically sound and functioning correctly.");

  } catch(e) {
    console.error("Critical Validation Error:", e);
  }
}

runDiscountValidation();
