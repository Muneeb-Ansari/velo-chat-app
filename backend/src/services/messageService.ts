import { db } from "../db";
import { messages, roomMembers } from "../db/schema";
import { eq, and } from "drizzle-orm";

export async function saveMessage(roomId: string, senderId: string, content: string) {
    const membership = await db.query.roomMembers.findFirst({
        where: and(
            eq(roomMembers.roomId, roomId),
            eq(roomMembers.userId, senderId)
        ),
    });

    if (!membership) throw new Error("Not a room member");

    const [msg] = await db.insert(messages).values({
        roomId,
        senderId,
        content,
        type: "text",
    }).returning();

    return db.query.messages.findFirst({
        where: eq(messages.id, msg.id),
        with: {
            sender: { columns: { id: true, username: true, avatarUrl: true } },
        },
    });
}