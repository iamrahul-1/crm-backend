const User = require("../models/user");

const protectLeadOperations = async (req, res, next) => {
  try {
    // Only admin can create new users
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Only admin can delete leads
    if (req.method === "DELETE" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete leads" });
    }

    // Only admin can create new users
    if (req.path.includes("/users") && req.method === "POST" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to create users" });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { protectLeadOperations };
