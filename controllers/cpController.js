const Cp = require("../models/cp");
const { findLeadsWithPagination, getPaginationParams } = require("../controllers/leadController");

// Helper function to handle errors
const handleError = (res, error, message = "An error occurred") => {
  console.error(error);
  return res.status(500).json({
    success: false,
    message: message || error.message || "An error occurred",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};

// Get all CPs with pagination, filtering and sorting
const getAllCps = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.companyRole) filter.companyRole = req.query.companyRole;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const sort = req.query.sortBy
      ? { [req.query.sortBy]: req.query.sortOrder === "desc" ? -1 : 1 }
      : { createdAt: -1 };

    const cps = await Cp.find(filter).sort(sort).skip(skip).limit(limit);

    const total = await Cp.countDocuments(filter);

    res.json({
      success: true,
      data: cps,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Get CP by ID
const getCpById = async (req, res) => {
  try {
    const cp = await Cp.findById(req.params.id);
    if (!cp) {
      return res.status(404).json({
        success: false,
        message: "Channel partner not found",
      });
    }
    res.json({ success: true, data: cp });
  } catch (error) {
    handleError(res, error);
  }
};

// Create new CP
const createCp = async (req, res) => {
  try {
    const existingCp = await Cp.findOne({ phone: req.body.phone });
    if (existingCp) {
      return res.status(400).json({
        success: false,
        message: "Phone number already exists",
      });
    }

    const cp = new Cp(req.body);
    await cp.save();

    res.status(201).json({
      success: true,
      message: "Channel partner created successfully",
      data: cp,
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Update CP
const updateCp = async (req, res) => {
  try {
    if (req.body.phone) {
      const existingCp = await Cp.findOne({
        phone: req.body.phone,
        _id: { $ne: req.params.id },
      });
      if (existingCp) {
        return res.status(400).json({
          success: false,
          message: "Phone number already exists",
        });
      }
    }

    const cp = await Cp.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!cp) {
      return res.status(404).json({
        success: false,
        message: "Channel partner not found",
      });
    }

    res.json({
      success: true,
      message: "Channel partner updated successfully",
      data: cp,
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Delete CP
const deleteCp = async (req, res) => {
  try {
    const cp = await Cp.findByIdAndDelete(req.params.id);
    if (!cp) {
      return res.status(404).json({
        success: false,
        message: "Channel partner not found",
      });
    }
    res.json({
      success: true,
      message: "Channel partner deleted successfully",
    });
  } catch (error) {
    handleError(res, error);
  }
};

// Get CPs by role
const getCpsByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const cps = await Cp.find({ role });
    res.json({ success: true, data: cps });
  } catch (error) {
    handleError(res, error);
  }
};

// Search CPs
const searchCps = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const cps = await Cp.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
        { firmName: { $regex: query, $options: "i" } },
        { ownerName: { $regex: query, $options: "i" } },
      ],
    }).limit(10);

    res.json({ success: true, data: cps });
  } catch (error) {
    handleError(res, error);
  }
};

// Get leads associated with a CP
const getLeadsByCp = async (req, res) => {
  try {
    const cpId = req.params.id;
    const paginationParams = getPaginationParams(req.query);

    // First check if CP exists
    const cp = await Cp.findById(cpId);
    if (!cp) {
      return res.status(404).json({
        success: false,
        message: "CP not found",
      });
    }

    const result = await findLeadsWithPagination(
      { associatedCp: cpId },
      {
        ...paginationParams,
        populate: [
          {
            path: "remarkHistory",
            options: { sort: { createdAt: -1 } },
          },
          {
            path: "associatedCp",
            select: "name phone role companyRole ownerName ownerContact designation firmName",
          },
          {
            path: "createdBy",
            select: "name email role",
          },
        ],
      }
    );

    res.json({
      success: true,
      leads: result.data,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalLeads: result.totalItems,
      cp: {
        id: cpId,
        name: cp.name,
        phone: cp.phone,
        role: cp.role,
        companyRole: cp.companyRole,
        ownerName: cp.ownerName,
        ownerContact: cp.ownerContact,
        designation: cp.designation,
        firmName: cp.firmName,
      }
    });
  } catch (error) {
    handleError(res, error, "Error fetching leads associated with CP");
  }
};

module.exports = {
  getAllCps,
  getCpById,
  createCp,
  updateCp,
  deleteCp,
  getCpsByRole,
  searchCps,
  getLeadsByCp,
};
