import { create } from 'zustand';
import { Room, Message } from '@/lib/types';

interface ChatState {
  rooms: Room[];
  activeRoomId: string | null;
  messages: Record<string, Message[]>;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  setActiveRoom: (id: string | null) => void;
  setMessages: (roomId: string, msgs: Message[]) => void;
  addMessage: (roomId: string, msg: Message) => void;
  prependMessages: (roomId: string, msgs: Message[]) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((s) => ({ rooms: [room, ...s.rooms] })),
  setActiveRoom: (id) => set({ activeRoomId: id }),
  setMessages: (roomId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [roomId]: msgs } })),
  addMessage: (roomId, msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: [...(s.messages[roomId] || []), msg],
      },
    })),
  prependMessages: (roomId, msgs) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: [...msgs, ...(s.messages[roomId] || [])],
      },
    })),
  clearChat: () => set({ rooms: [], activeRoomId: null, messages: {} }),
}));
