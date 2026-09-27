import mongoose from 'mongoose';

export const connectDB = async (uri) => {
  try {
    const mongoUri = uri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/railready';
    const conn = await mongoose.connect(mongoUri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    process.exit(1);
  }
};
