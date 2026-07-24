import { createSlice } from "@reduxjs/toolkit";

const pptSlice = createSlice({
    name: "ppt",
    initialState: {
        pptUrl: null,
        isOpen: false,
    },
    reducers: {
        openPpt: (state, action) => {
            state.pptUrl = action.payload;
            state.isOpen = true;
        },
        closePpt: (state) => {
            state.pptUrl = null;
            state.isOpen = false;
        },
        togglePptPanel: (state) => {
            state.isOpen = !state.isOpen;
        },
    },
});

export const { openPpt, closePpt, togglePptPanel } = pptSlice.actions;
export default pptSlice.reducer;
