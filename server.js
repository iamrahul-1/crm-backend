const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();

// Configure for Railway deployment
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Connect to MongoDB
connectDB();

const allowedOrigins = [
  "http://localhost:5173",
  "https://crm-eight-ruddy.vercel.app",
  "https://brookstone-backend.vercel.app",
  "https://crm-frontend-production-4da5.up.railway.app",
];

const app = express();

// Use CORS middleware
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Origin",
    ],
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json({ limit: "50mb" }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Import auth middleware
const { protect } = require("./middleware/authMiddleware");

// Apply auth middleware before lead routes
app.use("/api/leads", protect);

// Import notification routes
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/api/notifications", notificationRoutes);

// Import notification scheduler
const {
  checkAndCreateNotifications,
} = require("./services/notificationScheduler");
const schedule = require("node-schedule");

// Schedule notifications check every minute
schedule.scheduleJob("*/1 * * * *", async () => {
  try {
    await checkAndCreateNotifications();
  } catch (error) {
    console.error("Error in notification scheduler:", error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Import routes
const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");
const cpRoutes = require("./routes/cpRoutes");
const excelRoutes = require("./routes/excelRoutes");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/cp", cpRoutes);
app.use("/api/excel", excelRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
