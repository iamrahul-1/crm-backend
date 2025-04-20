const express = require("express");
const router = express.Router();
const cpController = require("../controllers/cpController");
const { protect, admin } = require("../middleware/authMiddleware");

// Apply authentication middleware to all routes
router.use(protect);

// Read operations - available to all authenticated users
router.get("/", cpController.getAllCps);
router.get("/search", cpController.searchCps);
router.get("/role/:role", cpController.getCpsByRole);
router.get("/:id", cpController.getCpById);
router.get("/:id/leads", cpController.getLeadsByCp); 
router.post("/", cpController.createCp);
router.put("/:id", cpController.updateCp);

// Write operations - only for admin

router.delete("/:id", admin, cpController.deleteCp);

module.exports = router;
