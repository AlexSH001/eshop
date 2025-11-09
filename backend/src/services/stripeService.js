// Validate Stripe configuration
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  Stripe secret key not configured. Payment functionality will be disabled.');
  console.warn('   Please set STRIPE_SECRET_KEY in your .env file');
  console.warn('   Get your key from: https://dashboard.stripe.com/apikeys');
}

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Create a Stripe Checkout Session for an order (supports pre-filling shipping address)
 * @param {Object} params - Payment parameters
 * @param {string} params.orderId - Order ID
 * @param {number} params.total - Total amount in cents
 * @param {string} params.currency - Currency code (default: 'sgd')
 * @param {string} params.customerEmail - Customer email
 * @param {Object} params.shippingAddress - Shipping address to pre-fill (optional)
 * @param {Object} params.metadata - Additional metadata
 * @param {string} params.successUrl - Success redirect URL
 * @param {string} params.cancelUrl - Cancel redirect URL
 * @returns {Promise<Object>} Checkout session object
 */
async function createPaymentLink({ 
  orderId, 
  total, 
  currency = 'sgd', 
  customerEmail, 
  shippingAddress,
  metadata = {}, 
  successUrl, 
  cancelUrl 
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
  }

  try {
    // Build checkout session configuration
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Order #${orderId}`,
            },
            unit_amount: Math.round(total * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        orderId,
        ...metadata,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    };

    // Pre-fill shipping address if provided
    if (shippingAddress) {
      const firstName = shippingAddress.firstName || shippingAddress.first_name || '';
      const lastName = shippingAddress.lastName || shippingAddress.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Build shipping address object, filtering out undefined values
      const shippingAddr = {
        line1: shippingAddress.addressLine1 || shippingAddress.address_line_1,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postal_code: shippingAddress.postalCode || shippingAddress.postal_code,
        country: shippingAddress.country || 'US',
      };
      
      // Only add line2 if it exists
      const addressLine2 = shippingAddress.addressLine2 || shippingAddress.address_line_2;
      if (addressLine2 && addressLine2.trim()) {
        shippingAddr.line2 = addressLine2.trim();
      }
      
      // Pre-fill customer details with shipping address
      sessionConfig.customer_email = customerEmail;
      sessionConfig.customer_details = {
        email: customerEmail,
        shipping: {
          address: shippingAddr,
        },
      };
      
      // Only add name if we have it
      if (fullName) {
        sessionConfig.customer_details.shipping.name = fullName;
      }

      // Set shipping address collection - it will use the pre-filled data
      // but still allows editing if needed
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'],
      };
    } else {
      // If no shipping address provided, require collection
      if (customerEmail) {
        sessionConfig.customer_email = customerEmail;
      }
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'],
      };
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return {
      paymentLinkId: session.id, // Keep same property name for compatibility
      url: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    console.error('Error details:', error.message, error.stack);
    throw new Error(`Failed to create payment link: ${error.message}`);
  }
}

/**
 * Retrieve a payment link by ID
 * @param {string} paymentLinkId - Payment link ID
 * @returns {Promise<Object>} Payment link object
 */
async function getPaymentLink(paymentLinkId) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
  }

  try {
    return await stripe.paymentLinks.retrieve(paymentLinkId);
  } catch (error) {
    console.error('Error retrieving Stripe payment link:', error);
    throw new Error(`Failed to retrieve payment link: ${error.message}`);
  }
}

// Note: Checkout session functions removed - using payment links only

/**
 * Verify webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @param {string} endpointSecret - Webhook endpoint secret
 * @returns {Object} Parsed event object
 */
function verifyWebhookSignature(payload, signature, endpointSecret) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}

/**
 * Handle successful payment
 * @param {Object} event - Stripe event object
 * @returns {Object} Payment details
 */
function handlePaymentSuccess(event) {
  const session = event.data.object;
  
  return {
    sessionId: session.id,
    paymentIntentId: session.payment_intent,
    customerEmail: session.customer_email,
    amountTotal: session.amount_total,
    currency: session.currency,
    metadata: session.metadata,
    orderId: session.metadata?.orderId,
    paymentMethod: session.metadata?.paymentMethod,
  };
}

// Note: createPayment function removed - using payment links directly

module.exports = {
  createPaymentLink,
  getPaymentLink,
  verifyWebhookSignature,
  handlePaymentSuccess,
};
