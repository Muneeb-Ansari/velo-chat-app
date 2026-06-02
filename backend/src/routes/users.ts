import { Router, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { ilike, ne, eq } from "drizzle-orm";

const router = Router();
router.use(authMiddleware);

// GET /api/users/search?q=username
router.get("/search", async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    if (q.length < 2) {
      return res.json({ users: [] });
    }

    const found = await db.select({
      id: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      isOnline: users.isOnline,
    }).from(users).where(ilike(users.username, `%${q}%`)).limit(10);

    const filtered = found.filter((u) => u.id !== req.userId);
    res.json({ users: filtered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users - list all users except self
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      isOnline: users.isOnline,
    }).from(users).where(ne(users.id, req.userId!)).limit(50);

    res.json({ users: allUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;