import Razorpay from "razorpay"
import crypto from "crypto"
import dotenv from "dotenv"
import UserCredits from "../models/UserCredits.js"
import Transaction from "../models/Transaction.js"
import Order from "../models/Order.js"
import { PLANS, CREDIT_COST } from "../utils/plans.js"

dotenv.config()

let razorpayInstance = null

const getRazorpay = () => {
    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        })
    }
    return razorpayInstance
}

// ─── Helpers ───────────────────────────────────────────

const recordTransaction = async (userId, type, amount, balance, options = {}) => {
    return Transaction.create({ userId, type, amount, balance, ...options })
}

// ─── Public ────────────────────────────────────────────

export const getPlans = async (req, res) => {
    const plans = Object.values(PLANS).map(({ id, name, description, credits, price, priceLabel, interval, features }) => ({
        id, name, description, credits, price, priceLabel, interval, features,
    }))
    return res.status(200).json(plans)
}

// ─── Credits ───────────────────────────────────────────

export const getCredits = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"] || req.user?.userId
        if (!userId) return res.status(400).json({ message: "User ID required" })

        let credits = await UserCredits.findOne({ userId })
        if (!credits) {
            credits = await UserCredits.create({
                userId,
                email: req.headers["x-user-email"] || "",
                name: req.headers["x-user-name"] || "",
            })
            await recordTransaction(userId, "bonus", PLANS.free.credits, PLANS.free.credits, {
                description: "Welcome bonus credits",
                plan: "free",
            })
        }

        return res.status(200).json({
            userId: credits.userId,
            plan: credits.plan,
            credits: credits.credits,
            totalCredits: credits.totalCredits,
            usedCredits: credits.usedCredits,
            lastResetAt: credits.lastResetAt,
        })
    } catch (error) {
        return res.status(500).json({ message: `Failed to get credits: ${error.message}` })
    }
}

export const deductCredits = async (req, res) => {
    try {
        const { userId, agent } = req.body
        if (!userId) return res.status(400).json({ message: "userId required" })

        const cost = CREDIT_COST[agent] || CREDIT_COST.message

        const credits = await UserCredits.findOne({ userId })
        if (!credits) {
            return res.status(400).json({ message: "No credit account found", credits: 0, canProceed: false })
        }

        if (credits.credits < cost) {
            return res.status(403).json({ message: "Insufficient credits", credits: credits.credits, canProceed: false })
        }

        credits.deduct(cost)
        await credits.save()

        await recordTransaction(userId, "debit", -cost, credits.credits, {
            description: `${agent || "message"} request`,
            agent: agent || null,
        })

        return res.status(200).json({
            message: "Credits deducted",
            deducted: cost,
            credits: credits.credits,
            canProceed: true,
        })
    } catch (error) {
        return res.status(500).json({ message: `Failed to deduct credits: ${error.message}` })
    }
}

// ─── Internal: called by auth service / admin ──────────

export const initializeUser = async (req, res) => {
    try {
        const { userId, email, name } = req.body
        if (!userId) return res.status(400).json({ message: "userId required" })

        const existing = await UserCredits.findOne({ userId })
        if (existing) return res.status(200).json({ message: "Already initialized", credits: existing })

        const credits = await UserCredits.create({ userId, email, name })
        await recordTransaction(userId, "bonus", PLANS.free.credits, PLANS.free.credits, {
            description: "Welcome bonus credits",
            plan: "free",
        })

        return res.status(201).json({ message: "User initialized", credits })
    } catch (error) {
        return res.status(500).json({ message: `Failed to init user: ${error.message}` })
    }
}

export const resetCredits = async (req, res) => {
    try {
        const { userId } = req.body
        if (!userId) return res.status(400).json({ message: "userId required" })

        const credits = await UserCredits.findOne({ userId })
        if (!credits) return res.status(400).json({ message: "User not found" })

        const planConfig = PLANS[credits.plan] || PLANS.free
        const previousCredits = credits.credits

        credits.credits = planConfig.credits
        credits.totalCredits = planConfig.credits
        credits.usedCredits = 0
        credits.lastResetAt = new Date()
        await credits.save()

        await recordTransaction(userId, "reset", planConfig.credits - previousCredits, credits.credits, {
            description: `Monthly reset for ${credits.plan} plan`,
            plan: credits.plan,
        })

        return res.status(200).json({ message: "Credits reset", credits: credits.credits })
    } catch (error) {
        return res.status(500).json({ message: `Failed to reset credits: ${error.message}` })
    }
}

// ─── Plan Changes ──────────────────────────────────────

export const changePlan = async (req, res) => {
    try {
        const { userId, plan } = req.body
        if (!userId || !plan) return res.status(400).json({ message: "userId and plan required" })

        const planConfig = PLANS[plan]
        if (!planConfig) return res.status(400).json({ message: "Invalid plan" })

        const credits = await UserCredits.findOne({ userId })
        if (!credits) return res.status(400).json({ message: "User not found" })

        credits.plan = plan
        credits.credits = planConfig.credits
        credits.totalCredits = planConfig.credits
        credits.usedCredits = 0
        credits.lastResetAt = new Date()
        await credits.save()

        await recordTransaction(userId, "credit", planConfig.credits, credits.credits, {
            description: `Changed to ${plan} plan`,
            plan,
        })

        return res.status(200).json({ message: `Plan changed to ${plan}`, credits: credits.credits, plan })
    } catch (error) {
        return res.status(500).json({ message: `Failed to change plan: ${error.message}` })
    }
}

