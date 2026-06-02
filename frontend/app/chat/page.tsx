'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, roomsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useChatStore } from '@/store/chat';
import { getSocket, reconnectSocket, disconnectSocket } from '@/lib/socket';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { MembersPanel } from './components/MembersPanel';
import { NewRoomModal } from './components/NewRoomModal';
import { Room } from '@/lib/types';

export default function ChatPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const setRooms = useChatStore((s) => s.setRooms);
  const clearChat = useChatStore((s) => s.clearChat);
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const [showModal, setShowModal] = useState(false);
  const [ready, setReady] = useState(false);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }

    (async () => {
      try {
        const { data: me } = await authApi.me();
        const currentUserId = me.user.id;
        
        // If user changed, clear previous user's data and reconnect socket
        if (lastUserId && lastUserId !== currentUserId) {
          clearChat();
          reconnectSocket();
        }
        
        setLastUserId(currentUserId);
        setAuth(me.user, token);

        const { data: room } = await roomsApi.list();
        setRooms(room.rooms as Room[]);

        // Socket connection
        const socket = getSocket();
        socket.on('connect', () => console.log('Socket connected'));
        socket.on('error', (err: any) => console.error('Socket error:', err));

        setReady(true);
      } catch {
        router.replace('/login');
      }
    })();
  }, [router, setAuth, setRooms, clearChat, lastUserId]);

  if (!ready) return <Splash />;

  return (
    <div className="app">
      <Sidebar onNewRoom={() => setShowModal(true)} />
      <ChatArea />
      {activeRoomId && <MembersPanel />}
      {showModal && <NewRoomModal onClose={() => setShowModal(false)} />}

      <style jsx>{`
        .app {
          display: flex; height: 100vh; overflow: hidden;
          background: var(--bg);
          animation: fadeIn 0.3s both;
        }
      `}</style>
    </div>
  );
}

function Splash() {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16, background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(124,106,247,0.1) 0%, transparent 70%)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: 'var(--accent)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24,
        animation: 'pulse-dot 1.5s ease-in-out infinite',
      }}>V</div>
      <div style={{
        width: 32, height: 3, borderRadius: 2,
        background: 'linear-gradient(90deg, var(--bg3) 25%, var(--accent) 50%, var(--bg3) 75%)',
        backgroundSize: '200% auto',
        animation: 'shimmer 1.2s linear infinite',
      }} />
    </div>
  );
}
