import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ["credit", "debit", "purchase", "reset", "refund", "bonus"],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    balance: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        default: "",
    },
    agent: {
        type: String,
        default: null,
    },
    razorpayPaymentId: {
        type: String,
        default: null,
    },
    razorpayOrderId: {
        type: String,
        default: null,
    },
    plan: {
        type: String,
        default: null,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, { timestamps: true })

transactionSchema.index({ userId: 1, createdAt: -1 })

const Transaction = mongoose.model("Transaction", transactionSchema)

export default Transaction
