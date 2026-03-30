require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db"); // Your custom DB connection

// Connect Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows us to accept JSON data in the body
app.use(express.urlencoded({ extended: true })); // Crucial for parsing FormData (handling image/video uploads)

// Make the 'uploads' folder publicly accessible so the frontend can display the images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/adoption", require("./routes/adoption"));
app.use("/api/users", require("./routes/user"));
app.use("/api/hub", require("./routes/hub"));

// Basic health check route
app.get("/", (req, res) => {
  res.send("StrayCare API is running...");
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
