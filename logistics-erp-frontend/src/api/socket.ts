import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./client";

let socket: Socket | null = null;

export function connectSocket(userId: string, scope: string): Socket {
  const socketUrl = API_BASE_URL.replace(/\/api\/?$/, "");
  socket = io(socketUrl, { auth: { userId, scope }, autoConnect: true });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
