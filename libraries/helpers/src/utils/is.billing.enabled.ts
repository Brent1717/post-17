// The paid SaaS: plans and their limits are enforced. Stripe installs are
// detected by either of their keys (the orchestrator only needs the secret
// one), any other provider by PAYMENT_PROVIDER.
export const isBillingEnabled = () => {
  return (
    !!process.env.PAYMENT_PROVIDER ||
    !!process.env.STRIPE_PUBLISHABLE_KEY ||
    !!process.env.STRIPE_SECRET_KEY
  );
};
