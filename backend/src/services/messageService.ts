import { db } from "../db";
import { messages, roomMembers } from "../db/schema";
import { eq, and } from "drizzle-orm";

export async function saveMessage(roomId: string, senderId: string, content: string) {
    const membership = await db.select().from(roomMembers).where(
        and(
            eq(roomMembers.roomId, roomId),
            eq(roomMembers.userId, senderId)
        )
    ).limit(1).then(res => res[0]);

    if (!membership) throw new Error("Not a room member");

    const [msg] = await db.insert(messages).values({
        roomId,
        senderId,
        content,
        type: "text",
    }).returning();

    return db.select().from(messages).where(eq(messages.id, msg.id)).then(res => res[0]);
}