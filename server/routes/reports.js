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
// 1. ADD authMiddleware to the POST route so it knows WHO is reporting
router.post(
  "/",
  authMiddleware,
  upload.array("media", 5),
  reportController.createReport,
);

router.get("/summary", reportController.getSummaryCounts);
router.get("/", reportController.getAllReports);

// 2. ADD authMiddleware to the PUT route so only logged-in users can update statuses
router.put("/:reportId/status", authMiddleware, reportController.updateStatus);

module.exports = router;
