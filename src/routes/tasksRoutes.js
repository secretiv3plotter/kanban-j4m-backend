const express = require("express");
const { getTasks, postTask } = require("../controllers/tasksController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { tasksRateLimiter } = require("../middleware/rateLimitMiddleware");

const router = express.Router();

router.use(tasksRateLimiter);
router.use(authenticateToken);

router.get("/", getTasks);
router.post("/", postTask);

module.exports = router;
