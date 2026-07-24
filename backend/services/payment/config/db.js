import mongoose from "mongoose"

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('Payment DB connected successfully')
    } catch (error) {
        console.error('Error connecting to Payment DB:', error)
    }
}

export default connectDB
