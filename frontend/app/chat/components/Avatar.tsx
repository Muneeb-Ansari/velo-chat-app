'use client';

interface Props {
  username: string;
  avatarUrl?: string;
  isOnline?: boolean;
  size?: number;
}

const colors = [
  '#7c6af7','#f97316','#22d3ee','#4ade80',
  '#f472b6','#facc15','#a78bfa','#34d399',
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

export function Avatar({ username, avatarUrl, isOnline, size = 36 }: Props) {
  const safeName = username || "user";
  const bg = colorFor(safeName);
  const initials = safeName.slice(0, 2).toUpperCase();
  const dotSize = Math.max(8, size * 0.25);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={username}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%', background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.33, fontWeight: 600, color: '#fff',
          fontFamily: "'Syne', sans-serif",
          userSelect: 'none',
        }}>
          {initials}
        </div>
      )}
      {isOnline !== undefined && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0,
          width: dotSize, height: dotSize,
          borderRadius: '50%',
          background: isOnline ? 'var(--green)' : 'var(--text3)',
          border: '2px solid var(--bg2)',
          animation: isOnline ? 'pulse-dot 2s ease-in-out infinite' : 'none',
        }} />
      )}
    </div>
  );
}
