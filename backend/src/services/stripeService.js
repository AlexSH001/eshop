// Validate Stripe configuration
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  Stripe secret key not configured. Payment functionality will be disabled.');
  console.warn('   Please set STRIPE_SECRET_KEY in your .env file');
  console.warn('   Get your key from: https://dashboard.stripe.com/apikeys');
}

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Create a Stripe payment link for an order
 * @param {Object} params - Payment parameters
 * @param {string} params.orderId - Order ID
 * @param {number} params.total - Total amount in cents
 * @param {string} params.currency - Currency code (default: 'sgd')
 * @param {string} params.customerEmail - Customer email
 * @param {Object} params.metadata - Additional metadata
 * @param {string} params.successUrl - Success redirect URL
 * @param {string} params.cancelUrl - Cancel redirect URL
 * @returns {Promise<Object>} Payment link object
 */
async function createPaymentLink({ 
  orderId, 
  total, 
  currency = 'sgd', 
  customerEmail, 
  metadata = {}, 
  successUrl, 
  cancelUrl 
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.');
  }

  try {
    // Create a price for the order
    const price = await stripe.prices.create({
      unit_amount: Math.round(total * 100), // Convert to cents
      currency: currency.toLowerCase(),
      product_data: {
        name: `Order #${orderId}`,
      },
    });

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      metadata: {
        orderId,
        ...metadata,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: successUrl,
        },
      },
      allow_promotion_codes: false,
    });

    return {
      paymentLinkId: paymentLink.id,
      url: paymentLink.url,
      priceId: price.id,
    };
  } catch (error) {
    console.error('Error creating Stripe payment link:', error);
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
