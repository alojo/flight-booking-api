const jwt = require("jsonwebtoken");

const JWT_SECRET = "your-secret-key-change-later";

const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ success: false, error: "No token, access denied" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; //auth middleware verifies the token, and decodes it and attaches the payload to req.user.
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: "Invalid token" });
  }
};

module.exports = { auth, JWT_SECRET };
