const { AlipaySdk } = require('alipay-sdk');


const alipaySdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID,
  privateKey: process.env.ALIPAY_PRIVATE_KEY,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
  gateway: process.env.ALIPAY_GATEWAY_ADDRESS,
  timeout: 5000,
  camelcase: true,
});

async function createOrder({ outTradeNo, totalAmount, subject, returnUrl, notifyUrl }) {
  const result = await alipaySdk.pageExec('alipay.trade.page.pay', {
    notifyUrl,
    returnUrl,
    bizContent: {
      outTradeNo,
      productCode: 'FAST_INSTANT_TRADE_PAY',
      totalAmount: totalAmount.toFixed(2),
      subject,
    },
  });
  return result; // This is a URL to redirect the user to Alipay
}

// Alipay signature verification helper
function verifyCallback(params) {
  return alipaySdk.checkNotifySign(params);
}

module.exports = {
  createOrder,
  verifyCallback,
}; 