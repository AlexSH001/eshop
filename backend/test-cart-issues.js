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

async function testCartIssues() {
  console.log('🧪 Testing Cart Issues Fixes...\n');

  try {
    // Test 1: Login
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      console.log('❌ Login failed:', error.error);
      return;
    }

    const loginData = await loginResponse.json();
    const authToken = loginData.tokens.accessToken;
    console.log('✅ Login successful');

    // Test 2: Add item to user cart
    console.log('\n2. Adding item to user cart...');
    const addResponse = await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        productId: 45,
        quantity: 1
      })
    });

    if (addResponse.ok) {
      console.log('✅ Added item to user cart');
    } else {
      const error = await addResponse.json();
      console.log('❌ Failed to add item:', error.error);
      return;
    }

    // Test 3: Check user cart
    console.log('\n3. Checking user cart...');
    const userCartResponse = await fetch(`${API_BASE}/cart`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    if (userCartResponse.ok) {
      const userCartData = await userCartResponse.json();
      console.log('✅ User cart:', {
        itemCount: userCartData.summary.itemCount,
        total: userCartData.summary.total,
        items: userCartData.items.length
      });
    } else {
      console.log('❌ Failed to get user cart');
      return;
    }

    // Test 4: Simulate duplicate add (should update quantity instead)
    console.log('\n4. Testing duplicate add (should update quantity)...');
    const duplicateAddResponse = await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        productId: 45,
        quantity: 1
      })
    });

    if (duplicateAddResponse.ok) {
      console.log('✅ Duplicate add handled correctly');
    } else {
      const error = await duplicateAddResponse.json();
      console.log('❌ Duplicate add failed:', error.error);
    }

    // Test 5: Check cart after duplicate add
    console.log('\n5. Checking cart after duplicate add...');
    const afterDuplicateResponse = await fetch(`${API_BASE}/cart`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    if (afterDuplicateResponse.ok) {
      const afterDuplicateData = await afterDuplicateResponse.json();
      console.log('✅ Cart after duplicate add:', {
        itemCount: afterDuplicateData.summary.itemCount,
        total: afterDuplicateData.summary.total,
        items: afterDuplicateData.items.length
      });
      
      // Check if quantity increased correctly
      const item = afterDuplicateData.items.find(i => i.productId === 45);
      if (item && item.quantity === 2) {
        console.log('✅ Quantity correctly increased to 2');
      } else {
        console.log('❌ Quantity not increased correctly');
      }
    } else {
      console.log('❌ Failed to get cart after duplicate add');
    }

    // Test 6: Create guest session and add items
    console.log('\n6. Creating guest session and adding items...');
    const sessionId = Math.random().toString(36).substr(2, 9);
    
    const guestAddResponse = await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
      },
      body: JSON.stringify({
        productId: 46,
        quantity: 1
      })
    });

    if (guestAddResponse.ok) {
      console.log('✅ Added item to guest cart');
    } else {
      const error = await guestAddResponse.json();
      console.log('❌ Failed to add guest item:', error.error);
      return;
    }

    // Test 7: Check guest cart
    console.log('\n7. Checking guest cart...');
    const guestCartResponse = await fetch(`${API_BASE}/cart`, {
      headers: {
        'X-Session-ID': sessionId,
      }
    });

    if (guestCartResponse.ok) {
      const guestCartData = await guestCartResponse.json();
      console.log('✅ Guest cart:', {
        itemCount: guestCartData.summary.itemCount,
        total: guestCartData.summary.total,
        items: guestCartData.items.length
      });
    } else {
      console.log('❌ Failed to get guest cart');
      return;
    }

    // Test 8: Test cart merge (simulate login with existing guest cart)
    console.log('\n8. Testing cart merge...');
    const mergeResponse = await fetch(`${API_BASE}/cart/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ sessionId })
    });

    if (mergeResponse.ok) {
      console.log('✅ Cart merge successful');
    } else {
      const error = await mergeResponse.json();
      console.log('❌ Cart merge failed:', error.error);
      return;
    }

    // Test 9: Check merged user cart (should have both items)
    console.log('\n9. Checking merged user cart...');
    const mergedCartResponse = await fetch(`${API_BASE}/cart`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });

    if (mergedCartResponse.ok) {
      const mergedCartData = await mergedCartResponse.json();
      console.log('✅ Merged user cart:', {
        itemCount: mergedCartData.summary.itemCount,
        total: mergedCartData.summary.total,
        items: mergedCartData.items.length
      });
      
      // Check if both items are present
      const item45 = mergedCartData.items.find(i => i.productId === 45);
      const item46 = mergedCartData.items.find(i => i.productId === 46);
      
      if (item45 && item46) {
        console.log('✅ Both items present in merged cart');
        console.log(`   - Product 45: quantity ${item45.quantity}`);
        console.log(`   - Product 46: quantity ${item46.quantity}`);
      } else {
        console.log('❌ Not all items present in merged cart');
      }
    } else {
      console.log('❌ Failed to get merged cart');
      return;
    }

    // Test 10: Test guest cart after merge (should be empty)
    console.log('\n10. Checking guest cart after merge...');
    const postMergeGuestResponse = await fetch(`${API_BASE}/cart`, {
      headers: {
        'X-Session-ID': sessionId,
      }
    });

    if (postMergeGuestResponse.ok) {
      const postMergeGuestData = await postMergeGuestResponse.json();
      console.log('✅ Guest cart after merge:', {
        itemCount: postMergeGuestData.summary.itemCount,
        total: postMergeGuestData.summary.total,
        items: postMergeGuestData.items.length
      });
      
      if (postMergeGuestData.summary.itemCount === 0) {
        console.log('✅ Guest cart correctly cleared after merge');
      } else {
        console.log('❌ Guest cart not cleared after merge');
      }
    } else {
      console.log('❌ Failed to get guest cart after merge');
    }

    console.log('\n🎉 Cart issues test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCartIssues(); 