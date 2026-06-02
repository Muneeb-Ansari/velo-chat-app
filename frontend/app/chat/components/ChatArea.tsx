'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '@/store/chat';
import { useAuthStore } from '@/store/auth';
import { roomsApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { MessageBubble } from './MessageBubble';
import { Message } from '@/lib/types';
import { format, isToday, isYesterday } from 'date-fns';

function dateSep(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

export function ChatArea() {
  const activeRoomId = useChatStore((s) => s.activeRoomId);
  const rooms = useChatStore((s) => s.rooms);
  const messages = useChatStore((s) =>
  activeRoomId ? s.messages[activeRoomId] : undefined
) || [];
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const user = useAuthStore((s) => s.user);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const room = rooms.find((r) => r.id === activeRoomId);

  // Load messages on room switch
  useEffect(() => {
    if (!activeRoomId) return;
    setLoading(true);
    roomsApi.messages(activeRoomId).then(({ data }) => {
      setMessages(activeRoomId, data.messages);
    }).catch(console.error).finally(() => setLoading(false));
  }, [activeRoomId, setMessages]);

  // Socket events
  useEffect(() => {
    if (!activeRoomId) return;
    const socket = getSocket();
    socket.emit('join_room', activeRoomId);

    const onMsg = (msg: Message) => {
      console.log("Received message:", msg);
      if (msg.roomId === activeRoomId) addMessage(activeRoomId, msg);
    };
    const onTyping = (data: { username: string; typing: boolean }) => {
      setTyping((prev) =>
        data.typing ? [...new Set([...prev, data.username])] : prev.filter((u) => u !== data.username)
      );
    };

    socket.on('receive_message', onMsg);
    socket.on('user_typing', onTyping);
    return () => {
      socket.off('receive_message', onMsg);
      socket.off('user_typing', onTyping);
    };
  }, [activeRoomId, addMessage]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const send = useCallback(() => {
    if (!input.trim() || !activeRoomId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    const socket = getSocket();
    socket.emit('send_message', { roomId: activeRoomId, content });
    setSending(false);
  }, [input, activeRoomId, sending]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Typing indicator emit
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const socket = getSocket();
    socket.emit('typing', { roomId: activeRoomId, typing: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { roomId: activeRoomId, typing: false });
    }, 1500);
  };

  if (!activeRoomId) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3>Pick a room</h3>
        <p>Select a room from the sidebar or create a new one</p>
        <style jsx>{`
          .empty-state {
            flex: 1; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 12px;
            color: var(--text3);
          }
          .empty-icon {
            width: 72px; height: 72px; border-radius: 20px;
            background: var(--bg3); border: 1px solid var(--border);
            display: flex; align-items: center; justify-content: center;
            color: var(--text3);
          }
          h3 { font-family: 'Syne', sans-serif; font-size: 18px; color: var(--text2); }
          p { font-size: 14px; }
        `}</style>
      </div>
    );
  }

  // Build date-separated groups
  const grouped: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const sep = dateSep(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== sep) grouped.push({ date: sep, messages: [msg] });
    else last.messages.push(msg);
  });

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <div className="room-title">
          <span className="room-hash">{room?.type === 'direct' ? '💬' : '#'}</span>
          <span className="room-name-h">{room?.name}</span>
        </div>
        <div className="room-meta">
          {room?.members?.length ?? 0} member{(room?.members?.length ?? 0) !== 1 ? 's' : ''}
          {' · '}
          <span className="online-count">
            {room?.members?.filter((m) => m.isOnline).length ?? 0} online
          </span>
        </div>
        <div className="header-members">
          {room?.members?.slice(0, 5).map((m) => (
            <div key={m.id} className="member-pip" title={m.username}
              style={{ background: `hsl(${m.id.charCodeAt(0) * 7 % 360}, 60%, 55%)` }}>
              {m.username[0].toUpperCase()}
            </div>
          ))}
          {(room?.members?.length || 0) > 5 && (
            <div className="member-pip more">+{(room?.members.length || 0) - 5}</div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="messages-scroll">
        {loading && (
          <div className="loading-msgs">
            {[...Array(5)].map((_, i) => <SkeletonMsg key={i} mine={i % 3 === 2} />)}
          </div>
        )}
        {!loading && grouped.map((group) => (
          <div key={group.date}>
            <div className="date-sep">
              <span>{group.date}</span>
            </div>
            {group.messages.map((msg, i) => {
              const prev = group.messages[i - 1];
              const showAvatar = !prev || prev.senderId !== msg.senderId;
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMine={msg.senderId === user?.id}
                  showAvatar={showAvatar}
                />
              );
            })}
          </div>
        ))}
        {typing.filter((u) => u !== user?.username).length > 0 && (
          <div className="typing-ind">
            <span className="typing-dots">
              <span /><span /><span />
            </span>
            <span>{typing.filter((u) => u !== user?.username).join(', ')} is typing…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="input-area">
        <div className="input-box">
          <textarea
            ref={textareaRef}
            className="msg-input"
            placeholder={`Message #${room?.name}…`}
            value={input}
            onChange={onInput}
            onKeyDown={onKeyDown}
            rows={1}
          />
          <button
            className={`send-btn ${input.trim() ? 'active' : ''}`}
            onClick={send}
            disabled={!input.trim() || sending}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <p className="input-hint">Enter to send · Shift+Enter for newline</p>
      </div>

      <style jsx>{`
        .chat-area { flex: 1; display: flex; flex-direction: column; min-width: 0; height: 100vh; overflow: hidden; }
        .chat-header {
          padding: 14px 20px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 12px; flex-shrink: 0;
          background: var(--bg2);
        }
        .room-title { display: flex; align-items: center; gap: 6px; }
        .room-hash { font-size: 16px; }
        .room-name-h { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px; }
        .room-meta { font-size: 12px; color: var(--text3); }
        .online-count { color: var(--green); }
        .header-members { margin-left: auto; display: flex; gap: 4px; }
        .member-pip {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600; color: #fff;
          border: 2px solid var(--bg2);
        }
        .member-pip.more { background: var(--bg4); color: var(--text2); font-size: 10px; }
        .messages-scroll {
          flex: 1; overflow-y: auto; padding: 16px 20px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .loading-msgs { display: flex; flex-direction: column; gap: 12px; }
        .date-sep {
          text-align: center; margin: 12px 0; position: relative;
        }
        .date-sep::before {
          content: ''; position: absolute; top: 50%; left: 0; right: 0;
          height: 1px; background: var(--border);
        }
        .date-sep span {
          position: relative; background: var(--bg); padding: 0 10px;
          font-size: 11px; color: var(--text3); font-weight: 500;
        }
        .typing-ind {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: var(--text3); padding: 4px 0;
          animation: fadeIn 0.2s both;
        }
        .typing-dots { display: flex; gap: 3px; }
        .typing-dots span {
          width: 5px; height: 5px; border-radius: 50%; background: var(--text3);
          animation: blink 1.2s ease-in-out infinite;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        .input-area {
          padding: 12px 16px 14px; border-top: 1px solid var(--border);
          background: var(--bg2); flex-shrink: 0;
        }
        .input-box {
          display: flex; align-items: flex-end; gap: 10px;
          background: var(--bg3); border: 1px solid var(--border);
          border-radius: 14px; padding: 8px 8px 8px 14px;
          transition: border-color 0.2s;
        }
        .input-box:focus-within { border-color: var(--accent); }
        .msg-input {
          flex: 1; background: none; border: none; outline: none;
          color: var(--text); font-size: 14px; font-family: inherit;
          resize: none; max-height: 120px; line-height: 1.5; padding: 2px 0;
        }
        .msg-input::placeholder { color: var(--text3); }
        .send-btn {
          width: 34px; height: 34px; border-radius: 10px; border: none;
          background: var(--bg4); color: var(--text3); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.15s;
        }
        .send-btn.active { background: var(--accent); color: #fff; }
        .send-btn:hover.active { opacity: 0.88; }
        .send-btn:disabled { cursor: not-allowed; }
        .input-hint { font-size: 11px; color: var(--text3); margin-top: 6px; padding-left: 2px; }
      `}</style>
    </div>
  );
}

function SkeletonMsg({ mine }: { mine: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 8 }}>
      {!mine && <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg4)', flexShrink: 0 }} />}
      <div style={{
        width: `${120 + Math.random() * 100}px`, height: 38, borderRadius: 14,
        background: 'linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%)',
        backgroundSize: '200% auto',
        animation: 'shimmer 1.5s linear infinite',
      }} />
    </div>
  );
}
