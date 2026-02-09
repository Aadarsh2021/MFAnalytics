
const API_KEY = '5e1b06fcd9ed77b5a46c643fd982a485';
const SERIES_ID = 'FEDFUNDS';
const START_DATE = '2024-01-01';

const targetUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${SERIES_ID}&api_key=${API_KEY}&file_type=json&observation_start=${START_DATE}`;
const encodedUrl = encodeURIComponent(targetUrl);

const proxies = [
    { name: 'Direct (Expect Fail w/o CORS in Browser, OK in Node)', url: targetUrl },
    { name: 'ThingProxy', url: `https://thingproxy.freeboard.io/fetch/${targetUrl}` },
    { name: 'AllOrigins', url: `https://api.allorigins.win/raw?url=${encodedUrl}` },
    { name: 'CodeTabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}` }
];

async function testProxies() {
    console.log("🔍 Testing Proxies for FRED Data Access...\n");

    for (const p of proxies) {
        process.stdout.write(`Testing ${p.name}... `);
        try {
            const start = Date.now();
            const res = await fetch(p.url, {
                headers: {
                    'Origin': 'http://localhost:3000' // Mock Origin
                }
            });
            const time = Date.now() - start;

            if (res.ok) {
                const text = await res.text();
                // Check if it's valid JSON and contains observations
                try {
                    const data = JSON.parse(text);
                    // Helper to find observations key properly
                    let obsCount = 0;
                    if (data.observations) obsCount = data.observations.length;
                    else if (data.contents) {
                        const inner = JSON.parse(data.contents);
                        if (inner.observations) obsCount = inner.observations.length;
                    }

                    if (obsCount > 0) {
                        console.log(`✅ OK (${time}ms) - Found ${obsCount} observations`);
                    } else {
                        console.log(`⚠️  Response OK but data format unexpected: ${text.substring(0, 50)}...`);
                    }
                } catch (jsonErr) {
                    console.log(`❌ Invalid JSON (${time}ms): ${text.substring(0, 50)}...`);
                }
            } else {
                console.log(`❌ Failed: Status ${res.status} (${res.statusText})`);
            }
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
        }
    }
}

testProxies();
