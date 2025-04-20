const Lead = require("../models/lead");
const Notification = require("../models/notification");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

// Function to create notification for a lead
const createNotification = async (lead) => {
  try {
    // Get lead data from the database
    const fullLead = await Lead.findById(lead._id).select('name phone purpose status');
    
    const notification = new Notification({
      lead: lead._id,
      leadName: fullLead.name,  // Using name from fullLead
      title: "Scheduled Lead Notification",
      message: `Lead ${fullLead.name} is scheduled for ${lead.dateTime.toLocaleString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`,
      type: "scheduled",
      scheduledAt: lead.dateTime,
      leadData: {
        name: fullLead.name,
        phone: fullLead.phone,
        purpose: fullLead.purpose,
        status: fullLead.status
      }
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Function to check and create notifications for today's leads
const checkAndCreateNotifications = async () => {
  try {
    // Get current time with minutes precision (ignoring seconds and milliseconds)
    const now = new Date();
    now.setSeconds(0, 0); // Set seconds and milliseconds to 0

    // Find leads scheduled for today that match the current time
    const leads = await Lead.find({
      dateTime: {
        $gte: now,
        $lt: new Date(now.getTime() + 60 * 1000) // Next minute
      },
      'notifications.type': { $ne: 'scheduled' } // Only create notification if no scheduled type exists
    }).select('dateTime name');

    if (leads.length > 0) {
      console.log(`Found ${leads.length} leads matching current time`);
      
      // Create notifications for each matching lead
      for (const lead of leads) {
        // Check if there's already a scheduled notification for this lead
        const existingNotification = await Notification.findOne({
          lead: lead._id,
          type: 'scheduled',
          scheduledAt: lead.dateTime
        });

        if (!existingNotification) {
          await createNotification(lead);
          console.log(`Created notification for lead: ${lead.name} at ${lead.dateTime}`);
        }
      }
    } else {
      console.log('No leads found matching current time');
    }

    console.log('Notification check completed');
  } catch (error) {
    console.error("Error checking and creating notifications:", error);
    throw error;
  }
};

// Export the scheduler functions
module.exports = {
  checkAndCreateNotifications,
};
