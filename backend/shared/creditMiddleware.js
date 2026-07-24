import axios from "axios"

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE || "http://localhost:8004"

const deductCredits = async (userId, agent = "message") => {
    try {
        const { data } = await axios.post(`${PAYMENT_SERVICE_URL}/api/payment/credits/deduct`, {
            userId,
            agent,
        }, { timeout: 5000 })
        return data
    } catch (error) {
        if (error.response?.status === 403) {
            return { canProceed: false, credits: error.response.data.credits, message: error.response.data.message }
        }
        console.error("Credit deduction error:", error?.message || error)
        return { canProceed: true, credits: 0, fallback: true }
    }
}

const creditGuard = (agentType) => {
    return async (req, res, next) => {
        const userId = req.user?.userId || req.headers["x-user-id"]
        if (!userId) return next()

        try {
            const result = await deductCredits(userId, agentType)

            if (result.fallback) {
                return next()
            }

            if (!result.canProceed) {
                return res.status(403).json({
                    message: result.message || "Insufficient credits",
                    credits: result.credits || 0,
                    insufficientCredits: true,
                })
            }

            req.creditsDeducted = result.deducted
            req.creditsRemaining = result.credits
            next()
        } catch (error) {
            console.error("Credit guard error:", error)
            next()
        }
    }
}

export { creditGuard, deductCredits }
