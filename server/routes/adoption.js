const express = require("express");
const router = express.Router();
const adoptionController = require("../controllers/adoptionController");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, "adopt-" + Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Please upload image files only."), false);
};

const upload = multer({ storage, fileFilter, limits: { files: 3 } });

// Open Routes (Anyone can view)
router.get("/counts", adoptionController.getCounts);
router.get("/", adoptionController.getListings);

// Protected Routes (Must be logged in to list, manage, or request a dog)
router.post(
  "/",
  authMiddleware,
  upload.array("media", 3),
  adoptionController.createListing,
);

router.post("/:id/request", authMiddleware, adoptionController.requestAdoption);

router.put("/:id/confirm", authMiddleware, adoptionController.confirmAdoption);
router.put("/:id/cancel", authMiddleware, adoptionController.cancelRequest);

module.exports = router;
