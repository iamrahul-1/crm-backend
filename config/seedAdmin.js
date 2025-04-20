const mongoose = require("mongoose");
const User = require("../models/user");
require("dotenv").config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const adminUser = {
      name: "Admin User",
      email: "admin@brookstone.com",
      password: "admin123",
      role: "admin",
    };

    const user = await User.create(adminUser);
    console.log("Admin user created successfully:", user.email);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error creating admin:", error);
  }
};

createAdmin();
