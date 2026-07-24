import { createSlice } from "@reduxjs/toolkit";

const conversationSlice = createSlice({
    name: "conversation",
    initialState: {
        conversations: [],
        selecedConversation: null,
        isConversationsLoading: false,
    },
    reducers: {
        setConversations: (state, action) => {
            state.conversations = action.payload
        },
        addConversation: (state, action) => {
            state.conversations.unshift(action.payload)
        },
        setSelectConversation: (state, action) => {
            state.selecedConversation = action.payload
        },
        setConversationsLoading: (state, action) => {
            state.isConversationsLoading = action.payload
        },
        updateConversationTitle: (state, action) => {
            const { id, title } = action.payload
            const conv = state.conversations.find(c => c._id === id)
            if (conv) {
                conv.title = title
            }
            if (state.selecedConversation?._id === id) {
                state.selecedConversation = { ...state.selecedConversation, title }
            }
        }
    }
})

export const { setConversations, addConversation, setSelectConversation, setConversationsLoading, updateConversationTitle } = conversationSlice.actions;
export default conversationSlice.reducer;