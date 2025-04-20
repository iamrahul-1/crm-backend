const Lead = require("../models/lead");

exports.uploadLeads = async (req, res) => {
  try {
    const leadsData = req.body;

    if (!Array.isArray(leadsData)) {
      return res.status(400).json({ error: "Invalid leads data format" });
    }

    const savedLeads = [];
    for (const leadData of leadsData) {
      const lead = new Lead(leadData);
      await lead.save();
      savedLeads.push(lead);
    }

    res.status(200).json({
      success: true,
      message: "Leads uploaded successfully",
      leads: savedLeads
    });
  } catch (error) {
    console.error("Error processing leads:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
