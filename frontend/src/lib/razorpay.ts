/**
 * Razorpay Checkout loader.
 *
 * The browser's job here is only to collect the payment and hand back an
 * id and signature. Whether the order is actually paid is decided by the
 * server verifying that signature (and by the webhook), never by this file
 * reporting success.
 */

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let loader: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in a browser'));
  if (window.Razorpay) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loader = null;
      reject(new Error("Couldn't reach the payment provider. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return loader;
}

export interface CheckoutSession {
  razorpay_key_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
}

export interface CheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface CheckoutCustomer {
  name?: string;
  email?: string;
  contact?: string;
}

/**
 * Resolves with the gateway handback when the customer pays, and rejects
 * if they dismiss the modal — so a closed checkout is a cancellation, not
 * a silent no-op.
 */
export async function openRazorpayCheckout(
  session: CheckoutSession,
  customer: CheckoutCustomer = {},
): Promise<CheckoutResult> {
  await loadScript();

  return new Promise<CheckoutResult>((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Payment provider failed to load.'));
      return;
    }

    let settled = false;

    const checkout = new window.Razorpay({
      key: session.razorpay_key_id,
      order_id: session.razorpay_order_id,
      amount: session.amount,
      currency: session.currency,
      name: 'Threadloom',
      description: 'Made-to-order garment',
      prefill: {
        name: customer.name ?? '',
        email: customer.email ?? '',
        contact: customer.contact ?? '',
      },
      theme: { color: '#141414' },
      handler: (response: CheckoutResult) => {
        settled = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          if (!settled) reject(new Error('Payment was cancelled.'));
        },
      },
    });

    checkout.open();
  });
}
