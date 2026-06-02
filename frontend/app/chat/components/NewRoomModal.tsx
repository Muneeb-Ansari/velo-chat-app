'use client';
import { useState, useEffect, useRef } from 'react';
import { roomsApi, usersApi } from '@/lib/api';
import { useChatStore } from '@/store/chat';
import { User } from '@/lib/types';
import { Avatar } from './Avatar';

interface Props { onClose: () => void; }

export function NewRoomModal({ onClose }: Props) {
  const addRoom = useChatStore((s) => s.addRoom);
  const setActiveRoom = useChatStore((s) => s.setActiveRoom);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'group' | 'direct'>('group');
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(searchRef.current);
    if (memberSearch.length < 2) { setSearchResults([]); return; }
    searchRef.current = setTimeout(async () => {
      const { data } = await usersApi.search(memberSearch as string);
      setSearchResults(data.users.filter((u: User) => !selected.find((s) => s.id === u.id)));
    }, 300);
  }, [memberSearch, selected]);

  const toggle = (u: User) => {
    setSelected((prev) => prev.find((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u]);
    setMemberSearch('');
    setSearchResults([]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && type === 'group') { setError('Room name is required'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await roomsApi.create({
        name: type === 'direct' ? selected[0]?.username || name : name.trim(),
        description: desc.trim() || undefined,
        type,
        memberIds: selected.map((u) => u.id),
      });
      addRoom(data.room);
      setActiveRoom(data.room.id);
      onClose();
    } catch (err: any) {
      const apiError = err.response?.data?.error;

      let msg = 'Failed to create room';

      if (typeof apiError === 'string') {
        msg = apiError;
      } else if (apiError?.message) {
        msg = apiError.message;
      } else if (err.message) {
        msg = err.message;
      }

      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>New room</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Type toggle */}
        <div className="type-toggle">
          {(['group', 'direct'] as const).map((t) => (
            <button key={t} className={`type-btn ${type === t ? 'active' : ''}`}
              onClick={() => setType(t)}>
              {t === 'group' ? '# Group' : '💬 Direct'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="modal-form">
          {type === 'group' && (
            <>
              <div className="field">
                <label>Room name</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. general" maxLength={100} required />
              </div>
              <div className="field">
                <label>Description <span className="opt">(optional)</span></label>
                <input value={desc} onChange={(e) => setDesc(e.target.value)}
                  placeholder="What's this room for?" maxLength={500} />
              </div>
            </>
          )}

          <div className="field">
            <label>Add members</label>
            <div className="member-input-wrap">
              {selected.map((u) => (
                <span key={u.id} className="member-chip">
                  <Avatar username={u.username} size={18} />
                  {u.username}
                  <button type="button" onClick={() => toggle(u)}>×</button>
                </span>
              ))}
              <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                placeholder={selected.length ? '' : 'Search by username…'} />
            </div>
            {searchResults.length > 0 && (
              <div className="search-drop">
                {searchResults.map((u) => (
                  <button key={u.id} type="button" className="search-result" onClick={() => toggle(u)}>
                    <Avatar username={u.username} avatarUrl={u.avatarUrl} isOnline={u.isOnline} size={28} />
                    <div>
                      <span className="res-name">{u.username}</span>
                      <span className="res-status">{u.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create room'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center;
          z-index: 100; animation: fadeIn 0.15s both;
        }
        .modal {
          width: 420px; background: var(--bg2); border: 1px solid var(--border2);
          border-radius: 18px; padding: 24px;
          animation: fadeUp 0.2s both; max-height: 90vh; overflow-y: auto;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
        }
        h2 { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 18px; }
        .close-btn {
          width: 28px; height: 28px; border-radius: 8px;
          background: var(--bg3); border: 1px solid var(--border);
          color: var(--text2); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .close-btn:hover { background: var(--bg4); color: var(--text); }
        .type-toggle { display: flex; gap: 6px; margin-bottom: 20px; }
        .type-btn {
          flex: 1; padding: 8px; border-radius: 10px; border: 1px solid var(--border);
          background: var(--bg3); color: var(--text2); cursor: pointer;
          font-family: inherit; font-size: 13px; font-weight: 500;
          transition: all 0.15s;
        }
        .type-btn.active { background: var(--accent-glow); border-color: var(--accent); color: var(--text); }
        .modal-form { display: flex; flex-direction: column; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; position: relative; }
        label { font-size: 13px; font-weight: 500; color: var(--text2); }
        .opt { font-weight: 400; color: var(--text3); }
        input {
          background: var(--bg3); border: 1px solid var(--border);
          border-radius: 10px; padding: 10px 14px;
          color: var(--text); font-size: 14px; font-family: inherit; outline: none;
          transition: border-color 0.2s;
        }
        input:focus { border-color: var(--accent); }
        input::placeholder { color: var(--text3); }
        .member-input-wrap {
          background: var(--bg3); border: 1px solid var(--border);
          border-radius: 10px; padding: 7px 10px;
          display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
          transition: border-color 0.2s; min-height: 42px;
        }
        .member-input-wrap:focus-within { border-color: var(--accent); }
        .member-input-wrap input {
          background: none; border: none; padding: 2px; flex: 1; min-width: 100px; font-size: 14px;
        }
        .member-input-wrap input:focus { border: none; }
        .member-chip {
          display: flex; align-items: center; gap: 5px;
          background: var(--accent-glow); border: 1px solid var(--accent);
          border-radius: 20px; padding: 2px 8px 2px 4px;
          font-size: 12px; color: var(--accent2); font-weight: 500;
        }
        .member-chip button {
          background: none; border: none; color: var(--accent2); cursor: pointer; font-size: 14px; line-height: 1; padding: 0;
        }
        .search-drop {
          position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
          background: var(--bg2); border: 1px solid var(--border2);
          border-radius: 12px; overflow: hidden; margin-top: 4px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          animation: fadeUp 0.15s both;
        }
        .search-result {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border: none; background: none;
          color: var(--text); cursor: pointer; font-family: inherit; text-align: left;
          transition: background 0.1s;
        }
        .search-result:hover { background: var(--bg3); }
        .res-name { display: block; font-size: 13px; font-weight: 500; }
        .res-status { display: block; font-size: 11px; color: var(--text3); }
        .modal-error {
          font-size: 13px; color: var(--red);
          background: rgba(248,113,113,0.08); border-radius: 8px; padding: 8px 12px;
        }
        .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
        .btn-ghost {
          padding: 9px 16px; border-radius: 10px; border: 1px solid var(--border);
          background: none; color: var(--text2); cursor: pointer;
          font-family: inherit; font-size: 14px; transition: all 0.15s;
        }
        .btn-ghost:hover { background: var(--bg3); color: var(--text); }
        .btn-primary {
          padding: 9px 20px; border-radius: 10px; border: none;
          background: var(--accent); color: #fff; cursor: pointer;
          font-family: inherit; font-size: 14px; font-weight: 500;
          transition: opacity 0.15s; display: flex; align-items: center; gap: 6px;
        }
        .btn-primary:hover:not(:disabled) { opacity: 0.88; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinner {
          width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      `}</style>
    </div>
  );
}
