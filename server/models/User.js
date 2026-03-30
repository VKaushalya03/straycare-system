const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // --- Common Authentication Fields ---
    role: {
      type: String,
      enum: ["individual", "organization"],
      required: [true, "Role is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },

    // --- Point System ---
    rewardPoints: {
      type: Number,
      default: 0,
    },

    // Tracks how points were earned, broken down by category.
    // Used by the Profile "Points Breakdown" UI panel.
    pointsBreakdown: {
      adoptions: { type: Number, default: 0 },
      reports: { type: Number, default: 0 },
      healthChecks: { type: Number, default: 0 },
      community: { type: Number, default: 0 },
    },

    // --- Individual Specific Fields ---
    name: {
      type: String,
      required: function () {
        return this.role === "individual";
      },
      trim: true,
    },

    // Contact fields for individual users — shown in the profile form.
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },

    // --- Organization Specific Fields ---
    organizationName: {
      type: String,
      required: function () {
        return this.role === "organization";
      },
      unique: true,
      sparse: true,
      trim: true,
    },
    location: {
      type: String,
      required: function () {
        return this.role === "organization";
      },
    },
    servicesOffered: {
      type: String,
      required: function () {
        return this.role === "organization";
      },
    },
    contactDetails: {
      type: String,
      required: function () {
        return this.role === "organization";
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
