const User = require("../models/User");
const Report = require("../models/Report");
const AdoptionListing = require("../models/AdoptionListing");
const bcrypt = require("bcryptjs");

// ─── Points constants ──────────────────────────────────────────────────────
// Single source of truth — update here and it propagates everywhere.
const POINTS = {
  PERMANENT_ADOPT: 500,
  TEMP_SHELTER: 200,
  REPORT_STRAY: 100,
  CONTACT_WELFARE: 50,
  HEALTH_DETECTION: 50,
  FACILITATE_ADOPTION: 300,
};

// ─── Achievement definitions ───────────────────────────────────────────────
// Achievements are computed dynamically from real report/adoption data,
// so we don't need a separate DB collection for them.
function computeAchievements(reports, adoptedDogs, user) {
  const earned = [];
  const totalReports = reports.length;
  const permanentAdoptions = adoptedDogs.length;
  const tempSheltered = reports.filter(
    (r) => r.actionStatus === "Temporarily Adopted",
  ).length;
  const welfareContacts = reports.filter(
    (r) => r.actionStatus === "Welfare Contacted",
  ).length;

  if (permanentAdoptions >= 1) {
    earned.push({
      id: "first_adoption",
      title: "First Adoption",
      description: "Permanently adopted a rescue dog",
      points: 500,
      date: adoptedDogs[0]?.updatedAt || adoptedDogs[0]?.createdAt,
      category: "adoption",
    });
  }

  if (permanentAdoptions >= 3) {
    earned.push({
      id: "triple_adoption",
      title: "Triple Rescue",
      description: "Permanently adopted 3 rescue dogs",
      points: 300,
      date: adoptedDogs[2]?.updatedAt,
      category: "adoption",
    });
  }

  if (totalReports >= 5) {
    earned.push({
      id: "stray_reporter",
      title: "Stray Reporter",
      description: "Reported 5 stray dogs in need",
      points: 300,
      date: reports[4]?.createdAt,
      category: "report",
    });
  }

  if (totalReports >= 10) {
    earned.push({
      id: "stray_reporter_pro",
      title: "Community Watchdog",
      description: "Reported 10 stray dogs",
      points: 500,
      date: reports[9]?.createdAt,
      category: "report",
    });
  }

  if (tempSheltered >= 1) {
    earned.push({
      id: "temp_shelter",
      title: "Temporary Guardian",
      description: "Provided temporary shelter to a dog",
      points: 200,
      date: reports.find((r) => r.actionStatus === "Temporarily Adopted")
        ?.updatedAt,
      category: "community",
    });
  }

  if (welfareContacts >= 1) {
    earned.push({
      id: "welfare_connector",
      title: "Welfare Connector",
      description: "Connected a stray with a welfare organisation",
      points: 50,
      date: reports.find((r) => r.actionStatus === "Welfare Contacted")
        ?.updatedAt,
      category: "community",
    });
  }

  // Health detection milestone — driven by rewardPoints in the healthChecks bucket
  if (user.pointsBreakdown?.healthChecks >= 500) {
    earned.push({
      id: "health_champion",
      title: "Health Champion",
      description: "Used disease detection 10+ times",
      points: 400,
      date: user.updatedAt,
      category: "health",
    });
  }

  return earned.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ─── 1. Get Full User Profile ──────────────────────────────────────────────
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // All reports by this user, newest first
    const reports = await Report.find({ reporter: req.user.id }).sort({
      createdAt: -1,
    });

    // Split reports by current action status
    const tempShelteredDogs = reports.filter(
      (r) => r.actionStatus === "Temporarily Adopted",
    );

    // Permanent adoptions come from two sources:
    // (a) reports the user resolved themselves, (b) platform adoption listings
    const adoptedViaReports = reports.filter(
      (r) => r.actionStatus === "Permanently Adopted",
    );
    const adoptedViaPlatform = await AdoptionListing.find({
      "currentRequest.requesterEmail": user.email,
      status: "Adopted",
    });
    const adoptedDogs = [...adoptedViaReports, ...adoptedViaPlatform];

    // Compute achievements dynamically — no extra DB queries needed
    const achievements = computeAchievements(reports, adoptedDogs, user);

    res.status(200).json({
      user: {
        id: user._id,
        role: user.role,
        name: user.name || user.organizationName,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        rewardPoints: user.rewardPoints,
        pointsBreakdown: user.pointsBreakdown || {
          adoptions: 0,
          reports: 0,
          healthChecks: 0,
          community: 0,
        },
        createdAt: user.createdAt,
      },
      stats: {
        totalReports: reports.length,
        tempSheltered: tempShelteredDogs.length,
        totalAdopted: adoptedDogs.length,
      },
      reports,
      tempShelteredDogs,
      adoptedDogs,
      achievements,
    });
  } catch (error) {
    console.error("getUserProfile error:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

// ─── 2. Upgrade Temporarily Sheltered Dog to Permanently Adopted ───────────
exports.updateTempDogStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { adopterDetails } = req.body;

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (report.reporter.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorised action" });
    }

    if (report.actionStatus !== "Temporarily Adopted") {
      return res
        .status(400)
        .json({ message: "Dog is not currently temporarily sheltered" });
    }

    // Update report — the pre-save hook in Report.js changes mapColor to green
    report.actionStatus = "Permanently Adopted";
    if (adopterDetails) report.adopterDetails = adopterDetails;
    await report.save();

    // Award points and update the adoptions breakdown bucket
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        rewardPoints: POINTS.PERMANENT_ADOPT,
        "pointsBreakdown.adoptions": POINTS.PERMANENT_ADOPT,
      },
    });

    res.status(200).json({
      message: "Dog successfully upgraded to Permanently Adopted!",
      pointsAwarded: POINTS.PERMANENT_ADOPT,
      report,
    });
  } catch (error) {
    console.error("updateTempDogStatus error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── 3. Award points for health detection (called from disease detection route)
exports.awardHealthDetectionPoints = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $inc: {
        rewardPoints: POINTS.HEALTH_DETECTION,
        "pointsBreakdown.healthChecks": POINTS.HEALTH_DETECTION,
      },
    });
    res.status(200).json({
      message: "Points awarded for health detection",
      pointsAwarded: POINTS.HEALTH_DETECTION,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error awarding points" });
  }
};

// ─── 4. Update Profile Details ─────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, location, contactDetails, servicesOffered } =
      req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Build the $set object for MongoDB
    const setData = {};

    if (user.role === "individual") {
      if (name !== undefined) setData.name = name.trim();
      if (phone !== undefined) setData.phone = phone ? phone.trim() : "";
      if (address !== undefined)
        setData.address = address ? address.trim() : "";
    }

    if (user.role === "organization") {
      if (location !== undefined) setData.location = location;
      if (contactDetails !== undefined) setData.contactDetails = contactDetails;
      if (servicesOffered !== undefined)
        setData.servicesOffered = servicesOffered;
    }

    // Use MongoDB's $set operator to persist all fields
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: setData },
      { returnDocument: "after", runValidators: true },
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
      },
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

// ─── 5. Change Password ────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both current and new password are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("changePassword error:", error);
    res.status(500).json({ message: "Server error changing password" });
  }
};

// ─── 6. Delete Account ─────────────────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Clean up all related data so nothing is orphaned in the DB
    await Report.deleteMany({ reporter: userId });
    await AdoptionListing.deleteMany({
      "currentRequest.requesterEmail": user.email,
    });
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("deleteAccount error:", error);
    res.status(500).json({ message: "Server error deleting account" });
  }
};

// ─── Export points constants so other controllers can use them ─────────────
exports.POINTS = POINTS;
