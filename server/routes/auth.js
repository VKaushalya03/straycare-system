const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Standard Authentication
router.post("/register", authController.register);
router.post("/login", authController.login);

// Google Authentication
router.post("/google", authController.googleSignIn);

// Password Management
router.post("/forgot-password", authController.forgotPassword);

module.exports = router;
