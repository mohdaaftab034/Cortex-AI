import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import connectDB from './config/db.js';
import router from './routes/agent.route.js';
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const port = process.env.PORT 

const app = express();
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/', (req, res) => {
    res.send('Agent Server is running successfully')
})

app.use("/", router)


app.listen(port, () => {
    console.log(`Agent Server Started on port ${port}`)
    connectDB()
})
