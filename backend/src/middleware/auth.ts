import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// For internal calls from the Go gateway
export const gatewayMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const secret = req.headers["x-gateway-secret"];
  if (secret !== process.env.GATEWAY_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};