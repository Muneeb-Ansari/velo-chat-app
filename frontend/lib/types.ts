export interface User {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  isOnline: boolean;
  createdAt?: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  type: 'group' | 'direct';
  createdBy: string;
  createdAt: string;
  members: User[];
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: 'text' | 'system';
  editedAt?: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}
