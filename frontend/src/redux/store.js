import { configureStore } from '@reduxjs/toolkit'
import userReducer from "./userSlice.js"
import conversationReducer from "./conversationSlice.js"
import messageReducer from './messageSlice.js'
import artifactReducer from './artifactSlice.js'
import pdfReducer from './pdfSlice.js'
import pptReducer from './pptSlice.js'
import imageReducer from './imageSlice.js'

export const store = configureStore({
  reducer: {
    user: userReducer,
    conversation: conversationReducer,
    message: messageReducer,
    artifact: artifactReducer,
    pdf: pdfReducer,
    ppt: pptReducer,
    image: imageReducer,
  },
})
