const mongoose = require("mongoose");

const remarkHistorySchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    remark: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const RemarkHistory = mongoose.model("RemarkHistory", remarkHistorySchema);

module.exports = RemarkHistory;
