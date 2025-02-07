const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// ✅ Get All Users (Admins Only)
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });
    res.json(users);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Delete Any User (Admins Only)
router.delete("/delete-user/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();
    res.json({ message: "User deleted successfully!" });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Verify/Unverify Any User (Admins Only)
router.put("/verify-user/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isVerified = !user.isVerified; // Toggle verification status
    await user.save();

    res.json({ message: `User verification status updated to ${user.isVerified}` });
  } catch (error) {
    console.error("❌ Error verifying user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Promote/Demote Any User to Admin (Admins Only)
router.put("/toggle-admin/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isAdmin = !user.isAdmin; // Toggle admin status
    await user.save();

    res.json({ message: `User admin status updated to ${user.isAdmin}` });
  } catch (error) {
    console.error("❌ Error updating admin status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
