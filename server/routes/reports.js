const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const multer = require("multer");
const authMiddleware = require("../middleware/auth");

// Configure Multer for local file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Ensure you create an 'uploads' folder in your backend root
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// File filter to only allow images and videos
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file format. Please upload images or videos only."),
      false,
    );
  }
};

const upload = multer({ storage, fileFilter, limits: { files: 5 } });

// Routes
// Note: Add `authMiddleware` to these routes to ensure only logged-in users can access them
router.post("/", upload.array("media", 5), reportController.createReport);
router.get("/summary", reportController.getSummaryCounts);
router.get("/", reportController.getAllReports);
router.put("/:reportId/status", reportController.updateStatus);

module.exports = router;
