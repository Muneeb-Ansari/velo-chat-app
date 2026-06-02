import { Router, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { rooms, roomMembers, messages } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { eq, and, desc, lt } from "drizzle-orm";

const router = Router();
router.use(authMiddleware);

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["group", "direct"]).default("group"),
  memberIds: z.array(z.string().uuid()).default([]),
});

// GET /api/rooms - list rooms the user is in
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const myRooms = await db.query.roomMembers.findMany({
      where: eq(roomMembers.userId, req.userId!),
      with: {
        room: {
          with: {
            members: {
              with: { user: { columns: { id: true, username: true, avatarUrl: true, isOnline: true } } },
            },
          },
        },
      },
    });

    const result = myRooms.map((rm) => ({
      ...rm.room,
      members: rm.room.members.map((m) => m.user),
    }));

    res.json({ rooms: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/rooms - create a room
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const body = createRoomSchema.parse(req.body);

    const [room] = await db
      .insert(rooms)
      .values({
        name: body.name,
        description: body.description,
        type: body.type,
        createdBy: req.userId!,
      })
      .returning();

    // Add creator as admin member
    const memberInserts = [
      { roomId: room.id, userId: req.userId!, isAdmin: true },
      ...body.memberIds.map((id) => ({ roomId: room.id, userId: id, isAdmin: false })),
    ];

    await db.insert(roomMembers).values(memberInserts);

    res.status(201).json({ room });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/rooms/:roomId/messages - paginated history
router.get("/:roomId/messages", async (req: AuthRequest, res: Response) => {
    try {
        const { roomId } = req.params;
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const before = req.query.before as string | undefined;

        const membership = await db.query.roomMembers.findFirst({
            where: and(
                eq(roomMembers.roomId, roomId),
                eq(roomMembers.userId, req.userId!)
            ),
        });

        if (!membership) {
            return res.status(403).json({ error: "Not a member of this room" });
        }

        // Fix 8 — apply cursor filter when `before` is provided
        const msgs = await db.query.messages.findMany({
            where: before
                ? and(eq(messages.roomId, roomId), lt(messages.createdAt, new Date(before)))
                : eq(messages.roomId, roomId),
            with: {
                sender: { columns: { id: true, username: true, avatarUrl: true } },
            },
            orderBy: [desc(messages.createdAt)],
            limit,
        });

        res.json({ messages: msgs.reverse() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/rooms/:roomId/join
router.post("/:roomId/join", async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;

    const existing = await db.query.roomMembers.findFirst({
      where: and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, req.userId!)
      ),
    });

    if (existing) {
      return res.status(409).json({ error: "Already a member" });
    }

    await db.insert(roomMembers).values({
      roomId,
      userId: req.userId!,
    });

    res.json({ message: "Joined room successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;