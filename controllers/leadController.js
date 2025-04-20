const Lead = require("../models/lead");
const RemarkHistory = require("../models/remarkHistory");
const mongoose = require("mongoose");


// Error handler utility
const handleError = (res, error, message = "Server Error") => {
  console.error(`Error: ${message}`, error);
  return res.status(500).json({ message, error: error.message });
};

// Pagination utility
const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  return { page, limit, skip: (page - 1) * limit };
};

// Create paginated response
const createPaginatedResponse = (data, totalItems, page, limit) => {
  return {
    data,
    totalPages: Math.ceil(totalItems / limit),
    currentPage: page,
    totalItems,
  };
};

// Find leads with pagination (base query function)
const findLeadsWithPagination = async (filter = {}, options = {}) => {
  const { page, limit, skip } = options;

  // Handle date filtering if provided
  if (filter.date) {
    // If date is a Date object, convert to string
    if (filter.date instanceof Date) {
      filter.date = {
        $gte: new Date(filter.date.setHours(0, 0, 0, 0)),
        $lte: new Date(filter.date.setHours(23, 59, 59, 999)),
      };
    }
  }

  // Handle tomorrow filter if provided
  if (filter.tomorrow) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    filter.date = {
      $gte: tomorrow,
      $lte: tomorrowEnd,
    };
  }

  // Handle weekend filter if provided
  if (filter.weekend) {
    const now = new Date();
    const currentDay = now.getDay();
    const weekendStart = new Date(now);
    const weekendEnd = new Date(now);

    // Find next Saturday and Sunday
    if (currentDay === 6) {
      // If today is Saturday
      weekendStart.setDate(now.getDate());
      weekendEnd.setDate(now.getDate() + 1);
    } else if (currentDay === 0) {
      // If today is Sunday
      weekendStart.setDate(now.getDate() - 1);
      weekendEnd.setDate(now.getDate());
    } else {
      // Any other day
      const daysUntilSaturday = 6 - currentDay;
      weekendStart.setDate(now.getDate() + daysUntilSaturday);
      weekendEnd.setDate(now.getDate() + daysUntilSaturday + 1);
    }

    weekendStart.setHours(0, 0, 0, 0);
    weekendEnd.setHours(23, 59, 59, 999);

    filter.date = {
      $gte: weekendStart,
      $lte: weekendEnd,
    };
  }

  const totalItems = await Lead.countDocuments(filter);

  const query = Lead.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach((populateOption) => {
        query.populate(populateOption);
      });
    } else {
      query.populate(options.populate);
    }
  }

  const items = await query;

  return createPaginatedResponse(items, totalItems, page, limit);
};

// Get leads with date-based sorting
const getLeads = async (req, res) => {
  try {
    const paginationParams = getPaginationParams(req.query);
    const { schedule, selectedDate } = req.query;

    let query = Lead.find();

    // Apply filters based on schedule
    if (schedule) {
      switch (schedule) {
        case "today":
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);

          query = query.where("date").gte(todayStart).lte(todayEnd);
          break;

        case "tomorrow":
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          const tomorrowEnd = new Date(tomorrow);
          tomorrowEnd.setHours(23, 59, 59, 999);

          query = query.where("date").gte(tomorrow).lte(tomorrowEnd);
          break;

        case "weekend":
          const today = new Date();
          const day = today.getDay();
          let daysUntilWeekend;

          if (day === 6) {
            // Saturday
            daysUntilWeekend = 1;
          } else if (day === 0) {
            // Sunday
            daysUntilWeekend = 6;
          } else {
            // Any other day
            daysUntilWeekend = 6 - day;
          }

          const weekendStart = new Date(today);
          weekendStart.setDate(today.getDate() + daysUntilWeekend);
          weekendStart.setHours(0, 0, 0, 0);

          const weekendEnd = new Date(weekendStart);
          weekendEnd.setDate(weekendStart.getDate() + 1);
          weekendEnd.setHours(23, 59, 59, 999);

          query = query.where("date").gte(weekendStart).lte(weekendEnd);
          break;

        case "custom":
          if (selectedDate) {
            const date = new Date(selectedDate);
            const dateStart = new Date(date);
            dateStart.setHours(0, 0, 0, 0);
            const dateEnd = new Date(date);
            dateEnd.setHours(23, 59, 59, 999);

            query = query.where("date").gte(dateStart).lte(dateEnd);
          }
          break;
      }
    }

    // Sort by time
    query = query.sort({ time: 1 });

    // Apply pagination
    const totalItems = await Lead.countDocuments(query._conditions);
    query = query
      .skip((paginationParams.page - 1) * paginationParams.limit)
      .limit(paginationParams.limit);

    const items = await query;

    return res.json(
      createPaginatedResponse(
        items,
        totalItems,
        paginationParams.page,
        paginationParams.limit
      )
    );
  } catch (error) {
    return handleError(res, error, "Error fetching leads");
  }
};

