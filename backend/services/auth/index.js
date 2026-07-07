import express from 'express'
import dotenv from 'dotenv'
import connectDB from './config/db.js';
import router from './routes/auth.route.js';
dotenv.config()

const port = process.env.PORT

const app = express();
app.use(express.json());

app.use('/', router);

app.get('/', (req, res) => {
    res.send('Auth Server is running successfully')
})

app.listen(port, () => {
    console.log(`Auth Server Started on port ${port}`)
    connectDB()
})