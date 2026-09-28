// Sunken edge + brand-glow focus ring, matching the light customer-facing
// storefront (see StorefrontApp/HomePage). Shared by CheckoutStep and
// PhoneAuthStep so the two form styles never drift.
export const storefrontInputClass =
  "w-full rounded-xl border border-brand-ink/12 bg-white py-3 pl-10 pr-3.5 text-sm text-brand-ink placeholder:text-brand-ink/40 outline-none shadow-[inset_0_1px_2px_rgba(74,42,20,0.05)] transition-shadow duration-150 focus:border-brand-red/50 focus:shadow-[0_0_0_3px_rgba(187,94,44,0.14)]";
