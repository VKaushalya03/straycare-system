const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

// Apply auth middleware to all profile routes
router.use(authMiddleware);

// Profile Data & Account Management
router.get("/profile", userController.getUserProfile);
router.put("/profile", userController.updateProfile);
router.put("/profile/password", userController.changePassword);
router.delete("/profile", userController.deleteAccount);

// Temporarily Sheltered Dog specific route
router.put(
  "/profile/temp-dog/:reportId/adopt",
  userController.updateTempDogStatus,
);

// Health Detection Points
router.post("/profile/award-health-points", userController.awardHealthDetectionPoints);

module.exports = router;
