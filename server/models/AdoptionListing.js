const mongoose = require("mongoose");

const adoptionListingSchema = new mongoose.Schema(
  {
    listerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    linkedReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      default: null, // Optional: If they are listing a dog previously reported on the map
    },
    // 1. Dog Details
    dogDetails: {
      name: { type: String, default: "Unknown" },
      breed: { type: String, required: true },
      age: { type: String, required: true },
      location: { type: String, required: true },
      description: { type: String },
    },
    // 2. Lister Details (Mandatory)
    listerDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      contactNumber: { type: String, required: true },
    },
    // 3. Media (Max 3 photos)
    media: [
      {
        url: String,
      },
    ],
    // 4. Status Tracking
    status: {
      type: String,
      enum: ["Available", "Pending", "Adopted"],
      default: "Available",
    },
    // 5. Active Request Data
    currentRequest: {
      requesterName: String,
      requesterEmail: String,
      requesterContact: String,
      requestDate: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AdoptionListing", adoptionListingSchema);
