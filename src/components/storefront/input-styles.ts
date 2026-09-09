// Sunken 3D edge + brand-glow focus ring, matching the admin dashboard's
// form-field treatment — dark-theme variant for the customer-facing flow.
// Shared by CheckoutStep and PhoneAuthStep so the two form styles never drift.
export const storefrontInputClass =
  "w-full rounded-xl border border-stone-700/80 bg-stone-900/70 py-3 pl-10 pr-3.5 text-sm text-stone-100 placeholder:text-stone-500 outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.55),inset_0_-1px_0_rgba(255,255,255,0.04)] transition-shadow duration-150 focus:border-brand-red/50 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_0_0_3px_rgba(228,35,19,0.18)]";
