import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function createSocket(): Socket {
  const token = localStorage.getItem('token');
  const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  });
  
  // Global error handlers
  newSocket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  newSocket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
  
  newSocket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });
  
  newSocket.on('connect', () => {
    console.log('Socket connected:', newSocket.id);
  });
  
  return newSocket;
}

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = createSocket();
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
  socket = createSocket();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
