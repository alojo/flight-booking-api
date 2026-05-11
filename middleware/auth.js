const jwt = require("jsonwebtoken");

// The JWT secret is like a stamp. Login stamps the token with it, and the auth middleware checks "does this token have the right stamp?" If someone doesn't know the secret, they can't forge a valid token.
const JWT_SECRET = process.env.JWT_SECRET;


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
