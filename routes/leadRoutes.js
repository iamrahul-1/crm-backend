const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const leadController = require("../controllers/leadController");


// Protect all routes
router.use(protect);

// Today's leads route (must be before :id routes)
router.get("/tl", leadController.getTodayLeads);

// Read operations - available to all authenticated users
router.get("/", (req, res) => leadController.getLeads(req, res));
router.get("/all", (req, res) => leadController.getAllLeads(req, res));
router.get("/search", (req, res) => leadController.searchLeads(req, res));
router.get("/:id", (req, res) => leadController.getLeadById(req, res));
router.get("/:id/remarks", (req, res) => leadController.getRemarkHistoryById(req, res));
router.get("/status/favorite", leadController.getFavoriteLeads);
router.get("/status/:status", leadController.getLeadsByStatus);
router.get("/source/:source", leadController.getLeadsBySource);
router.get("/potential/:potential", leadController.getLeadsByPotential);
router.get("/schedule/:schedule", leadController.getLeadsBySchedule);
router.get("/schedule/custom/:date", leadController.getLeadsByDateRange);
router.get("/autostatus/:autostatus", leadController.getLeadsByAutoStatus);

// Write operations - only for admin
router.post("/", leadController.addLead);
router.put("/:id", leadController.updateLead);
router.delete("/:id", admin, leadController.deleteLead);

module.exports = router;
