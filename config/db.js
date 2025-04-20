const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Use a direct connection string instead of SRV
    const mongoURI = process.env.MONGO_URI;
    console.log("Connecting to MongoDB with URI:", mongoURI);
    await mongoose.connect(mongoURI);
    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("MongoDB Connection Failed ❌", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
