import express from "express"
import {
    getPlans,
    getCredits,
    deductCredits,
    initializeUser,
    resetCredits,
    changePlan,
    createOrder,
    verifyPayment,
    getTransactionHistory,
} from "../controllers/payment.controller.js"

const router = express.Router()

router.get("/plans", getPlans)
router.get("/credits", getCredits)
router.get("/transactions", getTransactionHistory)

router.post("/credits/deduct", deductCredits)
router.post("/credits/reset", resetCredits)
router.post("/credits/init", initializeUser)
router.post("/plan/change", changePlan)
router.post("/order/create", createOrder)
router.post("/order/verify", verifyPayment)

export default router
