const mongoose = require("mongoose");

const cpSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: Number, required: true, unique: true },
    role: {
      type: String,
      required: true,
      enum: ["company", "individual"],
    },
    companyRole: {
      type: String,
      enum: ["owner", "employee"],
      default: undefined,
    },
    ownerName: {
      type: String,
      default: undefined,
    },
    ownerContact: {
      type: Number,
      default: undefined,
    },
    designation: {
      type: String,
      default: undefined,
    },
    firmName: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

const Cp = mongoose.model("Cp", cpSchema);

module.exports = Cp;
