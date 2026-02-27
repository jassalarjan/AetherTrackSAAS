import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // SECURITY: Handle connection errors after initial connection
    mongoose.connection.on('error', (err) => {
      console.error('[CRITICAL] MongoDB connection error after initial connection:', err);
      console.error('[CRITICAL] Terminating process due to database connection failure');
      process.exit(1);
    });
    
    // SECURITY: Handle disconnection events
    mongoose.connection.on('disconnected', () => {
      console.error('[CRITICAL] MongoDB disconnected unexpectedly');
      console.error('[CRITICAL] Terminating process due to database disconnection');
      process.exit(1);
    });
    
  } catch (error) {
    console.error('[CRITICAL] Failed to connect to MongoDB:', error.message);
    console.error('[CRITICAL] Database connection is required for application startup');
    console.error('[CRITICAL] Terminating process due to database connection failure');
    process.exit(1);
  }
};

export default connectDB;