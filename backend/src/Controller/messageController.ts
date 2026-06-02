import { Request, Response } from "express";
import { z } from "zod";
import { saveMessage } from "../services/messageService";

const messageSchema = z.object({
    roomId: z.string().uuid(),
    senderId: z.string().uuid(),
    content: z.string().min(1).max(4000),
    type: z.enum(["text", "system"]).default("text"),
});

export async function message(req: Request, res: Response) {
    try {
        const body = messageSchema.parse(req.body);

        const full = await saveMessage(body.roomId, body.senderId, body.content);

        res.status(201).json({ message: full });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: err.errors });
        }
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}