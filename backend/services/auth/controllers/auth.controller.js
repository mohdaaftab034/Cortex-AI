import crypto from 'crypto'
import { getAuth } from 'firebase-admin/auth'
import { app } from '../config/firebase.js';
import User from '../models/user.model.js';
import redis from '../../../shared/redis/redis.js';
import axios from 'axios';

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE || "http://localhost:8004";

const initPaymentUser = async (userId, email, name) => {
    try {
        await axios.post(`${PAYMENT_SERVICE_URL}/api/payment/credits/init`, {
            userId: String(userId),
            email: email || "",
            name: name || "",
        }, { timeout: 5000 });
    } catch (error) {
        console.error("Failed to init payment user:", error?.message || error);
    }
};

export const login = async (req, res) => {
    try {
        const { token } = req.body;

        const decoded = await getAuth(app).verifyIdToken(token)
        let user = await User.findOne({
            firebaseUid: decoded.uid
        })

        if (!user) {
            user = await User.create({
                firebaseUid: decoded.uid,
                name: decoded.name,
                email: decoded.email,
                avatar: decoded.picture,
            })

            initPaymentUser(user._id, user.email, user.name);
        }

        const sessionId = crypto.randomUUID();

        await redis.set(`session-${sessionId}`, JSON.stringify({
            userId: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
        }), 'EX', 60 * 60 * 24 * 7);

        res.cookie('session', sessionId, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 1000 * 60 * 60 * 24 * 7,

        })

        return res.status(200).json(user);

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}


export const logout = async (req, res) => {
    try {
        const sessionId = req.cookies?.session;
        await redis.del(`session-${sessionId}`);
        res.clearCookie('session');
        return res.status(200).json({ message: 'Logged out successfully' });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}