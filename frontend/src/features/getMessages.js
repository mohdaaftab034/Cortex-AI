import { api } from "../../utils/axios"

const getMessages = async (conversationId) => {
  try {
    const { data } = await api.get(`/api/chat/get-messages/${conversationId}`)
    console.log(data)
    return data
  } catch (error) {
    console.log(error)
    return [];
  }
}

export default getMessages