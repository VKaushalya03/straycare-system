const Report = require("../models/Report");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

// --- 1. Create a Report ---
exports.createReport = async (req, res) => {
  try {
    const {
      location,
      dogDetails,
      actionStatus,
      adopterDetails,
      tempGuardianDetails,
    } = req.body;
    const files = req.files || [];

    // Validation: 2. Upload Photos Limits
    if (files.length > 5) {
      return res
        .status(400)
        .json({ message: "Maximum upload limit exceeded." });
    }
    const videoCount = files.filter((f) =>
      f.mimetype.startsWith("video/"),
    ).length;
    if (videoCount > 1) {
      return res.status(400).json({ message: "Only 1 video is allowed." });
    }

    // Validation: 3. Add Dog Details
    if (!location || !dogDetails || !actionStatus) {
      return res
        .status(400)
        .json({ message: "Please complete all required fields." });
    }

    // Validation: 4. Action-Based Requirements
    if (
      actionStatus === "Permanently Adopted" &&
      (!adopterDetails?.name || !adopterDetails?.contact)
    ) {
      return res
        .status(400)
        .json({ message: "Adopter's name and contact details are required." });
    }
    if (
      actionStatus === "Temporarily Adopted" &&
      (!tempGuardianDetails?.name || !tempGuardianDetails?.contact)
    ) {
      return res.status(400).json({
        message: "Temporary guardian's name and contact details are required.",
      });
    }

    // Process Media
    const media = files.map((file) => ({
      url: file.path, // In production, this would be an S3 or Cloudinary URL
      fileType: file.mimetype.startsWith("video/") ? "video" : "image",
    }));

    // Save Report
    const newReport = new Report({
      reporter: req.user.id, // Assumes you have middleware verifying the JWT
      location: JSON.parse(location),
      dogDetails: JSON.parse(dogDetails),
      actionStatus,
      adopterDetails:
        actionStatus === "Permanently Adopted"
          ? JSON.parse(adopterDetails)
          : undefined,
      tempGuardianDetails:
        actionStatus === "Temporarily Adopted"
          ? JSON.parse(tempGuardianDetails)
          : undefined,
      media,
    });

    await newReport.save();

    // Reward System: Add points to user for reporting
    await User.findByIdAndUpdate(req.user.id, { $inc: { rewardPoints: 10 } });

    // Urgent Action Trigger
    if (actionStatus === "Urgent Help Needed") {
      await sendUrgentEmailsToOrgs(newReport);
    }

    res
      .status(201)
      .json({ message: "Report submitted successfully", report: newReport });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// --- 2. Get Summary Counts ---
exports.getSummaryCounts = async (req, res) => {
  try {
    const total = await Report.countDocuments();
    const permanentlyAdopted = await Report.countDocuments({
      actionStatus: "Permanently Adopted",
    });
    const temporarilyAdopted = await Report.countDocuments({
      actionStatus: "Temporarily Adopted",
    });
    const contactedWelfare = await Report.countDocuments({
      actionStatus: "Contacted Welfare Organizations",
    });
    const urgentHelp = await Report.countDocuments({
      actionStatus: "Urgent Help Needed",
    });

    res.status(200).json({
      total,
      green: permanentlyAdopted,
      yellow: temporarilyAdopted,
      blue: contactedWelfare,
      red: urgentHelp,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// --- 3. Get All Reports (For Map Display) ---
exports.getAllReports = async (req, res) => {
  try {
    // Populate reporter details if you want to show who reported it
    const reports = await Report.find().populate(
      "reporter",
      "name organizationName",
    );
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// --- 4. Update Report Status ---
exports.updateStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { newStatus, actionDetails } = req.body;

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: "Report not found." });

    report.actionStatus = newStatus;

    // If updating to adopted, save the new details
    if (newStatus === "Permanently Adopted") {
      report.adopterDetails = actionDetails;
      // Bonus: Add points to the user/org who facilitated the adoption
      await User.findByIdAndUpdate(req.user.id, { $inc: { rewardPoints: 50 } });
    }

    await report.save(); // pre-save hook will automatically update the mapColor
    res.status(200).json({ message: "Status updated successfully", report });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// --- Helper: Send Emails to Organizations ---
const sendUrgentEmailsToOrgs = async (reportDetails) => {
  try {
    // Fetch all users with the role of 'organization'
    const orgs = await User.find({ role: "organization" }).select("email");

    // Loop through them and send the real email
    for (const org of orgs) {
      await sendEmail({
        to: org.email,
        subject: "URGENT: Stray Dog Needs Immediate Help!",
        text: `An urgent report has been filed near ${reportDetails.location.address || "the attached coordinates"}. \n\nDog Description: ${reportDetails.dogDetails.description}\n\nPlease log in to the StrayCare Dashboard to view the exact location and photos.`,
      });
    }
  } catch (error) {
    console.error("Failed to send urgent emails to organizations:", error);
  }
};
