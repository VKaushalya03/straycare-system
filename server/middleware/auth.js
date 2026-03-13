const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Get token from the header
  const token = req.header("Authorization");

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // Format should be "Bearer <token>"
    const decodedToken = token.split(" ")[1];
    const decoded = jwt.verify(
      decodedToken,
      process.env.JWT_SECRET || "fallback_secret",
    );

    // Add user payload to request object
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};
