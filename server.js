require("dotenv").config();  // Load environment variables
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", typeof process.env.DB_PASSWORD);

const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");

// ✅ Import Models
const User = require("./models/User");
const PlantAnalysis = require("./models/PlantAnalysis");

// ✅ Import Routes
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const plantDetectionRoutes = require("./routes/plantDetection");

const app = express();
app.use(express.json()); // Middleware for JSON parsing
app.use(cors());

// ✅ Register Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/plant-detection", plantDetectionRoutes);

// ✅ Test Route
app.get("/", (req, res) => {
  res.send("🚀 AI-Powered Agriculture App Backend is Running!");
});

// ✅ Sync Database BEFORE Starting the Server
sequelize.sync({ alter: true })  
  .then(() => {
    console.log("✅ Database synced!");
    const PORT = process.env.PORT || 5002;
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => console.error("❌ Database sync error:", err));
