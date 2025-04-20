const express = require("express");
const router = express.Router();
const { uploadLeads } = require("../controllers/excelController");

router.post("/upload", uploadLeads);

module.exports = router;
