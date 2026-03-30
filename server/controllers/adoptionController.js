const AdoptionListing = require("../models/AdoptionListing");
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

// --- 1. Get Counts ---
exports.getCounts = async (req, res) => {
  try {
    const totalDogs = await AdoptionListing.countDocuments();
    const availableDogs = await AdoptionListing.countDocuments({
      status: "Available",
    });
    const successfullyAdopted = await AdoptionListing.countDocuments({
      status: "Adopted",
    });
    const pendingRequests = await AdoptionListing.countDocuments({
      status: "Pending",
    });

    res.status(200).json({
      totalDogs,
      availableDogs,
      successfullyAdopted,
      pendingRequests,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// --- 2. Get Listings (With Filters) ---
exports.getListings = async (req, res) => {
  try {
    const { breed, location, age, status } = req.query;
    let query = {};

    if (breed) query["dogDetails.breed"] = new RegExp(breed, "i"); // Case-insensitive search
    if (location) query["dogDetails.location"] = new RegExp(location, "i");
    if (age) query["dogDetails.age"] = age;
    if (status) query.status = status;

    const listings = await AdoptionListing.find(query).sort({ createdAt: -1 });
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// --- 3. List a Dog ---
exports.createListing = async (req, res) => {
  try {
    const { dogDetails, listerDetails, linkedReportId } = req.body;
    const files = req.files || [];

    if (files.length > 3) {
      return res
        .status(400)
        .json({ message: "Maximum upload limit exceeded." });
    }

    // Validation
    const parsedDog = JSON.parse(dogDetails);
    const parsedLister = JSON.parse(listerDetails);

    if (
      !parsedLister.name ||
      !parsedLister.email ||
      !parsedLister.contactNumber ||
      !parsedDog.breed ||
      !parsedDog.age ||
      !parsedDog.location
    ) {
      return res
        .status(400)
        .json({ message: "Please complete all required fields." });
    }

    const media = files.map((file) => ({ url: file.path }));

    const newListing = new AdoptionListing({
      listerId: req.user.id,
      linkedReportId: linkedReportId || null,
      dogDetails: parsedDog,
      listerDetails: parsedLister,
      media,
    });

    await newListing.save();
    res
      .status(201)
      .json({ message: "Dog listed successfully", listing: newListing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// --- 4. Request to Adopt ---
exports.requestAdoption = async (req, res) => {
  try {
    const { id } = req.params;
    const { requesterName, requesterEmail, requesterContact } = req.body;

    if (!requesterName || !requesterEmail || !requesterContact) {
      return res
        .status(400)
        .json({ message: "Please complete all required fields." });
    }

    const listing = await AdoptionListing.findById(id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found." });
    }

    // 👇 THE NEW SECURITY CHECK 👇
    // If the person making the request is the same person who created the listing, block it!
    if (listing.listerId.toString() === req.user.id) {
      return res
        .status(400)
        .json({
          message: "You cannot request to adopt a dog you listed yourself.",
        });
    }
    // 👆 END OF SECURITY CHECK 👆

    if (listing.status !== "Available") {
      return res
        .status(400)
        .json({ message: "This dog is no longer available." });
    }

    listing.status = "Pending";
    listing.currentRequest = {
      requesterName,
      requesterEmail,
      requesterContact,
      requestDate: new Date(),
    };
    await listing.save();

    // Trigger Email to Lister
    // (Note: We will set up the actual email sending later!)
    sendEmail(
      listing.listerDetails.email,
      "New Adoption Request!",
      `${requesterName} wants to adopt ${listing.dogDetails.name}. Contact them at ${requesterContact}.`,
    );

    res.status(200).json({
      message: "Adoption requested successfully. The lister has been notified.",
      listing,
    });
  } catch (error) {
    console.error("Error requesting adoption:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// --- 5. Confirm Adoption ---
exports.confirmAdoption = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await AdoptionListing.findById(id);

    if (!listing)
      return res.status(404).json({ message: "Listing not found." });

    // Security check: Only the person who listed the dog can confirm it
    if (listing.listerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized action." });
    }

    listing.status = "Adopted";
    await listing.save();

    // Trigger Confirmation Emails
    sendEmail(
      listing.listerDetails.email,
      "Adoption Confirmed",
      `You have successfully adopted out ${listing.dogDetails.name}.`,
    );
    sendEmail(
      listing.currentRequest.requesterEmail,
      "Adoption Confirmed!",
      `Your adoption of ${listing.dogDetails.name} has been confirmed!`,
    );

    // Reward points: Lister gets FACILITATE_ADOPTION points
    await User.findByIdAndUpdate(listing.listerId, {
      $inc: {
        rewardPoints: POINTS.FACILITATE_ADOPTION,
        "pointsBreakdown.adoptions": POINTS.FACILITATE_ADOPTION,
      },
    });

    // Get adopter email and award PERMANENT_ADOPT points
    const adopterEmail = listing.currentRequest.requesterEmail;
    const adopter = await User.findOne({ email: adopterEmail });
    if (adopter) {
      await User.findByIdAndUpdate(adopter._id, {
        $inc: {
          rewardPoints: POINTS.PERMANENT_ADOPT,
          "pointsBreakdown.adoptions": POINTS.PERMANENT_ADOPT,
        },
      });
    }

    res
      .status(200)
      .json({ message: "Adoption confirmed successfully", listing });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// --- 6. Cancel Request ---
exports.cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await AdoptionListing.findById(id);

    if (!listing)
      return res.status(404).json({ message: "Listing not found." });

    if (listing.listerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized action." });
    }

    const requesterEmail = listing.currentRequest.requesterEmail;

    listing.status = "Available";
    listing.currentRequest = undefined; // Clear the request
    await listing.save();

    // Trigger Cancellation Emails
    sendEmail(
      listing.listerDetails.email,
      "Request Cancelled",
      `The adoption request for ${listing.dogDetails.name} has been cancelled.`,
    );
    sendEmail(
      requesterEmail,
      "Request Cancelled",
      `Unfortunately, the adoption request for ${listing.dogDetails.name} has been cancelled.`,
    );

    res
      .status(200)
      .json({ message: "Request cancelled. Dog is available again.", listing });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
