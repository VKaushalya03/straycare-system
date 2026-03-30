const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

// TODO: Replace with your actual Google Client ID from the Google Cloud Console
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to generate JWT
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role: role },
    process.env.JWT_SECRET || "fallback_secret",
    {
      expiresIn: "7d",
    },
  );
};

// --- 1. REGISTRATION ---
exports.register = async (req, res) => {
  try {
    const {
      role,
      email,
      password,
      name,
      organizationName,
      location,
      servicesOffered,
      contactDetails,
    } = req.body;

    // Validate Required Fields
    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Please complete all required fields." });
    }

    if (role === "organization") {
      if (
        !organizationName ||
        !location ||
        !servicesOffered ||
        !contactDetails
      ) {
        return res
          .status(400)
          .json({ message: "Please provide complete organization details." });
      }
    } else if (role === "individual") {
      if (!name) {
        return res
          .status(400)
          .json({ message: "Please complete all required fields." });
      }
    }

    // Check Unique Constraints
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists." });
    }

    if (role === "organization") {
      const existingOrg = await User.findOne({ organizationName });
      if (existingOrg) {
        return res
          .status(400)
          .json({ message: "This organization name is already registered." });
      }
    }

    // Hash password & Save User
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      role,
      email,
      password: hashedPassword,
      ...(role === "individual"
        ? { name }
        : { organizationName, location, servicesOffered, contactDetails }),
    });

    await newUser.save();

    // Auto-login after registration
    const token = generateToken(newUser._id, newUser.role);
    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name || newUser.organizationName,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during registration." });
  }
};

// --- 2. LOGIN ---
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Account does not exist." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = generateToken(user._id, user.role);
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || user.organizationName,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during login." });
  }
};

// --- 3. GOOGLE SIGN-IN ---
exports.googleSignIn = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // If they don't exist, automatically create an 'individual' profile
      // Note: We generate a random password since they use Google to log in
      const randomPassword = await bcrypt.hash(
        googleId + process.env.JWT_SECRET,
        10,
      );

      user = new User({
        role: "individual",
        email: email,
        name: name,
        password: randomPassword,
      });
      await user.save();
    }

    // Log them in
    const jwtToken = generateToken(user._id, user.role);
    res.status(200).json({
      message: "Google Login successful",
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || user.organizationName,
      },
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(400).json({ message: "Google authentication failed." });
  }
};

// --- 4. FORGOT PASSWORD ---
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Account does not exist." });
    }

    // In a full implementation, you would generate a reset token and send an email here.
    // For now, we return a success message to satisfy the UI flow.
    res.status(200).json({
      message: "If that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};
