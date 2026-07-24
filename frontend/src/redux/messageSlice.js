import { createSlice } from "@reduxjs/toolkit";

const messageSlice = createSlice({
    name: "message",
    initialState: {
        messages: [],
        isAiLoading: false,
        isMessagesLoading: false,
    },
    reducers: {
        setMessages: (state, action) => {
            state.messages = action.payload
        },
        appendMessage: (state, action) => {
            state.messages = [...state.messages, action.payload]
        },
        updateLastAssistantContent: (state, action) => {
            for (let i = state.messages.length - 1; i >= 0; i--) {
                if (state.messages[i].role === "assistant") {
                    state.messages[i].content += action.payload
                    break
                }
            }
        },
        setAiLoading: (state, action) => {
            state.isAiLoading = action.payload
        },
        setMessagesLoading: (state, action) => {
            state.isMessagesLoading = action.payload
        },
    }
})

export const { setMessages, appendMessage, updateLastAssistantContent, setAiLoading, setMessagesLoading } = messageSlice.actions;
export default messageSlice.reducer;