import { api } from "../../utils/axios"

const getPlans = async () => {
    try {
        const { data } = await api.get("/api/payment/plans")
        return data
    } catch (error) {
        console.log(error)
        return []
    }
}

export default getPlans
