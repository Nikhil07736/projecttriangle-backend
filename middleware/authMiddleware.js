const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Make sure crypto is imported

const protect = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // ✨ THIS IS THE FIX ✨
    // We are not hashing here. We are only verifying the JWT token.
    // The crypto line was a mistake from a previous copy-paste.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient role." });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };