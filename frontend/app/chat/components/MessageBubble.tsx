'use client';
import { Message } from '@/lib/types';
import { Avatar } from './Avatar';
import { format, isToday, isYesterday } from 'date-fns';

interface Props {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`;
  return format(d, 'MMM d, HH:mm');
}

export function MessageBubble({ message, isMine, showAvatar }: Props) {
  if (message.type === 'system') {
    return (
      <div className="sys-msg">
        <span>{message.content}</span>
        <style jsx>{`
          .sys-msg {
            text-align: center; padding: 4px 0;
            font-size: 12px; color: var(--text3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`msg-row ${isMine ? 'mine' : 'theirs'}`}>
      {!isMine && (
        <div className="avatar-slot">
          {showAvatar && (
            <Avatar username={message.sender.username} avatarUrl={message.sender.avatarUrl} size={30} />
          )}
        </div>
      )}
      <div className="msg-body">
        {!isMine && showAvatar && (
          <span className="sender-name">{message.sender.username}</span>
        )}
        <div className="bubble-wrap">
          <div className="bubble">{message.content}</div>
          <span className="time">{formatTime(message.createdAt)}</span>
        </div>
      </div>
      <style jsx>{`
        .msg-row {
          display: flex; gap: 8px; margin-bottom: 2px;
          animation: fadeUp 0.2s both;
        }
        .msg-row.mine { flex-direction: row-reverse; }
        .avatar-slot { width: 30px; flex-shrink: 0; display: flex; align-items: flex-end; }
        .msg-body { max-width: 68%; display: flex; flex-direction: column; }
        .msg-row.mine .msg-body { align-items: flex-end; }
        .sender-name { font-size: 11px; font-weight: 600; color: var(--text3); margin-bottom: 3px; padding-left: 2px; }
        .bubble-wrap { display: flex; align-items: flex-end; gap: 5px; }
        .msg-row.mine .bubble-wrap { flex-direction: row-reverse; }
        .bubble {
          padding: 9px 13px; border-radius: 16px;
          font-size: 14px; line-height: 1.5; word-break: break-word;
          white-space: pre-wrap;
        }
        .msg-row.mine .bubble {
          background: var(--accent); color: #fff;
          border-bottom-right-radius: 4px;
        }
        .msg-row.theirs .bubble {
          background: var(--bg3); color: var(--text);
          border: 1px solid var(--border);
          border-bottom-left-radius: 4px;
        }
        .time { font-size: 10px; color: var(--text3); white-space: nowrap; padding-bottom: 2px; }
      `}</style>
    </div>
  );
}
