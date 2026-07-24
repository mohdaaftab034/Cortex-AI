import mongoose from "mongoose";
import { PLANS } from "../utils/plans.js";

const userCreditsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    email: {
        type: String,
        default: "",
    },
    name: {
        type: String,
        default: "",
    },
    plan: {
        type: String,
        enum: Object.keys(PLANS),
        default: "free",
    },
    credits: {
        type: Number,
        default: PLANS.free.credits,
        min: 0,
    },
    totalCredits: {
        type: Number,
        default: PLANS.free.credits,
    },
    usedCredits: {
        type: Number,
        default: 0,
    },
    lastResetAt: {
        type: Date,
        default: Date.now,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true })

userCreditsSchema.methods.hasCredits = function (amount = 1) {
    return this.credits >= amount
}

userCreditsSchema.methods.deduct = function (amount = 1) {
    if (this.credits < amount) return false
    this.credits -= amount
    this.usedCredits += amount
    return true
}

userCreditsSchema.methods.addCredits = function (amount) {
    this.credits += amount
    this.totalCredits += amount
}

const UserCredits = mongoose.model("UserCredits", userCreditsSchema)

export default UserCredits
