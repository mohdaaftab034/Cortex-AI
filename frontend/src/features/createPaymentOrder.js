import { api } from "../../utils/axios"

const createPaymentOrder = async (plan) => {
    try {
        const { data } = await api.post("/api/payment/order/create", { plan })
        return data
    } catch (error) {
        console.log(error)
        return null
    }
}

export default createPaymentOrder
