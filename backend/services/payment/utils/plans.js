export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    description: "For casual users",
    credits: 20,
    price: 0,
    priceLabel: "Free",
    interval: "month",
    features: ["20 messages per month", "Basic AI responses", "Access to all agents"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For power users",
    credits: 500,
    price: 999,
    priceLabel: "₹9.99",
    razorpayPlanId: null,
    interval: "month",
    features: ["500 messages per month", "Priority AI responses", "Access to all agents", "PDF & PPT generation"],
  },
  business: {
    id: "business",
    name: "Business",
    description: "For teams & heavy usage",
    credits: 2000,
    price: 2499,
    priceLabel: "₹24.99",
    razorpayPlanId: null,
    interval: "month",
    features: ["2000 messages per month", "Highest priority", "All agents & features", "Bulk operations"],
  },
}

export const CREDIT_COST = {
  message: 1,
  pdf: 5,
  ppt: 5,
  image: 3,
}
