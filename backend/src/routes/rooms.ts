import { Router, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { rooms, roomMembers, messages, users } from "../db/schema";
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
    const myRooms = await db
      .select({
        roomId: rooms.id,
        roomName: rooms.name,
        memberId: roomMembers.id,
        userId: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        isOnline: users.isOnline,
      })
      .from(roomMembers)
      .innerJoin(rooms, eq(roomMembers.roomId, rooms.id))
      .innerJoin(users, eq(roomMembers.userId, users.id))
      .where(eq(roomMembers.userId, req.userId!));

    // group manually
    const grouped = myRooms.reduce((acc: any, row) => {
      let room = acc.find((r: any) => r.id === row.roomId);

      if (!room) {
        room = {
          id: row.roomId,
          name: row.roomName,
          members: [],
        };
        acc.push(room);
      }

      room.members.push({
        id: row.userId,
        username: row.username,
        avatarUrl: row.avatarUrl,
        isOnline: row.isOnline,
      });

      return acc;
    }, []);

    res.json({ rooms: grouped });
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

    // check membership
    const membership = await db
      .select()
      .from(roomMembers)
      .where(
        and(
          eq(roomMembers.roomId, roomId),
          eq(roomMembers.userId, req.userId!)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: "Not a member of this room" });
    }

    // messages + sender join
    const msgs = await db
      .select({
        id: messages.id,
        roomId: messages.roomId,
        senderId: messages.senderId,
        content: messages.content,
        type: messages.type,
        createdAt: messages.createdAt,
        userId: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        before
          ? and(
              eq(messages.roomId, roomId),
              lt(messages.createdAt, new Date(before))
            )
          : eq(messages.roomId, roomId)
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // reverse for chat UI
    res.json({
      messages: msgs.reverse().map((m) => ({
        id: m.id,
        roomId: m.roomId,
        senderId: m.senderId,
        content: m.content,
        type: m.type,
        createdAt: m.createdAt,
        sender: {
          id: m.userId,
          username: m.username,
          avatarUrl: m.avatarUrl,
        },
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/rooms/:roomId/join
router.post("/:roomId/join", async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;

    const existing = await db
      .select()
      .from(roomMembers)
      .where(
        and(
          eq(roomMembers.roomId, roomId),
          eq(roomMembers.userId, req.userId!)
        )
      )
      .limit(1);

    if (existing.length > 0) {
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

router.delete("/:roomId", async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;

    await db.delete(rooms).where(eq(rooms.id, roomId));

    return res.json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;