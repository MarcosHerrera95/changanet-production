// Test script for the new search endpoints
const http = require('http');

const BASE_URL = 'http://localhost:3003';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testEndpoints() {
  console.log('🧪 Testing Search and Filters System Endpoints\n');

  try {
    // Test 1: Basic search endpoint
    console.log('1️⃣ Testing GET /api/search (basic search)');
    const basicSearch = await makeRequest('/api/search');
    console.log(`Status: ${basicSearch.status}`);
    if (basicSearch.status === 200) {
      console.log(`✅ Found ${basicSearch.data.total} professionals`);
    } else {
      console.log(`❌ Error: ${JSON.stringify(basicSearch.data)}`);
    }
    console.log('');

    // Test 2: Search with query
    console.log('2️⃣ Testing GET /api/search?q=plomero');
    const querySearch = await makeRequest('/api/search?q=plomero');
    console.log(`Status: ${querySearch.status}`);
    if (querySearch.status === 200) {
      console.log(`✅ Found ${querySearch.data.total} professionals for "plomero"`);
    } else {
      console.log(`❌ Error: ${JSON.stringify(querySearch.data)}`);
    }
    console.log('');

    // Test 3: Search with filters
    console.log('3️⃣ Testing GET /api/search with filters');
    const filteredSearch = await makeRequest('/api/search?specialty=Plomero&minPrice=1000&maxPrice=5000&orderBy=rating&page=1&limit=5');
    console.log(`Status: ${filteredSearch.status}`);
    if (filteredSearch.status === 200) {
      console.log(`✅ Found ${filteredSearch.data.total} professionals with filters`);
      console.log(`   Page: ${filteredSearch.data.page}, Limit: ${filteredSearch.data.limit}`);
    } else {
      console.log(`❌ Error: ${JSON.stringify(filteredSearch.data)}`);
    }
    console.log('');

    // Test 4: Autocomplete endpoint
    console.log('4️⃣ Testing GET /api/search/autocomplete?q=plom');
    const autocomplete = await makeRequest('/api/search/autocomplete?q=plom');
    console.log(`Status: ${autocomplete.status}`);
    if (autocomplete.status === 200) {
      console.log(`✅ Autocomplete results:`);
      console.log(`   Specialties: ${autocomplete.data.specialties?.length || 0}`);
      console.log(`   Cities: ${autocomplete.data.cities?.length || 0}`);
      console.log(`   Districts: ${autocomplete.data.districts?.length || 0}`);
    } else {
      console.log(`❌ Error: ${JSON.stringify(autocomplete.data)}`);
    }
    console.log('');

    // Test 5: Invalid parameters
    console.log('5️⃣ Testing GET /api/search with invalid orderBy');
    const invalidSearch = await makeRequest('/api/search?orderBy=invalid');
    console.log(`Status: ${invalidSearch.status}`);
    if (invalidSearch.status === 400) {
      console.log(`✅ Correctly rejected invalid parameter`);
    } else {
      console.log(`❌ Should have returned 400: ${JSON.stringify(invalidSearch.data)}`);
    }
    console.log('');

    // Test 6: Rate limiting test (multiple requests)
    console.log('6️⃣ Testing rate limiting (multiple requests)');
    const promises = [];
    for (let i = 0; i < 65; i++) {
      promises.push(makeRequest('/api/search'));
    }

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
    const rateLimitedCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 429).length;

    console.log(`✅ Successful requests: ${successCount}`);
    console.log(`🛡️ Rate limited requests: ${rateLimitedCount}`);
    console.log('');

    console.log('🎉 Search and Filters System testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
testEndpoints();