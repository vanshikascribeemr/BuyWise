const start = Date.now();
fetch('http://localhost:3000/api/recommend', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mode: 'search', query: 'Samsung S24 Ultra' })
})
.then(res => res.json())
.then(data => {
  console.log('Search took:', (Date.now() - start) / 1000 + 's');
  console.log('Found', data.results ? data.results.length : 0, 'results');
})
.catch(console.error);
