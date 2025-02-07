const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../services/emailService");

const router = express.Router();

// ✅ Signup Route (User Registration)
router.post("/signup", async (req, res) => {
  try {
    console.log("📩 Signup request received:", req.body);

    const { name, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ where: { email } });
    if (user) return res.status(400).json({ message: "User already exists" });

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate Email Verification Token
    const verificationToken = uuidv4();

    // Create New User
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false, // User must verify email
      verificationToken,
    });

    // Send Verification Email
    await sendVerificationEmail(email, verificationToken);

    console.log("✅ Verification email sent to:", email);

    res.status(201).json({
      message: "Signup successful! Please verify your email.",
    });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Email Verification Route
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Find user by token
    const user = await User.findOne({ where: { verificationToken: token } });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    // Update user as verified
    user.isVerified = true;
    user.verificationToken = null; // Remove token after verification
    await user.save();

    res.json({ message: "Email verified successfully!" });
  } catch (error) {
    console.error("❌ Verification Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    console.log("📩 Login request received:", req.body);

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    // Compare Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Generate JWT Token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    console.log("✅ Login successful");

    res.status(200).json({ message: "Login successful!", token });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Protected Route: Get User Profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ["password"] } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("❌ Profile Fetch Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Request Password Reset
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Generate Reset Token (Valid for 30 minutes)
    const resetToken = uuidv4();
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry
    await user.save();

    // Send Password Reset Email
    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: "Password reset link sent to your email." });
  } catch (error) {
    console.error("❌ Forgot Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Reset Password
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Find user by reset token
    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: new Date() }, // Token must be valid
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and remove reset token
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: "Password reset successful! You can now log in." });
  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update Profile (Requires Authentication)
router.put("/update-profile", authMiddleware, async (req, res) => {
    try {
      const { name, email, oldPassword, newPassword } = req.body;
      const user = await User.findByPk(req.user.id);
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // ✅ Update Name
      if (name) {
        user.name = name;
      }
  
      // ✅ Update Email (Requires Re-Verification)
      if (email && email !== user.email) {
        const emailExists = await User.findOne({ where: { email } });
        if (emailExists) {
          return res.status(400).json({ message: "Email is already in use" });
        }
  
        user.email = email;
        user.isVerified = false; // Mark user as unverified
        user.verificationToken = uuidv4(); // Generate new verification token
  
        await sendVerificationEmail(email, user.verificationToken);
      }
  
      // ✅ Change Password (Only if old password is provided)
      if (oldPassword && newPassword) {
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: "Old password is incorrect" });
        }
  
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
      }
  
      await user.save();
  
      res.json({ message: "Profile updated successfully!" });
    } catch (error) {
      console.error("❌ Profile Update Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // ✅ Delete Account (Requires Authentication)
router.delete("/delete-account", authMiddleware, async (req, res) => {
    try {
      const { password } = req.body;
      const user = await User.findByPk(req.user.id);
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // ✅ Confirm Password Before Deleting
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect password" });
      }
  
      // ✅ Delete the User
      await user.destroy();
  
      res.json({ message: "Account deleted successfully!" });
    } catch (error) {
      console.error("❌ Account Deletion Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  

module.exports = router;
