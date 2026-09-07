import { Server } from "socket.io";

let io = null;

export function initSocket(httpServer) {
  const corsOrigin =
    process.env.NODE_ENV === "production" ? process.env.CLIENT_URL : true; // reflect request origin in dev
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (userId) socket.join(`user:${userId}`);
    const scope = socket.handshake.auth?.scope;
    if (scope) socket.join(`scope:${scope}`);
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO not initialized yet");
  return io;
}

// Emits to one user's room.
export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

// Emits to every connected client with a given RBAC scope (e.g. all Vehicle Masters).
export function emitToScope(scope, event, payload) {
  if (!io) return;
  io.to(`scope:${scope}`).emit(event, payload);
}
