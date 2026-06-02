'use client';
import { useState } from 'react';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { Avatar } from './Avatar';
import { Room } from '@/lib/types';
import { disconnectSocket } from '@/lib/socket';
import { useRouter } from 'next/navigation';

interface Props {
  onNewRoom: () => void;
}

export function Sidebar({ onNewRoom }: Props) {
  const router = useRouter();
  const rooms = useChatStore((s) => s.rooms);
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const setActiveRoom = useChatStore((s) => s.setActiveRoom);
  const clearChat = useChatStore((s) => s.clearChat);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [search, setSearch] = useState('');

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const logout = () => {
    disconnectSocket();
    clearChat();
    clearAuth();
    router.push('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <span className="brand-logo">V</span>
          <span className="brand-name">Velo</span>
        </div>
        <button className="new-room-btn" onClick={onNewRoom} title="New room">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <div className="search-wrap">
        <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input className="search-input" placeholder="Search rooms…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rooms-label">Rooms</div>

      <nav className="room-list">
        {filtered.length === 0 && (
          <div className="empty-rooms">
            {search ? 'No rooms match' : 'No rooms yet — create one'}
          </div>
        )}
        {filtered.map((room, i) => (
          <RoomItem key={room.id} room={room}
            active={room.id === activeRoomId}
            onClick={() => setActiveRoom(room.id)}
            index={i}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <>
            <Avatar username={user.username} avatarUrl={user.avatarUrl} isOnline size={32} />
            <div className="footer-info">
              <span className="footer-name">{user.username}</span>
              <span className="footer-status">Online</span>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        .sidebar {
          width: 260px; flex-shrink: 0;
          background: var(--bg2); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; height: 100vh;
          overflow: hidden;
        }
        .sidebar-header {
          padding: 18px 16px 14px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--border);
        }
        .brand { display: flex; align-items: center; gap: 8px; }
        .brand-logo {
          width: 28px; height: 28px; border-radius: 8px;
          background: var(--accent); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 14px;
        }
        .brand-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 16px; }
        .new-room-btn {
          width: 28px; height: 28px; border-radius: 8px;
          background: var(--bg3); border: 1px solid var(--border);
          color: var(--text2); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .new-room-btn:hover { background: var(--accent); color: #fff; border-color: var(--accent); }
        .search-wrap {
          margin: 12px 12px 4px;
          background: var(--bg3); border: 1px solid var(--border);
          border-radius: 10px; display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; transition: border-color 0.2s;
        }
        .search-wrap:focus-within { border-color: var(--accent); }
        .search-icon { color: var(--text3); flex-shrink: 0; }
        .search-input {
          background: none; border: none; outline: none;
          color: var(--text); font-size: 13px; font-family: inherit; width: 100%;
        }
        .search-input::placeholder { color: var(--text3); }
        .rooms-label {
          padding: 10px 16px 4px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text3);
        }
        .room-list { flex: 1; overflow-y: auto; padding: 4px 8px; }
        .empty-rooms {
          padding: 20px 12px; font-size: 13px; color: var(--text3); text-align: center;
        }
        .sidebar-footer {
          padding: 12px 14px; border-top: 1px solid var(--border);
          display: flex; align-items: center; gap: 10px;
        }
        .footer-info { flex: 1; min-width: 0; }
        .footer-name {
          display: block; font-size: 13px; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .footer-status { font-size: 11px; color: var(--green); }
        .logout-btn {
          width: 28px; height: 28px; border-radius: 8px;
          background: none; border: 1px solid var(--border);
          color: var(--text3); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; flex-shrink: 0;
        }
        .logout-btn:hover { background: rgba(248,113,113,0.1); color: var(--red); border-color: var(--red); }
      `}</style>
    </aside>
  );
}

function RoomItem({ room, active, onClick, index }: {
  room: Room; active: boolean; onClick: () => void; index: number;
}) {
  const online = (room.members ?? []).filter((m) => m.isOnline).length;

  return (
    <button className={`room-item ${active ? 'active' : ''}`} onClick={onClick}
      style={{ animationDelay: `${index * 30}ms` }}>
      <div className="room-icon">
        {room.type === 'direct' ? '💬' : '#'}
      </div>
      <div className="room-info">
        <span className="room-name">{room.name}</span>
        {online > 0 && <span className="room-online">{online} online</span>}
      </div>
      <style jsx>{`
        .room-item {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 10px; border: none;
          background: none; color: var(--text2); cursor: pointer;
          text-align: left; font-family: inherit;
          transition: background 0.15s, color 0.15s;
          animation: slideIn 0.3s both;
        }
        .room-item:hover { background: var(--bg3); color: var(--text); }
        .room-item.active { background: var(--accent-glow); color: var(--text); }
        .room-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: var(--bg3); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; flex-shrink: 0;
        }
        .room-item.active .room-icon { background: var(--accent-glow2); border-color: var(--accent); color: var(--accent); }
        .room-info { flex: 1; min-width: 0; }
        .room-name { display: block; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .room-online { display: block; font-size: 11px; color: var(--green); }
      `}</style>
    </button>
  );
}