// Get leads by custom date range
const getLeadsByDateRange = async (req, res) => {
  try {
    const { date } = req.params;

    // Convert date string to Date object
    const dateObj = new Date(date);

    // Validate date
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        message: "Invalid date format",
        validFormats: ["YYYY-MM-DD", "ISO string"],
      });
    }

    // Create filter for exact date match (using date field from lead model)
    const filter = {
      date: {
        $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
        $lte: new Date(dateObj.setHours(23, 59, 59, 999)),
      },
    };

    const paginationParams = getPaginationParams(req.query);

    const result = await findLeadsWithPagination(filter, {
      ...paginationParams,
      populate: [
        {
          path: "remarkHistory",
          options: { sort: { createdAt: -1 } },
        },
        {
          path: "associatedCp",
          select: "name phone role companyRole",
        },
        {
          path: "createdBy",
          select: "name email role",
        },
      ],
    });

    res.json({
      leads: result.data,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalLeads: result.totalItems,
    });
  } catch (error) {
    handleError(res, error, "Error fetching leads by date range");
  }
};

// Get leads by status
const getLeadsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = [
      "open",
      "inprogress",
      "sitevisitscheduled",
      "sitevisited",
      "closed",
      "rejected",
    ];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status: ${status}`,
        validStatuses,
      });
    }

    const paginationParams = getPaginationParams(req.query);
    const statusFilter = status ? { status } : {};

    // Get total count for this status
    const totalStatusCount = await Lead.countDocuments(statusFilter);

    const result = await findLeadsWithPagination(statusFilter, {
      ...paginationParams,
      populate: [
        {
          path: "remarkHistory",
          options: { sort: { createdAt: -1 } },
        },
        {
          path: "createdBy",
          select: "name email role",
        },
      ],
    });

    res.json({
      leads: result.data,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalLeads: result.totalItems,
      statusCount: totalStatusCount, // Added status count
    });
  } catch (error) {
    handleError(
      res,
      error,
      `Error fetching leads with status: ${req.params.status}`
    );
  }
};

// Get favorite leads using the boolean field
const getFavoriteLeads = async (req, res) => {
  try {
    const paginationParams = getPaginationParams(req.query);

    const result = await findLeadsWithPagination(
      { favourite: true },
      {
        ...paginationParams,
        populate: [
          {
            path: "remarkHistory",
            options: { sort: { createdAt: -1 } },
          },
          {
            path: "createdBy",
            select: "name email role",
          },
        ],
      }
    );

    res.json({
      leads: result.data,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalLeads: result.totalItems,
    });
  } catch (error) {
    handleError(res, error, "Error fetching favorite leads");
  }
};

// Get a single lead by ID
const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate({
        path: "remarkHistory",
        options: { sort: { createdAt: -1 } },
      })
      .populate("associatedCp", "name phone") // Add this line to populate CP details
      .exec();

    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  } catch (error) {
    handleError(res, error, "Error fetching lead");
  }
};

// Add a remark to a lead
const addRemarkToLead = async (leadId, remark, userId) => {
  if (!remark) return null;

  const remarkHistory = new RemarkHistory({
    leadId,
    remark,
    createdBy: userId || null,
  });

  await remarkHistory.save();
  return remarkHistory._id;
};

// Add a new lead
const addLead = async (req, res) => {
  try {
    const {
      name,
      phone,
      purpose,
      remarks,
      status,
      potential,
      date,
      time,
      budget,
      source,
      requirement,
      favourite,
      associatedCp,
      referenceName,
    } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["name", "phone"],
      });
    }

    // Create new lead with createdBy field
    const newLead = new Lead({
      name,
      phone,
      purpose,
      remarks,
      status,
      potential: potential || [],
      date: date ? new Date(date) : new Date(),
      time,
      remarkHistory: [],
      budget,
      source,
      requirement,
      favourite: favourite || false,
      associatedCp: source === "cp" ? associatedCp : undefined,
      referenceName: source === "reference" ? referenceName : undefined,
      createdBy: req.user._id,
    });

    // Save lead first to get ID
    await newLead.save();

    // If initial remarks exist, create remark history
    if (remarks) {
      const remarkId = await addRemarkToLead(
        newLead._id,
        remarks,
        req.user?._id
      );

      if (remarkId) {
        newLead.remarkHistory.push(remarkId);
        await newLead.save();
      }
    }

    res.status(201).json({
      message: "Lead added successfully",
      lead: newLead,
    });
  } catch (error) {
    // Handle specific errors
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Phone number already exists",
        field: "phone",
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    handleError(res, error, "Error adding lead");
  }
};

// Update a lead
const updateLead = async (req, res) => {
  try {
    const {
      remarks,
      date,
      source,
      associatedCp,
      referenceName,
      ...updateData
    } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Validate source-specific required fields
    if (source === "cp") {
      if (!associatedCp && !lead.associatedCp) {
        return res.status(400).json({
          message: "Associated CP is required when source is CP",
          required: ["associatedCp"],
        });
      }
      // Ensure associatedCp is a valid ObjectId
      if (associatedCp && !mongoose.Types.ObjectId.isValid(associatedCp)) {
        return res.status(400).json({
          message: "Invalid associated CP ID",
          required: ["associatedCp"],
        });
      }
    }

    if (source === "reference" && !referenceName && !lead.referenceName) {
      return res.status(400).json({
        message: "Reference name is required when source is reference",
        required: ["referenceName"],
      });
    }

    // Handle date and time updates
    if (date) {
      lead.date = new Date(date);
    }

    // Handle date and time fields
    if (req.body.date) {
      lead.date = new Date(req.body.date);
    }

    // Validate and set time
    if (req.body.time) {
      const time = req.body.time;
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(time)) {
        return handleError(res, new Error('Invalid time format. Please use HH:mm format.'));
      }
      lead.time = time;
    }

    // Handle source and related fields
    if (source) {
      lead.source = source;
      if (source === "cp") {
        lead.associatedCp = associatedCp || lead.associatedCp;
        lead.referenceName = null;
      } else if (source === "reference") {
        lead.referenceName = referenceName || lead.referenceName;
        lead.associatedCp = null;
      } else {
        lead.associatedCp = null;
        lead.referenceName = null;
      }
    }

    // If remarks changed, add to history
    if (remarks && remarks !== lead.remarks) {
      const remarkId = await addRemarkToLead(lead._id, remarks, req.user._id);

      if (remarkId) {
        lead.remarkHistory.push(remarkId);
        lead.remarks = remarks;
      }
    }

    // Update other fields
    Object.assign(lead, updateData);
    await lead.save();

    // Return updated lead with populated remark history
    const updatedLead = await Lead.findById(lead._id)
      .populate({
        path: "remarkHistory",
        options: { sort: { createdAt: -1 } },
        select: "remark createdAt updatedAt createdBy",
      })
      .exec();

    res.json({ success: true, data: updatedLead });
  } catch (error) {
    console.error("Error updating lead:", error);
    handleError(res, error, "Failed to update lead");
  }
};

// Delete a lead
const deleteLead = async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const lead = await Lead.findById(req.params.id).session(session);
      if (!lead) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: "Lead not found" });
      }

      // Delete associated remark history
      await RemarkHistory.deleteMany({ leadId: lead._id }).session(session);
      await lead.deleteOne({ session });

      await session.commitTransaction();
      session.endSession();

      res.json({ success: true, message: "Lead and associated remarks deleted successfully" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get remark history by lead ID
const getRemarkHistoryById = async (req, res) => {
  try {
    // First check if the lead exists
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    // Convert string ID to ObjectId to ensure proper matching
    const leadObjectId = new mongoose.Types.ObjectId(req.params.id);

    const remarkHistory = await RemarkHistory.find({ leadId: leadObjectId })
      .sort({ createdAt: -1 })
      .populate({
        path: "createdBy",
        select: "name email",
      });

    console.log("Lead ID:", leadObjectId);
    console.log("Remark History Count:", remarkHistory.length);
    res.json({ success: true, data: remarkHistory });
  } catch (error) {
    handleError(res, error, "Error fetching remark history");
  }
};

// Get leads by search query
const searchLeads = async (req, res) => {
  try {
    const {
      query,
      status,
      potential,
      favourite,
      startDate,
      endDate,
      time,
      budget,
      source,
      requirement,
    } = req.query;

    const paginationParams = getPaginationParams(req.query);

    // Build search filter
    const filter = {};

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
        { purpose: { $regex: query, $options: "i" } },
        { remarks: { $regex: query, $options: "i" } },
        { source: { $regex: query, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = { $in: status.split(",") };
    }

    if (potential) {
      filter.potential = { $in: potential.split(",") };
    }

    // Add favourite filter if provided
    if (favourite !== undefined) {
      filter.favourite = favourite === "true";
    }

    // Add budget filter if provided
    if (budget) {
      filter.budget = { $in: budget.split(",") };
    }

    // Add source filter if provided
    if (source) {
      filter.source = { $regex: source, $options: "i" };
    }

    // Add requirement filter if provided
    if (requirement) {
      filter.requirement = { $in: requirement.split(",") };
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Add time filter if provided
    if (time) {
      filter.time = { $regex: time, $options: "i" };
    }

    const result = await findLeadsWithPagination(filter, {
      ...paginationParams,
      populate: "remarkHistory",
    });

    res.json({
      leads: result.data,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalLeads: result.totalItems,
    });
  } catch (error) {
    handleError(res, error, "Error searching leads");
  }
};

// Get leads by potential
const getLeadsByPotential = async (req, res) => {
  try {
    const { potential } = req.params;
    const validPotentials = ["Hot", "Cold", "Warm"];

    if (!validPotentials.includes(potential)) {
      return res.status(400).json({
        message: `Invalid potential: ${potential}`,
        validPotentials,
      });
    }

    const paginationParams = getPaginationParams(req.query);

    const result = await findLeadsWithPagination(
      { potential: potential },
      {
        ...paginationParams,
        populate: [
          {
            path: "remarkHistory",
            options: { sort: { createdAt: -1 } },
          },
          {
            path: "createdBy",
            select: "name email role",
          },
        ],
      }
    );

    res.json({
      leads: result.data,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalLeads: result.totalItems,
    });
  } catch (error) {
    handleError(
      res,
      error,
      `Error fetching leads with potential: ${req.params.potential}`
    );
  }
};

// Get leads by schedule
const getLeadsBySchedule = async (req, res) => {
  try {
    const { schedule } = req.params;
    const validSchedules = ["today", "tomorrow", "weekend", "other"];

    if (!validSchedules.includes(schedule)) {
      return res.status(400).json({
        message: `Invalid schedule: ${schedule}`,
        validSchedules,
      });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    let filter = {};

    switch (schedule) {
      case "today":
        filter.date = {
          $gte: todayStart,
          $lte: tomorrow,
        };
        break;

      case "tomorrow":
        const tomorrowStart = new Date(now);
        tomorrowStart.setDate(now.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);

        filter.date = {
          $gte: tomorrowStart,
          $lte: tomorrowEnd,
        };
        break;

      case "weekend":
        const currentDay = now.getDay();
        const weekendStart = new Date(now);
        const weekendEnd = new Date(now);

        // Find next Saturday and Sunday
        if (currentDay === 6) {
          // If today is Saturday
          weekendStart.setDate(now.getDate());
          weekendEnd.setDate(now.getDate() + 1);
        } else if (currentDay === 0) {
          // If today is Sunday
          weekendStart.setDate(now.getDate() - 1);
          weekendEnd.setDate(now.getDate());
        } else {
          // Any other day
          const daysUntilSaturday = 6 - currentDay;
          weekendStart.setDate(now.getDate() + daysUntilSaturday);
          weekendEnd.setDate(now.getDate() + daysUntilSaturday + 1);
        }

        weekendStart.setHours(0, 0, 0, 0);
        weekendEnd.setHours(23, 59, 59, 999);

        filter.date = {
          $gte: weekendStart,
          $lte: weekendEnd,
        };
        break;

      case "other":
        // For other schedule, we'll exclude today, tomorrow, and weekend
        const otherStart = new Date(now);
        const otherEnd = new Date(now);
        const daysUntilSaturday = 6 - now.getDay();

        otherStart.setDate(now.getDate() + daysUntilSaturday);
        otherEnd.setDate(now.getDate() + daysUntilSaturday + 1);

        otherStart.setHours(0, 0, 0, 0);
        otherEnd.setHours(23, 59, 59, 999);

        filter = {
          $or: [
            { date: { $lt: todayStart } }, // Before today
            { date: { $gt: tomorrow } }, // After tomorrow
            { date: { $gt: otherEnd } }, // After next weekend
          ],
        };
        break;
    }

    const paginationParams = getPaginationParams(req.query);

    const result = await findLeadsWithPagination(filter, {
      ...paginationParams,
      populate: [
        {
          path: "remarkHistory",
          options: { sort: { createdAt: -1 } },
        },
        {
          path: "createdBy",
          select: "name email role",
        },
      ],
    });

    res.json({
      leads: result.data,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalLeads: result.totalItems,
    });
  } catch (error) {
    handleError(
      res,
      error,
      `Error fetching ${req.params.schedule} schedule leads`
    );
  }
};

// Get leads by autostatus
const getLeadsByAutoStatus = async (req, res) => {
  try {
    const { autostatus } = req.params;
    const validAutoStatuses = ["new", "missed"];

    if (!validAutoStatuses.includes(autostatus)) {
      return res.status(400).json({
        message: `Invalid autostatus: ${autostatus}`,
        validAutoStatuses,
      });
    }

    const paginationParams = getPaginationParams(req.query);

    const result = await findLeadsWithPagination(
      { autostatus },
      {
        ...paginationParams,
        populate: [
          {
            path: "remarkHistory",
            options: { sort: { createdAt: -1 } },
          },
          {
            path: "createdBy",
            select: "name email role",
          },
        ],
      }
    );

    res.json({
      leads: result.data,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalLeads: result.totalItems,
    });
  } catch (error) {
    handleError(
      res,
      error,
      `Error fetching leads with autostatus: ${req.params.autostatus}`
    );
  }
};

// Get leads by source
const getLeadsBySource = async (req, res) => {
  try {
    const { source } = req.params;
    const validSources = [
      "walkin",
      "portals",
      "meta_ads",
      "google_ads",
      "cp",
      "newspaper_ads",
      "hoardings",
      "reference",
    ];

    if (source && !validSources.includes(source)) {
      return res.status(400).json({
        message: `Invalid source: ${source}`,
        validSources,
      });
    }

    const paginationParams = getPaginationParams(req.query);
    const sourceFilter = source ? { source } : {};

    const result = await findLeadsWithPagination(sourceFilter, {
      ...paginationParams,
      populate: [
        {
          path: "remarkHistory",
          options: { sort: { createdAt: -1 } },
        },
        {
          path: "associatedCp",
          select: "name phone",
        },
      ],
    });

    res.json({
      leads: result.data,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalLeads: result.totalItems,
    });
  } catch (error) {
    handleError(
      res,
      error,
      `Error fetching leads with source: ${req.params.source}`
    );
  }
};

// Get all leads with pagination
const getAllLeads = async (req, res) => {
  try {
    const paginationParams = getPaginationParams(req.query);

    const result = await findLeadsWithPagination(
      {},
      {
        ...paginationParams,
        populate: [
          {
            path: "remarkHistory",
            options: { sort: { createdAt: -1 } },
          },
          {
            path: "associatedCp",
            select: "name phone role companyRole",
          },
          {
            path: "createdBy",
            select: "name email role",
          },
        ],
      }
    );

    res.json({
      leads: result.data,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalLeads: result.totalItems,
    });
  } catch (error) {
    handleError(res, error, "Error fetching all leads");
  }
};

// Get leads that need notifications based on current time
const getLeadsForNotification = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get leads scheduled for today
    const leads = await Lead.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
      autostatus: "new", // Only show new leads
    })
      .populate({
        path: "createdBy",
        select: "name email role",
      })
      .sort({ date: 1 });

    // Filter leads that need notification based on time
    const leadsToNotify = leads.filter((lead) => {
      if (!lead.time) return false;

      const [leadHour, leadMinute] = lead.time.split(":");
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      return (
        parseInt(leadHour) === currentHour &&
        parseInt(leadMinute) === currentMinute
      );
    });

    res.json({
      leads: leadsToNotify,
      currentTime: now,
    });
  } catch (error) {
    handleError(res, error, "Error fetching leads for notification");
  }
};

// Get all today's leads with their scheduled times for notifications
const getTodaysLeadsForNotification = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all leads for today
    const leads = await Lead.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .populate({
        path: "createdBy",
        select: "name email role",
      })
      .sort({ date: 1 });

    // Format leads with their scheduled times
    const formattedLeads = leads.map((lead) => ({
      ...lead.toObject(),
      scheduledTime: lead.time || "Time not set",
      status: lead.autostatus || "Not set",
      agent: lead.createdBy?.name || "Not assigned",
    }));

    res.json({
      leads: formattedLeads,
      currentTime: now,
    });
  } catch (error) {
    handleError(res, error, "Error fetching today's leads");
  }
};

// Get today's leads for notifications
const getTodayLeads = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all leads for today with their time
    const leads = await Lead.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .populate({
        path: "createdBy",
        select: "name email role",
      })
      .sort({ date: 1, time: 1 });

    // Format leads with time and status
    const formattedLeads = leads.map((lead) => ({
      id: lead._id,
      name: lead.name,
      phone: lead.phone,
      time: lead.time || "Time not set",
      status: lead.autostatus || "Not set",
      createdBy: lead.createdBy?.name || "Not assigned",
      createdAt: lead.createdAt,
    }));

    res.json({
      leads: formattedLeads,
      currentTime: now,
    });
  } catch (error) {
    console.error("Error fetching today leads:", error);
    res.status(500).json({
      message: "Error fetching today's leads",
      error: error.message,
    });
  }
};

// Add to module.exports
module.exports = {
  getLeads,
  getAllLeads,
  getLeadsByDateRange,
  getLeadsByStatus,
  getFavoriteLeads,
  getLeadById,
  addLead,
  updateLead,
  deleteLead,
  getRemarkHistoryById,
  searchLeads,
  getLeadsByPotential,
  getLeadsBySchedule,
  getLeadsByAutoStatus,
  getLeadsBySource,
  findLeadsWithPagination,
  getPaginationParams,
  createPaginatedResponse,
  getLeadsForNotification,
  getTodaysLeadsForNotification,
  getTodayLeads,
};
