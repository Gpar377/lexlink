'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import Navbar from '@/components/Navbar';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            login(data.user, data.token);
            router.push('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    return (
        <>
            <Navbar />
            <div className="auth-page">
                <div className="auth-card fade-in">
                    <h1>Welcome Back</h1>
                    <p className="subtitle">Sign in to continue your legal journey</p>

                    {error && <div className="disclaimer" style={{ marginBottom: 16, borderColor: 'var(--danger)', color: '#f87171' }}>{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Email</label>
                            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                        </div>
                        <div className="input-group">
                            <label>Password</label>
                            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
                        Don&apos;t have an account? <Link href="/register">Register here</Link>
                    </p>

                    <div className="disclaimer" style={{ marginTop: 20 }}>
                        <strong>Demo Accounts:</strong><br />
                        Citizen: rahul@example.com / password123<br />
                        Lawyer: meera@example.com / password123
                    </div>
                </div>
            </div>
        </>
    );
}

export default function LoginPage() {
    return <LoginForm />;
}
