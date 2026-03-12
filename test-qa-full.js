const runQA = async () => {
  try {
    console.log("1. Searching for product...");
    const searchRes = await fetch('http://localhost:3000/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'search', query: 'Lenovo IdeaPad Slim 3 15ADA6' })
    });
    const searchData = await searchRes.json();
    const product = searchData.results[0];
    if (!product) { console.log("No product found"); return; }

    console.log("2. Fetching detail for", product.id);
    const detailRes = await fetch('http://localhost:3000/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'detail', productId: product.id })
    });
    const data = await detailRes.json();

    // Build marketplace redirects from raw listings
    const platforms = ['Amazon', 'Flipkart', 'Reliance Digital', 'Croma'];
    const redirects = {};
    const discrepancies = [];

    for (const p of platforms) {
      const listing = data.product.listings.find(l => l.platform === p);
      if (listing && listing.productUrl && listing.productUrl !== '#') {
        redirects[p] = listing.productUrl;
      } else if (listing) {
        redirects[p] = "No URL (placeholder listing)";
        discrepancies.push(p + " listing exists but has no valid productUrl — buy button would fail ⚠️");
      } else {
        redirects[p] = "No listing";
        discrepancies.push(p + " has no listing object at all ⚠️");
      }
    }

    // Check availability labels
    const availability = data.advisor.marketplaceAvailability;
    for (const p of platforms) {
      const label = availability[p];
      const listing = data.product.listings.find(l => l.platform === p);
      if (!listing && label !== 'Not Available') {
        discrepancies.push(p + ": No listing but labeled '" + label + "' — should be 'Not Available' ❌");
      }
      if (listing && listing.price === 0 && !label.includes('Check stock')) {
        discrepancies.push(p + ": Price is 0 but not labeled 'Check stock' ❌");
      }
      if (listing && listing.price > 0 && label === 'Not Available') {
        discrepancies.push(p + ": Has price ₹" + listing.price + " but labeled 'Not Available' ❌");
      }
    }

    // Check refurbished logic
    let refurbNote = "No refurbished options returned";
    if (data.advisor.refurbishedOptions && data.advisor.refurbishedOptions.length > 0) {
      const allCheaper = data.advisor.refurbishedOptions.every(o => o.price < data.product.bestPrice);
      refurbNote = allCheaper
        ? "Refurbished options strictly cheaper than new ✅"
        : "ERROR: Refurbished option >= new price ❌";
    }
    discrepancies.push(refurbNote);

    // Availability fix check
    const hasCheckStock = Object.values(availability).some(v => v === 'Available - Check stock');
    if (hasCheckStock) {
      discrepancies.unshift("Previously 'Not Available' platforms now correctly show 'Available - Check stock' ✅");
    }

    const hasIssues = discrepancies.some(d => d.includes('❌'));
    const hasMissingUrls = Object.values(redirects).some(v => v.includes('No URL') || v === 'No listing');

    const report = {
      productName: data.product.name,
      bestPrice: data.product.bestPrice,
      marketplaceAvailability: availability,
      marketplaceRedirects: redirects,
      discrepancies,
      fixStatus: hasIssues ? "Issue persists" : (hasMissingUrls ? "Availability Resolved, URLs need attention" : "Fully Resolved")
    };

    console.log("\n================ QA REPORT ================\n");
    console.log(JSON.stringify(report, null, 2));

  } catch (err) {
    console.error("QA Error:", err);
  }
};
runQA();
