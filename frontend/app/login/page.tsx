'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await authApi.login(form);
      setAuth(data.user, data.token);
      router.push('/chat');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo">V</span>
          <h1>Velo</h1>
        </div>
        <p className="auth-sub">Sign in to continue</p>
        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label>Email</label>
            <input
              type="email" required autoComplete="email"
              value={form.email}
              onChange={f('email')}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password" required autoComplete="current-password"
              value={form.password}
              onChange={f('password')}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          No account? <Link href="/register">Create one</Link>
        </p>
      </div>
      <style jsx>{`
        .auth-page {
          height: 100vh; display: flex; align-items: center; justify-content: center;
          background: var(--bg);
          background-image: radial-gradient(ellipse 60% 50% at 50% -10%, rgba(124,106,247,0.12) 0%, transparent 70%);
        }
        .auth-card {
          width: 380px; padding: 40px;
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 20px;
          animation: fadeUp 0.5s both;
        }
        .auth-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .auth-logo {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--accent); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px;
        }
        h1 { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 22px; }
        .auth-sub { color: var(--text2); font-size: 14px; margin-bottom: 28px; }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        label { font-size: 13px; font-weight: 500; color: var(--text2); }
        input {
          background: var(--bg3); border: 1px solid var(--border);
          border-radius: 10px; padding: 10px 14px;
          color: var(--text); font-size: 14px; font-family: inherit;
          transition: border-color 0.2s;
          outline: none;
        }
        input:focus { border-color: var(--accent); }
        input::placeholder { color: var(--text3); }
        .auth-error {
          font-size: 13px; color: var(--red);
          background: rgba(248,113,113,0.08); border-radius: 8px; padding: 8px 12px;
        }
        .btn-primary {
          background: var(--accent); color: #fff; border: none;
          padding: 11px; border-radius: 10px; font-size: 14px; font-weight: 500;
          cursor: pointer; font-family: inherit;
          transition: opacity 0.2s, transform 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-primary:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .auth-switch { margin-top: 20px; text-align: center; font-size: 13px; color: var(--text2); }
        .auth-switch a { color: var(--accent2); text-decoration: none; font-weight: 500; }
        .auth-switch a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
