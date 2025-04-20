const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: Number, required: true, unique: true },
    purpose: { type: String },
    remarks: { type: String },
    remarkHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RemarkHistory",
      },
    ],
    potential: {
      type: [String],
      enum: ["Hot", "Cold", "Warm"],
    },
    favourite: {
      type: Boolean,
      default: false,
    },
    budget: {
      type: String,
    },
    source: {
      type: String,
      enum: [
        "walkin",
        "portals",
        "meta_ads",
        "google_ads",
        "cp",
        "newspaper_ads",
        "hoardings",
        "reference",
        null,
      ],
    },
    associatedCp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cp",
    },
    referenceName: {
      type: String,
    },
    referenceContact: {
      type: String,
    },
    requirement: {
      type: String,
    },
    autostatus: {
      type: String,
      enum: ["new", "missed"],
      default: undefined,
    },
    status: {
      type: String,
      enum: [
        "open",
        "inprogress",
        "sitevisitscheduled",
        "sitevisited",
        "closed",
        "rejected",
      ],
      default: undefined,
    },
    date: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value instanceof Date && !isNaN(value);
        },
        message: "Date must be a valid date value",
      },
    },
    time: {
      type: String, // Store time as string (HH:mm)
      default: null,
      validate: {
        validator: function (value) {
          if (!value) return true;
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          return timeRegex.test(value);
        },
        message: "Time must be in HH:mm format",
      },
    },
    dateTime: {
      type: Date,
      default: null,
      select: false, // Don't include in default queries
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Add pre-save middleware to update autostatus and dateTime
leadSchema.pre("save", function (next) {
  // Get current date at midnight
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set to midnight

  // Get lead's date and set to midnight
  const leadDate = new Date(this.date);
  leadDate.setHours(0, 0, 0, 0);

  // Check if lead date is before current date (12 PM)
  if (leadDate < currentDate) {
    this.autostatus = "missed";
  } else {
    // If lead date is not before current date, check status
    if (this.status === undefined) {
      this.autostatus = "new";
    } else {
      this.autostatus = undefined;
    }
  }

  // Set dateTime if both date and time are provided
  if (this.date && this.time) {
    const [hours, minutes] = this.time.split(':').map(Number);
    const dateTime = new Date(this.date);
    dateTime.setHours(hours, minutes, 0, 0);
    this.dateTime = dateTime;
  }

  next();
});

// Add data cleaning middleware before validation
leadSchema.pre("validate", function (next) {
  // Convert empty strings to null
  const fieldsToCheck = [
    "purpose",
    "remarks",
    "budget",
    "source",
    "requirement",
  ];
  fieldsToCheck.forEach((field) => {
    if (this[field] === "") {
      this[field] = null;
    }
  });

  // Convert phone string to number
  if (typeof this.phone === "string") {
    this.phone = Number(this.phone);
  }

  next();
});

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;
