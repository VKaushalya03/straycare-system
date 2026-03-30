const Report = require("../models/Report");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

// ─── Points constants ──────────────────────────────────────────────────────
const POINTS = {
  PERMANENT_ADOPT: 500,
  TEMP_SHELTER: 200,
  REPORT_STRAY: 100,
  CONTACT_WELFARE: 50,
  HEALTH_DETECTION: 50,
  FACILITATE_ADOPTION: 300,
};

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

    // Validation: 3. Required Fields
    if (!location || !dogDetails || !actionStatus) {
      return res
        .status(400)
        .json({ message: "Please complete all required fields." });
    }

    // --- FIX: Parse the FormData strings back into objects ---
    const parsedLocation = JSON.parse(location);
    const parsedDogDetails = JSON.parse(dogDetails);
    const parsedAdopter = adopterDetails ? JSON.parse(adopterDetails) : null;
    const parsedTemp = tempGuardianDetails
      ? JSON.parse(tempGuardianDetails)
      : null;

    // Validation: 4. Action-Based Requirements
    if (
      actionStatus === "Permanently Adopted" &&
      (!parsedAdopter?.name || !parsedAdopter?.contact)
    ) {
      return res
        .status(400)
        .json({ message: "Adopter's name and contact details are required." });
    }
    if (
      actionStatus === "Temporarily Adopted" &&
      (!parsedTemp?.name || !parsedTemp?.contact)
    ) {
      return res.status(400).json({
        message: "Temporary guardian's name and contact details are required.",
      });
    }

    // Process Media
    const media = files.map((file) => ({
      url: file.path.replace(/\\/g, "/"),
      fileType: file.mimetype.startsWith("video/") ? "video" : "image",
    }));

    // --- FIX: Determine the map color based on the action ---
    let mapColor = "Red"; // Default for Urgent Help Needed
    if (actionStatus === "Permanently Adopted") mapColor = "Green";
    else if (actionStatus === "Temporarily Adopted") mapColor = "Yellow";
    else if (actionStatus === "Contacted Welfare Organizations")
      mapColor = "Blue";

    // Save Report
    const newReport = new Report({
      reporter: req.user.id,
      location: parsedLocation,
      dogDetails: parsedDogDetails,
      actionStatus,
      mapColor: mapColor, // <--- Pass the color to the database!
      adopterDetails: parsedAdopter,
      tempGuardianDetails: parsedTemp,
      media,
    });

    await newReport.save();

    // Reward System: Add points to user for reporting
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        rewardPoints: POINTS.REPORT_STRAY,
        "pointsBreakdown.reports": POINTS.REPORT_STRAY,
      },
    });

    // Urgent Action Trigger
    if (actionStatus === "Urgent Help Needed") {
      // If you haven't fully set up Nodemailer yet, this might fail, so we wrap it in a try/catch
      try {
        await sendUrgentEmailsToOrgs(newReport);
      } catch (emailErr) {
        console.error("Email failed, but report saved:", emailErr);
      }
    }

    res
      .status(201)
      .json({ message: "Report submitted successfully", report: newReport });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ message: "Server error while saving report." });
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

    const oldStatus = report.actionStatus;
    report.actionStatus = newStatus;

    // If updating to adopted, save the new details
    if (newStatus === "Permanently Adopted") {
      report.adopterDetails = actionDetails;
    }

    await report.save();

    // Award points based on status change
    let pointsToAward = 0;
    let category = "";

    if (newStatus === "Permanently Adopted") {
      pointsToAward = POINTS.PERMANENT_ADOPT;
      category = "adoptions";
    } else if (newStatus === "Temporarily Adopted") {
      pointsToAward = POINTS.TEMP_SHELTER;
      category = "community";
    } else if (newStatus === "Contacted Welfare Organizations") {
      pointsToAward = POINTS.CONTACT_WELFARE;
      category = "community";
    }

    // Only award if transitioning to a new status
    if (oldStatus !== newStatus && pointsToAward > 0) {
      await User.findByIdAndUpdate(req.user.id, {
        $inc: {
          rewardPoints: pointsToAward,
          [`pointsBreakdown.${category}`]: pointsToAward,
        },
      });
    }

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
