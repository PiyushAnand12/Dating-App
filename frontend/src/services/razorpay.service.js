import api from '../api/axios';

/**
 * Razorpay Integration Service
 * Provides methods to load the Razorpay SDK and initiate payments/subscriptions.
 */

const RAZORPAY_SDK_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Loads the Razorpay SDK dynamically.
 * @returns {Promise<boolean>} Resolves true when loaded, false otherwise.
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SDK_URL;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Initiates a Razorpay Subscription Checkout
 * @param {Object} options - Subscription details
 * @param {string} options.subscriptionId - The subscription ID from backend
 * @param {string} options.keyId - Razorpay Key ID
 * @param {Object} options.prefill - User details (name, email, contact)
 * @param {Function} options.onSuccess - Callback on success
 * @param {Function} options.onDismiss - Callback on modal close
 */
export const openSubscriptionCheckout = async ({
  subscriptionId,
  keyId,
  prefill = {},
  onSuccess,
  onDismiss
}) => {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error('Razorpay SDK failed to load. Are you offline?');
  }

  const options = {
    key: keyId,
    subscription_id: subscriptionId,
    name: 'Dating App Premium',
    description: 'Elevate your dating experience',
    image: 'https://cdn.razorpay.com/logos/BUV9Ucb3By5zSp_medium.png', // Placeholder
    handler: function (response) {
      // response = { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
      if (onSuccess) onSuccess(response);
    },
    prefill: {
      name: prefill.name || '',
      email: prefill.email || '',
      contact: prefill.contact || ''
    },
    theme: {
      color: '#ff2d55' // Match app primary color
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      }
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
};

/**
 * Initiates a Razorpay Order Checkout (One-time payment)
 * @param {Object} options - Order details
 * @param {Object} options.order - The order object from backend
 * @param {string} options.keyId - Razorpay Key ID
 * @param {Object} options.prefill - User details
 * @param {Function} options.onSuccess - Callback on success
 */
export const openOrderCheckout = async ({
  order,
  keyId,
  prefill = {},
  onSuccess,
  onDismiss
}) => {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded) {
    throw new Error('Razorpay SDK failed to load.');
  }

  const options = {
    key: keyId,
    amount: order.amount,
    currency: order.currency,
    name: 'Dating App',
    description: 'Add-on Purchase',
    order_id: order.id,
    handler: function (response) {
      // response = { razorpay_payment_id, razorpay_order_id, razorpay_signature }
      if (onSuccess) onSuccess(response);
    },
    prefill: {
      name: prefill.name || '',
      email: prefill.email || '',
      contact: prefill.contact || ''
    },
    theme: {
      color: '#ff2d55'
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      }
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
};

export default {
  loadRazorpayScript,
  openSubscriptionCheckout,
  openOrderCheckout
};
