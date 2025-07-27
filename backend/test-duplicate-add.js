const https = require('https');
const http = require('http');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(jsonData)
          });
        } catch (e) {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve({ error: data })
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testDuplicateAdd() {
  console.log('🧪 Testing Duplicate Add Prevention...\n');

  try {
    // Login
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    const loginData = await loginResponse.json();
    const authToken = loginData.tokens.accessToken;
    console.log('✅ Login successful');

    // Clear cart first
    await fetch('http://localhost:3001/api/cart', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    // Add item first time
    console.log('\n1. Adding item first time...');
    const add1Response = await fetch('http://localhost:3001/api/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ productId: 45, quantity: 1 })
    });

    if (add1Response.ok) {
      console.log('✅ First add successful');
    } else {
      console.log('❌ First add failed');
      return;
    }

    // Check cart after first add
    const cart1Response = await fetch('http://localhost:3001/api/cart', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (cart1Response.ok) {
      const cart1Data = await cart1Response.json();
      console.log('✅ Cart after first add:', {
        itemCount: cart1Data.summary.itemCount,
        items: cart1Data.items.length
      });
    }

    // Add same item again (should update quantity)
    console.log('\n2. Adding same item again...');
    const add2Response = await fetch('http://localhost:3001/api/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ productId: 45, quantity: 1 })
    });

    if (add2Response.ok) {
      console.log('✅ Second add successful');
    } else {
      console.log('❌ Second add failed');
      return;
    }

    // Check cart after second add
    const cart2Response = await fetch('http://localhost:3001/api/cart', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (cart2Response.ok) {
      const cart2Data = await cart2Response.json();
      console.log('✅ Cart after second add:', {
        itemCount: cart2Data.summary.itemCount,
        items: cart2Data.items.length
      });
      
      const item = cart2Data.items.find(i => i.productId === 45);
      if (item && item.quantity === 2) {
        console.log('✅ Quantity correctly increased to 2');
      } else {
        console.log('❌ Quantity not increased correctly');
      }
    }

    console.log('\n🎉 Duplicate add test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDuplicateAdd(); 