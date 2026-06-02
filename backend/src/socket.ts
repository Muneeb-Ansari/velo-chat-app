import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { saveMessage } from "./services/messageService";

interface UserSocketMap {
    [userId: string]: string;
}

const userSocketMap: UserSocketMap = {};

export function initSocket(server: any) {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:3000",
        },
    });

    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error("No token"));

            const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
            socket.data.userId = payload.userId;
            socket.data.username = payload.username;
            next();
        } catch {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.data.userId;
        userSocketMap[userId] = socket.id;

        // Fix 6 — mark user online
        try {
            await db.update(users)
                .set({ isOnline: true })
                .where(eq(users.id, userId));
        } catch (err) {
            console.error("Failed to mark online:", err);
        }
        console.log("User connected:", userId);

        socket.on("join_room", (roomId: string) => {
            socket.join(roomId);
        });

        socket.on("send_message", async (data: { roomId: string; content: string }) => {
            try {
                const saved = await saveMessage(data.roomId, userId, data.content);
                io.to(data.roomId).emit("receive_message", saved);
            } catch (err: any) {
                socket.emit("error", { message: err.message || "Failed to send message" });
            }
        });

        // Fix 4 — disconnect handler at top level, NOT inside send_message
        socket.on("disconnect", async () => {
            delete userSocketMap[userId];

            // Fix 6 — mark user offline
            await db.update(users)
                .set({ isOnline: false })
                .where(eq(users.id, userId));

            console.log("User disconnected:", userId);
        });
    });
}