import { createSlice } from "@reduxjs/toolkit";

const artifactSlice = createSlice({
    name: "artifact",
    initialState: {
        files: null,
        isOpen: false,
    },
    reducers: {
        setArtifact: (state, action) => {
            state.files = action.payload;
            state.isOpen = true;
        },
        clearArtifact: (state) => {
            state.files = null;
            state.isOpen = false;
        },
        closeArtifactPanel: (state) => {
            state.isOpen = false;
        },
        toggleArtifact: (state) => {
            state.isOpen = !state.isOpen;
        },
    },
});

export const { setArtifact, clearArtifact, closeArtifactPanel, toggleArtifact } = artifactSlice.actions;
export default artifactSlice.reducer;
