import Razorpay from "razorpay";

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

export const getRazorpayCredentials = (): RazorpayCredentials => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const err = new Error(
      "Razorpay config is missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    ) as Error & { statusCode?: number };
    err.statusCode = 500;
    throw err;
  }

  return { keyId, keySecret };
};

export const getRazorpayClient = (): Razorpay => {
  const { keyId, keySecret } = getRazorpayCredentials();
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};
