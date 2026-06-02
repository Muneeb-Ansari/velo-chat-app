import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
    });
  }
  return socket;
}

export function reconnectSocket(): Socket {
  // Force disconnect old socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  // Create new socket with current token
  const token = localStorage.getItem('token');
  socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
    auth: { token },
    transports: ['websocket'],
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
