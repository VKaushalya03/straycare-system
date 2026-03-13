const User = require("../models/User");
const Report = require("../models/Report");
const AdoptionListing = require("../models/AdoptionListing");
const bcrypt = require("bcryptjs");

// --- 1. Get Full User Profile Data ---
exports.getUserProfile = async (req, res) => {
  try {
    // 1. Get basic user details (excluding password) and reward points [cite: 193, 199]
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Get Reported Dogs [cite: 194, 201, 202]
    // Includes status, date, and action automatically via the Report schema [cite: 203]
    const reports = await Report.find({ reporter: req.user.id }).sort({
      createdAt: -1,
    });
    const totalReports = reports.length;

    // 3. Get Temporarily Sheltered Dogs [cite: 198, 204]
    const tempShelteredDogs = reports.filter(
      (report) => report.actionStatus === "Temporarily Adopted",
    );

    // 4. Get Adopted Dogs [cite: 196]
    // This looks for dogs the user permanently adopted via their reports or via the adoption platform
    const adoptedViaReports = reports.filter(
      (report) => report.actionStatus === "Permanently Adopted",
    );
    const adoptedViaPlatform = await AdoptionListing.find({
      "currentRequest.requesterEmail": user.email,
      status: "Adopted",
    });

    res.status(200).json({
      user,
      totalReports,
      reports,
      tempShelteredDogs,
      adoptedDogs: [...adoptedViaReports, ...adoptedViaPlatform],
    });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

// --- 2. Update Temporarily Sheltered Dog to Permanently Adopted ---
exports.updateTempDogStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { adopterDetails } = req.body;

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: "Report not found" });

    // Verify ownership
    if (report.reporter.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    // Update status [cite: 208, 209]
    report.actionStatus = "Permanently Adopted";
    report.adopterDetails = adopterDetails;
    // Note: The pre-save hook we wrote in Report.js automatically changes mapColor to Green [cite: 212]
    await report.save();

    // Add points for permanent adoption [cite: 217, 220]
    await User.findByIdAndUpdate(req.user.id, { $inc: { rewardPoints: 20 } });

    res
      .status(200)
      .json({
        message: "Dog successfully updated to Permanently Adopted!",
        report,
      });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// --- 3. Update Profile Details ---
exports.updateProfile = async (req, res) => {
  try {
    const { name, location, contactDetails, servicesOffered } = req.body;
    let user = await User.findById(req.user.id);

    if (user.role === "individual" && name) user.name = name;
    if (user.role === "organization") {
      if (location) user.location = location;
      if (contactDetails) user.contactDetails = contactDetails;
      if (servicesOffered) user.servicesOffered = servicesOffered;
    }

    await user.save();
    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server error updating profile" });
  }
};

// --- 4. Change Password ---
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect current password." });

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error changing password" });
  }
};

// --- 5. Delete Account ---
exports.deleteAccount = async (req, res) => {
  try {
    // The frontend handles the "Are you sure?" warning before hitting this endpoint [cite: 226, 228]
    await User.findByIdAndDelete(req.user.id);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error deleting account" });
  }
};
