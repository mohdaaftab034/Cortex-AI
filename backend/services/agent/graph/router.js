export const router = async (state) => {
    const agent = state.agent || "chat"
    return {
        ...state,
        agent: agent === "auto" ? "common" : agent,
    }
}
