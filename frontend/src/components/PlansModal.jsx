import { useState, useEffect } from "react"
import { Check, X, Sparkles, Loader2 } from "lucide-react"
import { useSelector } from "react-redux"
import getPlans from "../features/getPlans"
import createPaymentOrder from "../features/createPaymentOrder"

const PlansModal = ({ open, onClose }) => {
  const { userData } = useSelector(state => state.user)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [purchasing, setPurchasing] = useState(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getPlans().then(data => {
      setPlans(data || [])
      setLoading(false)
    })
  }, [open])

  const handlePurchase = async (plan) => {
    if (!plan || plan.price === 0) return
    setPurchasing(plan.id)

    try {
      const order = await createPaymentOrder(plan.id)
      if (!order?.id) {
        setPurchasing(null)
        return
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "CortexAI",
        description: `${plan.name} Plan — ${plan.credits} credits`,
        order_id: order.id,
        handler: () => {
          setPurchasing(null)
          window.location.reload()
        },
        prefill: {
          name: userData?.name || "",
          email: userData?.email || "",
        },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => setPurchasing(null),
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on("payment.failed", () => setPurchasing(null))
      rzp.open()
    } catch {
      setPurchasing(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#13151c] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
              <Sparkles size={15} className="text-white" />
            </div>
            <h2 className="text-[16px] font-semibold text-slate-100">Choose a Plan</h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer bg-transparent border-none"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {plans.map((plan) => {
                const isCurrent = userData?.credits?.plan === plan.id
                const isFree = plan.price === 0
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-xl border p-4 transition-all duration-150 ${
                      isCurrent
                        ? "border-indigo-500/40 bg-indigo-500/8"
                        : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14]"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-[15px] font-semibold text-slate-100">{plan.name}</h3>
                        <p className="text-[12px] text-slate-500 mt-0.5">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[18px] font-bold text-slate-100">{plan.priceLabel}</p>
                        <p className="text-[11px] text-slate-500">/ {plan.interval}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-[13px] font-medium text-indigo-400">
                        {plan.credits} credits per {plan.interval}
                      </span>
                    </div>

                    <ul className="flex flex-col gap-1.5 mb-4">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-[12px] text-slate-400">
                          <Check size={12} className="text-indigo-400 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="w-full py-2.5 rounded-lg text-center text-[13px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
                        Current Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePurchase(plan)}
                        disabled={purchasing === plan.id}
                        className={`w-full py-2.5 rounded-lg text-[13px] font-medium border-none cursor-pointer transition-all duration-150 ${
                          isFree
                            ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.10]"
                            : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90 shadow-lg shadow-indigo-500/20"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {purchasing === plan.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            Processing...
                          </span>
                        ) : isFree ? (
                          "Current Plan"
                        ) : (
                          `Subscribe — ${plan.priceLabel}`
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlansModal
