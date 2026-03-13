const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 1. Location
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
    },
    // 2. Upload Photos/Video
    media: [
      {
        url: String,
        fileType: { type: String, enum: ["image", "video"] },
      },
    ],
    // 3. Dog Details (Expand these as needed based on your Figma design)
    dogDetails: {
      description: { type: String, required: true },
      breed: { type: String, default: "Unknown" },
      condition: { type: String },
    },
    // 4. Choose Action
    actionStatus: {
      type: String,
      enum: [
        "Permanently Adopted",
        "Temporarily Adopted",
        "Contacted Welfare Organizations",
        "Urgent Help Needed",
      ],
      required: true,
    },
    mapColor: {
      type: String,
      enum: ["Green", "Yellow", "Blue", "Red"],
      required: true,
    },
    // Action-Specific Requirements
    adopterDetails: {
      name: String,
      contact: String,
    },
    tempGuardianDetails: {
      name: String,
      contact: String,
    },
  },
  { timestamps: true },
); // Automatically handles "Date and time of report"

// Pre-save middleware to assign map color based on action
reportSchema.pre("save", function (next) {
  const colorMap = {
    "Permanently Adopted": "Green",
    "Temporarily Adopted": "Yellow",
    "Contacted Welfare Organizations": "Blue",
    "Urgent Help Needed": "Red",
  };
  this.mapColor = colorMap[this.actionStatus];
  next();
});

module.exports = mongoose.model("Report", reportSchema);
