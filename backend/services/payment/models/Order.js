import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    razorpayOrderId: {
        type: String,
        unique: true,
        sparse: true,
    },
    razorpayPaymentId: {
        type: String,
        default: null,
    },
    razorpaySignature: {
        type: String,
        default: null,
    },
    plan: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    credits: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["created", "paid", "failed"],
        default: "created",
    },
}, { timestamps: true })

const Order = mongoose.model("Order", orderSchema)

export default Order
