const express = require("express");
const { login, loginWithGoogle, logout, me, register } = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");
const {
    authIdentityRateLimiter,
    authIpRateLimiter
} = require("../middleware/rateLimitMiddleware");

const router = express.Router();

router.post("/register", authIpRateLimiter, authIdentityRateLimiter, register);
router.post("/login", authIpRateLimiter, authIdentityRateLimiter, login);
router.post("/google", authIpRateLimiter, loginWithGoogle);
router.post("/logout", authenticateToken, logout);
router.get("/me", authenticateToken, me);

module.exports = router;
