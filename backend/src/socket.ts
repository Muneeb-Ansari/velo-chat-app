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
        const username = socket.data.username;
        userSocketMap[userId] = socket.id;

        // Mark user online
        try {
            await db.update(users)
                .set({ isOnline: true })
                .where(eq(users.id, userId));
        } catch (err) {
            console.error("Failed to mark online:", err);
        }
        console.log("User connected:", userId, username);

        // Join room
        socket.on("join_room", (roomId: string) => {
            socket.join(roomId);
            // Notify others in room
            socket.to(roomId).emit("user_joined", {
                userId,
                username,
                timestamp: new Date(),
            });
        });

        // Send message
        socket.on("send_message", async (data: { roomId: string; content: string }) => {
            try {
                const saved = await saveMessage(data.roomId, userId, data.content);
                io.to(data.roomId).emit("receive_message", {
                    ...saved,
                    sender: {
                        id: userId,
                        username: username,
                    },
                });
            } catch (err: any) {
                socket.emit("error", { message: err.message || "Failed to send message" });
            }
        });

        // Typing indicator
        socket.on("typing", (data: { roomId: string; typing: boolean }) => {
            socket.to(data.roomId).emit("user_typing", {
                userId,
                username,
                typing: data.typing,
            });
        });

        // Leave room
        socket.on("leave_room", (roomId: string) => {
            socket.leave(roomId);
            socket.to(roomId).emit("user_left", {
                userId,
                username,
                timestamp: new Date(),
            });
        });

        // Disconnect handler
        socket.on("disconnect", async () => {
            delete userSocketMap[userId];

            // Mark user offline
            try {
                await db.update(users)
                    .set({ isOnline: false })
                    .where(eq(users.id, userId));
            } catch (err) {
                console.error("Failed to mark offline:", err);
            }

            // Notify all rooms user was in
            io.emit("user_disconnected", {
                userId,
                username,
                timestamp: new Date(),
            });

            console.log("User disconnected:", userId);
        });
    });
}