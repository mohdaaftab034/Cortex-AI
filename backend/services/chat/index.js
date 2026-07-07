import express from 'express'
import dotenv from 'dotenv'
import connectDB from './config/db.js';
import router from './routes/chat.routes.js';
dotenv.config()

const port = process.env.PORT

const app = express();
app.use(express.json());


app.get('/', (req, res) => {
    res.send('Chat Server is running successfully')
})

app.use('/', router)

app.listen(port, () => {
    console.log(`Chat Server Started on port ${port}`)
    connectDB()
})