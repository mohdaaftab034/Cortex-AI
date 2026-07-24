import { createSlice } from "@reduxjs/toolkit";

const imageSlice = createSlice({
    name: "image",
    initialState: {
        imageUrl: null,
        isOpen: false,
    },
    reducers: {
        openImage: (state, action) => {
            state.imageUrl = action.payload;
            state.isOpen = true;
        },
        closeImage: (state) => {
            state.imageUrl = null;
            state.isOpen = false;
        },
        toggleImagePanel: (state) => {
            state.isOpen = !state.isOpen;
        },
    },
});

export const { openImage, closeImage, toggleImagePanel } = imageSlice.actions;
export default imageSlice.reducer;
