import axios from "axios";

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE || "http://localhost:8004";

export const getCurrentUser = async (req, res) => {
    try {
        const userData = req.user;
        let creditsData = null;

        if (userData?.userId) {
            try {
                const { data } = await axios.get(`${PAYMENT_SERVICE_URL}/api/payment/credits`, {
                    headers: { "x-user-id": String(userData.userId) },
                    timeout: 5000,
                });
                creditsData = data;
            } catch (error) {
                console.error("Failed to fetch credits:", error?.message || error);
            }
        }

        return res.status(200).json({
            ...userData,
            credits: creditsData,
        });
    } catch (error) {
        return res.status(500).json({message: "Get current user error"})
    }
}
