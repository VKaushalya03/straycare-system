const express = require("express");
const router = express.Router();
const User = require("../models/User");

// --- 1. Get Registered Welfare Organizations from Database ---
router.get("/organizations", async (req, res) => {
  try {
    // Find all users with the role of 'organization'
    // We use .select('-password') to ensure we don't accidentally send passwords to the frontend!
    const orgs = await User.find({ role: "organization" }).select("-password");
    res.status(200).json(orgs);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).json({ message: "Server error fetching organizations" });
  }
});

// --- 2. Get Vets & Pet Shops from Google Maps Places API ---
router.get("/services", async (req, res) => {
  try {
    const { type, city } = req.query;

    // Format the search query for Google (e.g., "veterinary clinic in Colombo, Sri Lanka")
    const searchQuery = `${type === "vet" ? "veterinary clinic" : "pet shop"} in ${city}, Sri Lanka`;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // Fetch from Google's Text Search API
    const googleResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`,
    );
    const data = await googleResponse.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google API Error: ${data.status}`);
    }

    res.status(200).json(data.results);
  } catch (error) {
    console.error("Error fetching from Google Maps:", error);
    res
      .status(500)
      .json({ message: "Error fetching services from Google Maps" });
  }
});

module.exports = router;
