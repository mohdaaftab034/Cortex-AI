import express from 'express'
import dotenv from 'dotenv'
import connectDB from './config/db.js';
import { razorpayWebhook } from './controllers/payment.controller.js';
import router from './routes/payment.routes.js';

dotenv.config()

const port = process.env.PORT || 8004

const app = express();

app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Payment Server is running successfully')
})

app.use('/api/payment', router)

app.listen(port, () => {
    console.log(`Payment Server Started on port ${port}`)
    connectDB()
})
