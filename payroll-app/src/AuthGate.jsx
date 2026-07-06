import { useState } from 'react';

// Lightweight client-side gate — blocks casual/search-engine access to the
// public GitHub Pages URL. Not real security: credentials ship in the JS bundle.
const USERNAME = 'admin';
const PASSWORD = 'jubs1234';
const AUTH_KEY = 'tdm-payroll-auth:v1';

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === 'true');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (authed) return children;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === USERNAME && password === PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true');
      setAuthed(true);
    } else {
      setError('Incorrect username or password');
    }
  };

  return (
    <div
      className="min-h-screen bg-[#4C5C4A] flex items-center justify-center p-4"
      style={{ fontFamily: '"Montserrat", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[#3F4D3E] border border-[#3D4A3B] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-[#2A362A]">T</div>
          <div>
            <div className="font-semibold tracking-tight text-[15px] text-[#F5F5F0]">TDM Payroll Hub</div>
            <div className="text-xs text-[#96A093]">Sign in to continue</div>
          </div>
        </div>

        <label className="block mb-3">
          <div className="text-[11px] text-[#96A093] mb-1">Username</div>
          <input value={username} onChange={e => setUsername(e.target.value)} autoFocus
            className="w-full bg-[#4C5C4A] border border-[#3D4A3B] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-amber-500/50" />
        </label>

        <label className="block mb-4">
          <div className="text-[11px] text-[#96A093] mb-1">Password</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#4C5C4A] border border-[#3D4A3B] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-amber-500/50" />
        </label>

        {error && <div className="text-xs text-red-400 mb-4">{error}</div>}

        <button type="submit"
          className="w-full bg-amber-500 hover:bg-amber-400 text-[#2A362A] text-sm font-medium px-3 py-2.5 rounded-lg transition">
          Sign In
        </button>
      </form>
    </div>
  );
}
