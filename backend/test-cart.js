const https = require('https');
const http = require('http');

// Simple fetch implementation for Node.js
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

const API_BASE = 'http://localhost:3001/api';

async function testCart() {
  console.log('🧪 Testing Cart Functionality...\n');

  try {
    // Test 1: Create a session and add item to cart
    console.log('1. Testing guest cart (session-based)...');
    const sessionId = Math.random().toString(36).substr(2, 9);
    
    const addResponse = await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
      },
      body: JSON.stringify({
        productId: 45,
        quantity: 2
      })
    });

    if (addResponse.ok) {
      const addData = await addResponse.json();
      console.log('✅ Added item to guest cart:', addData);
    } else {
      const error = await addResponse.json();
      console.log('❌ Failed to add item:', error);
    }

    // Test 2: Get cart contents
    console.log('\n2. Getting cart contents...');
    const getResponse = await fetch(`${API_BASE}/cart`, {
      headers: {
        'X-Session-ID': sessionId,
      }
    });

    if (getResponse.ok) {
      const cartData = await getResponse.json();
      console.log('✅ Cart contents:', {
        itemCount: cartData.summary.itemCount,
        total: cartData.summary.total,
        items: cartData.items.length
      });
    } else {
      const error = await getResponse.json();
      console.log('❌ Failed to get cart:', error);
    }

    // Test 3: Update quantity
    console.log('\n3. Updating item quantity...');
    const cartResponse = await fetch(`${API_BASE}/cart`, {
      headers: {
        'X-Session-ID': sessionId,
      }
    });

    if (cartResponse.ok) {
      const cartData = await cartResponse.json();
      if (cartData.items.length > 0) {
        const itemId = cartData.items[0].id;
        
        const updateResponse = await fetch(`${API_BASE}/cart/items/${itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId,
          },
          body: JSON.stringify({ quantity: 3 })
        });

        if (updateResponse.ok) {
          console.log('✅ Updated quantity successfully');
        } else {
          const error = await updateResponse.json();
          console.log('❌ Failed to update quantity:', error);
        }
      }
    }

    // Test 4: Get cart count
    console.log('\n4. Getting cart count...');
    const countResponse = await fetch(`${API_BASE}/cart/count`, {
      headers: {
        'X-Session-ID': sessionId,
      }
    });

    if (countResponse.ok) {
      const countData = await countResponse.json();
      console.log('✅ Cart count:', countData.count);
    } else {
      const error = await countResponse.json();
      console.log('❌ Failed to get cart count:', error);
    }

    console.log('\n🎉 Cart functionality test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCart(); 