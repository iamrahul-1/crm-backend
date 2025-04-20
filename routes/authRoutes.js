const express = require("express");
const {
  register,
  login,
  getUserData,
} = require("../controllers/authController");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", protect, admin, register); // Only admin can register new users
router.post("/login", login);
router.get("/me", protect, getUserData);

module.exports = router;
