'use client';
import { useChatStore } from '@/store/chat';
import { Avatar } from './Avatar';

export function MembersPanel() {
  const rooms = useChatStore((s) => s.rooms);
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const room = rooms.find((r) => r.id === activeRoomId);

  if (!room) return null;

  const online = room.members?.filter((m) => m.isOnline);
  const offline = room.members?.filter((m) => !m.isOnline);

  return (
    <aside className="members-panel">
      <h3 className="panel-title">Members · {room?.members?.length}</h3>
      {online?.length > 0 && (
        <div className="section">
          <div className="section-label">Online — {online?.length}</div>
          {online?.map((m) => (
            <div key={m.id} className="member-row">
              <Avatar username={m.username} avatarUrl={m.avatarUrl} isOnline size={30} />
              <span className="member-name">{m.username}</span>
            </div>
          ))}
        </div>
      )}
      {offline?.length > 0 && (
        <div className="section">
          <div className="section-label">Offline — {offline?.length}</div>
          {offline?.map((m) => (
            <div key={m.id} className="member-row offline">
              <Avatar username={m.username} avatarUrl={m.avatarUrl} isOnline={false} size={30} />
              <span className="member-name">{m.username}</span>
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        .members-panel {
          width: 220px; flex-shrink: 0;
          background: var(--bg2); border-left: 1px solid var(--border);
          padding: 16px 12px; overflow-y: auto; height: 100vh;
        }
        .panel-title {
          font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px;
          margin-bottom: 16px; color: var(--text2);
        }
        .section { margin-bottom: 20px; }
        .section-label {
          font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text3); margin-bottom: 8px;
        }
        .member-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 8px; border-radius: 8px;
          transition: background 0.1s; cursor: default;
        }
        .member-row:hover { background: var(--bg3); }
        .member-row.offline { opacity: 0.5; }
        .member-name { font-size: 13px; font-weight: 500; }
      `}</style>
    </aside>
  );
}
