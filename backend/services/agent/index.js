import express from 'express'
import dotenv from 'dotenv'
import connectDB from './config/db.js';
import router from './routes/agent.route.js';
dotenv.config()

const port = process.env.PORT

const app = express();
app.use(express.json());


app.get('/', (req, res) => {
    res.send('Agent Server is running successfully')
})

app.use("/", router)


app.listen(port, () => {
    console.log(`Agent Server Started on port ${port}`)
    connectDB()
})