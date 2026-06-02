import { Router, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { ilike, ne, eq } from "drizzle-orm";
import multer from "multer";

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
      email: users.email,
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

const upload = multer({
  dest: "uploads/",
});


router.put("/:id",  upload.single("avatar"), async (req: AuthRequest, res: Response) => {
  try {
    
    const { id } = req.params;

    //  const avatarUrl = req.file?.filename;
    const avatarUrl = req.file ? `http://localhost:3000/uploads/${req.file.filename}` : undefined;

    const updatedUser = await db.update(users).set({ avatarUrl }).where(eq(users.id, id)).returning();

    if (!updatedUser.length) {
      return res.status(400).json({ error: "User not found" });
    }

    res.json({ user: updatedUser[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;