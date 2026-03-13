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
      default: 0, // Every new user starts with 0 points
    },

    // --- Individual Specific Fields ---
    name: {
      type: String,
      required: function () {
        return this.role === "individual";
      },
      trim: true,
    },

    // --- Organization Specific Fields ---
    organizationName: {
      type: String,
      required: function () {
        return this.role === "organization";
      },
      unique: true,
      sparse: true, // Crucial: Allows individuals to not have this field without triggering a "duplicate null" error
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
    timestamps: true, // Automatically adds createdAt and updatedAt dates
  },
);

module.exports = mongoose.model("User", userSchema);
