import { create } from 'zustand';
import { Room, Message } from '@/lib/types';

interface ChatState {
  rooms: Room[];
  activeRoomId: string | null;
  messages: Record<string, Message[]>;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  setActiveRoom: (id: string | null) => void;
  setMessages: (roomId: string, msgs: Message[]) => void;
  addMessage: (roomId: string, msg: Message) => void;
  prependMessages: (roomId: string, msgs: Message[]) => void;
  replaceTempMessage: (roomId: string, tempId: string, realMsg: Message) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((s) => ({ rooms: [room, ...s.rooms] })),
  removeRoom: (roomId) => set((s) => ({ rooms: s.rooms.filter((r) => r.id !== roomId) })),
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
  replaceTempMessage: (roomId, tempId, realMsg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] || [])
          .map((m) => (m.id === tempId ? realMsg : m))
          .filter((m, i, arr) => 
            // Remove duplicates by ID (keep the first occurrence)
            i === 0 || arr.findIndex(x => x.id === m.id) === i
          ),
      },
    })),
  clearChat: () => set({ rooms: [], activeRoomId: null, messages: {} }),
}));

