const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const router = express.Router();

// ✅ Configure Multer for Image Uploads
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ✅ Plant Disease Detection Route
router.post("/detect", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    console.log("✅ Image uploaded successfully:", req.file.path);

    // ✅ Read the uploaded image
    const imagePath = path.join(__dirname, "../uploads/", req.file.filename);

    // ✅ Ensure the file exists before reading
    if (!fs.existsSync(imagePath)) {
      return res.status(500).json({ message: "Image file not found" });
    }

    // ✅ Convert image to Base64
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString("base64");

    console.log("✅ Image converted to Base64:", imageBase64.substring(0, 50) + "..."); // Print first 50 chars

    // ✅ Send request to Google Gemini AI
    const geminiResponse = await axios.post(
      "https://api.generativeai.google/v1/models/gemini-pro:generateContent",
      {
        contents: [
          {
            parts: [
              { text: "Analyze this plant leaf image for diseases." },
              { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        },
      }
    );

    // ✅ Check AI response
    if (!geminiResponse.data || !geminiResponse.data.candidates) {
      throw new Error("Invalid AI response");
    }

    const aiResult = geminiResponse.data.candidates[0].content.parts[0].text;

    console.log("✅ AI Response:", aiResult);

    // ✅ Delete the uploaded image after processing
    fs.unlinkSync(imagePath);

    res.json({ message: "Analysis Complete", result: aiResult });
  } catch (error) {
    console.error("❌ AI Analysis Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Error analyzing image", error: error.message });
  }
});

const PlantAnalysis = require("../models/PlantAnalysis");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/detect", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    console.log("✅ Image uploaded successfully:", req.file.path);

    // ✅ Read the uploaded image
    const imagePath = path.join(__dirname, "../uploads/", req.file.filename);

    // ✅ Convert image to Base64
    if (!fs.existsSync(imagePath)) {
      return res.status(500).json({ message: "Image file not found" });
    }
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString("base64");

    console.log("✅ Image converted to Base64");

    // ✅ Send request to Google Gemini AI
    const geminiResponse = await axios.post(
      "https://api.generativeai.google/v1/models/gemini-pro:generateContent",
      {
        contents: [
          {
            parts: [
              { text: "Analyze this plant leaf image for diseases." },
              { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        },
      }
    );

    // ✅ Check AI response
    if (!geminiResponse.data || !geminiResponse.data.candidates) {
      throw new Error("Invalid AI response");
    }

    const aiResult = geminiResponse.data.candidates[0].content.parts[0].text;

    console.log("✅ AI Response:", aiResult);

    // ✅ Save analysis to database
    const plantAnalysis = await PlantAnalysis.create({
      userId: req.user.id,
      imagePath: req.file.path,
      analysisResult: aiResult,
    });

    res.json({
      message: "Analysis Complete",
      result: aiResult,
      historyId: plantAnalysis.id,
    });
  } catch (error) {
    console.error("❌ AI Analysis Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Error analyzing image", error: error.message });
  }
});


// ✅ Get User's Analysis History
router.get("/history", authMiddleware, async (req, res) => {
    try {
      const history = await PlantAnalysis.findAll({
        where: { userId: req.user.id },
        order: [["createdAt", "DESC"]],
      });
  
      res.json(history);
    } catch (error) {
      console.error("❌ Error fetching history:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  

router.post("/detect", authMiddleware, upload.single("image"), async (req, res) => {
  // User must be authenticated to use this
});
router.get("/history", authMiddleware, async (req, res) => {
  // User must be authenticated to view history
});

  

module.exports = router;