// ─── Razorpay Orders ───────────────────────────────────

export const createOrder = async (req, res) => {
    try {
        const { plan } = req.body
        const userId = req.headers["x-user-id"] || req.user?.userId

        if (!userId) return res.status(400).json({ message: "User ID required" })
        if (!plan) return res.status(400).json({ message: "Plan required" })

        const planConfig = PLANS[plan]
        if (!planConfig || planConfig.price === 0) {
            return res.status(400).json({ message: "Invalid or free plan" })
        }

        const options = {
            amount: planConfig.price,
            currency: "INR",
            receipt: `receipt_${userId}_${Date.now()}`,
            notes: { userId, plan },
        }

        const razorpayOrder = await getRazorpay().orders.create(options)

        const order = await Order.create({
            userId,
            razorpayOrderId: razorpayOrder.id,
            plan,
            amount: planConfig.price,
            credits: planConfig.credits,
        })

        return res.status(200).json({
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            plan,
            credits: planConfig.credits,
            orderId: order._id,
        })
    } catch (error) {
        return res.status(500).json({ message: `Failed to create order: ${error.message}` })
    }
}

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body
        const userId = req.headers["x-user-id"] || req.user?.userId

        if (!userId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Missing payment details" })
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex")

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Invalid signature" })
        }

        const order = await Order.findOne({ razorpayOrderId: razorpay_order_id })
        if (!order) return res.status(400).json({ message: "Order not found" })

        order.razorpayPaymentId = razorpay_payment_id
        order.razorpaySignature = razorpay_signature
        order.status = "paid"
        await order.save()

        const planConfig = PLANS[order.plan] || PLANS.free

        let credits = await UserCredits.findOne({ userId })
        if (!credits) {
            credits = await UserCredits.create({ userId, plan: order.plan })
        }

        const previousPlan = credits.plan
        credits.plan = order.plan
        credits.credits = planConfig.credits
        credits.totalCredits = planConfig.credits
        credits.usedCredits = 0
        credits.lastResetAt = new Date()
        await credits.save()

        await recordTransaction(userId, "purchase", planConfig.credits, credits.credits, {
            description: `Purchased ${order.plan} plan (upgraded from ${previousPlan})`,
            razorpayPaymentId,
            razorpayOrderId: razorpay_order_id,
            plan: order.plan,
        })

        return res.status(200).json({
            message: "Payment verified",
            plan: order.plan,
            credits: credits.credits,
        })
    } catch (error) {
        return res.status(500).json({ message: `Payment verification failed: ${error.message}` })
    }
}

export const razorpayWebhook = async (req, res) => {
    try {
        const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body)
        const parsed = typeof req.body === "string" ? JSON.parse(req.body) : (req.body instanceof Buffer ? JSON.parse(req.body.toString()) : req.body)

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || ""
        const signature = req.headers["x-razorpay-signature"]

        if (webhookSecret) {
            const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex")
            if (signature !== expected) return res.status(400).json({ message: "Invalid webhook signature" })
        }

        const event = parsed.event
        const payload = parsed.payload

        if (event === "payment.captured" && payload?.payment?.entity) {
            const payment = payload.payment.entity
            const orderId = payment.order_id
            const paymentId = payment.id

            const order = await Order.findOne({ razorpayOrderId: orderId })
            if (order && order.status === "created") {
                order.razorpayPaymentId = paymentId
                order.status = "paid"
                await order.save()

                const planConfig = PLANS[order.plan] || PLANS.free
                let credits = await UserCredits.findOne({ userId: order.userId })
                if (!credits) {
                    credits = await UserCredits.create({ userId: order.userId, plan: order.plan })
                }

                credits.plan = order.plan
                credits.credits = planConfig.credits
                credits.totalCredits = planConfig.credits
                credits.usedCredits = 0
                credits.lastResetAt = new Date()
                await credits.save()

                await recordTransaction(order.userId, "purchase", planConfig.credits, credits.credits, {
                    description: `Webhook: Purchased ${order.plan} plan`,
                    razorpayPaymentId: paymentId,
                    razorpayOrderId: orderId,
                    plan: order.plan,
                })
            }
        }

        return res.status(200).json({ status: "ok" })
    } catch (error) {
        console.error("Webhook error:", error)
        return res.status(500).json({ message: "Webhook error" })
    }
}

// ─── History ────────────────────────────────────────────

export const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"] || req.user?.userId
        if (!userId) return res.status(400).json({ message: "User ID required" })

        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20
        const skip = (page - 1) * limit

        const [transactions, total] = await Promise.all([
            Transaction.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Transaction.countDocuments({ userId }),
        ])

        return res.status(200).json({ transactions, total, page, totalPages: Math.ceil(total / limit) })
    } catch (error) {
        return res.status(500).json({ message: `Failed to get history: ${error.message}` })
    }
}
