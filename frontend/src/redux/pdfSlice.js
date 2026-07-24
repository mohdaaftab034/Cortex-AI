import { createSlice } from "@reduxjs/toolkit";

const pdfSlice = createSlice({
    name: "pdf",
    initialState: {
        pdfUrl: null,
        isOpen: false,
    },
    reducers: {
        openPdf: (state, action) => {
            state.pdfUrl = action.payload;
            state.isOpen = true;
        },
        closePdf: (state) => {
            state.pdfUrl = null;
            state.isOpen = false;
        },
        togglePdfPanel: (state) => {
            state.isOpen = !state.isOpen;
        },
    },
});

export const { openPdf, closePdf, togglePdfPanel } = pdfSlice.actions;
export default pdfSlice.reducer;
