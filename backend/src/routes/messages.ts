import { Router} from "express";
import { gatewayMiddleware } from "../middleware/auth.js";
import { message } from "../Controller/messageController";

const router = Router();

// POST /api/internal/messages - called by Go gateway to persist a message
router.post("/messages", gatewayMiddleware, message);

export default router;