'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import Navbar from '@/components/Navbar';

function DashboardContent() {
    const { user, authFetch, loading: authLoading } = useAuth();
    const toast = useToast();
    const [cases, setCases] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push('/login'); return; }
        loadData();
    }, [user, authLoading]);

    const loadData = async () => {
        try {
            const casesRes = await authFetch('/api/cases');
            if (casesRes.ok) {
                const data = await casesRes.json();
                setCases(data.cases || []);
            }
            if (user.role === 'LAWYER') {
                const assignRes = await authFetch('/api/lawyers/assignments');
                if (assignRes.ok) {
                    const data = await assignRes.json();
                    setAssignments(data.assignments || []);
                }
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const getStatusBadge = (status) => {
        const map = { OPEN: 'badge-open', NEEDS_LAWYER: 'badge-urgent', IN_PROGRESS: 'badge-in-progress', RESOLVED: 'badge-resolved', CLOSED: 'badge-closed' };
        return map[status] || 'badge-open';
    };

    if (authLoading || !user) return <div className="flex-center" style={{ minHeight: '100vh' }}><div className="spinner"></div></div>;

    return (
        <>
            <Navbar />
            <div className="container page fade-in">
                <div className="flex-between" style={{ marginBottom: 30 }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800 }}>
                            {user.role === 'CITIZEN' ? '👤' : '⚖️'} {user.name}&apos;s Dashboard
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                            {user.role === 'CITIZEN'
                                ? 'Track your cases, chat with AI, and manage legal matters'
                                : 'View assigned cases, respond to clients, and manage your practice'}
                        </p>
                    </div>
                    {user.role === 'CITIZEN' && (
                        <Link href="/cases/new" className="btn btn-primary">+ New Case</Link>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-4" style={{ marginBottom: 30 }}>
                    <div className="stat-card">
                        <div className="stat-num">{cases.length}</div>
                        <div className="stat-label">{user.role === 'CITIZEN' ? 'My Cases' : 'Accessible Cases'}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-num">{cases.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length}</div>
                        <div className="stat-label">Active</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-num">{cases.filter(c => c.status === 'RESOLVED').length}</div>
                        <div className="stat-label">Resolved</div>
                    </div>
                    {user.role === 'LAWYER' ? (
                        <div className="stat-card">
                            <div className="stat-num">{assignments.filter(a => a.status === 'PENDING').length}</div>
                            <div className="stat-label">Pending Requests</div>
                        </div>
                    ) : (
                        <div className="stat-card">
                            <div className="stat-num">{cases.filter(c => c.isUrgent).length}</div>
                            <div className="stat-label">Urgent</div>
                        </div>
                    )}
                </div>

                {/* Pending Assignments for Lawyers */}
                {user.role === 'LAWYER' && assignments.filter(a => a.status === 'PENDING').length > 0 && (
                    <div style={{ marginBottom: 30 }}>
                        <h2 style={{ fontSize: 20, marginBottom: 16 }}>📩 Pending Case Requests</h2>
                        <div className="grid grid-2">
                            {assignments.filter(a => a.status === 'PENDING').map(a => (
                                <div key={a.id} className="card" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
                                    <div className="flex-between" style={{ marginBottom: 8 }}>
                                        <span className="badge badge-pending">Pending</span>
                                        <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{a.roleType}</span>
                                    </div>
                                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{a.case?.title || 'Case'}</h3>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0' }}>
                                        {a.case?.category?.name} • {a.case?.stateOfIncident}
                                    </p>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                        <button className="btn btn-sm btn-success" onClick={async () => {
                                            const res = await authFetch('/api/lawyers/assignments', {
                                                method: 'PUT', body: JSON.stringify({ assignmentId: a.id, action: 'ACCEPTED' })
                                            });
                                            res.ok ? toast.success('Case accepted!') : toast.error('Failed to accept');
                                            loadData();
                                        }}>Accept</button>
                                        <button className="btn btn-sm btn-danger" onClick={async () => {
                                            const res = await authFetch('/api/lawyers/assignments', {
                                                method: 'PUT', body: JSON.stringify({ assignmentId: a.id, action: 'REJECTED' })
                                            });
                                            res.ok ? toast.info('Assignment rejected') : toast.error('Failed to reject');
                                            loadData();
                                        }}>Reject</button>
                                        <Link href={`/cases/${a.caseId}`} className="btn btn-sm btn-outline">View Case</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Cases */}
                <h2 style={{ fontSize: 20, marginBottom: 16 }}>
                    {user.role === 'CITIZEN' ? '📁 My Cases' : '📁 Assigned Cases'}
                </h2>

                {loading ? (
                    <div className="flex-center" style={{ padding: 60 }}><div className="spinner"></div></div>
                ) : cases.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">📂</div>
                        <h3>No cases yet</h3>
                        <p>{user.role === 'CITIZEN' ? "Create your first case to get AI-powered legal guidance" : "You haven't been assigned to any cases yet"}</p>
                        {user.role === 'CITIZEN' && <Link href="/cases/new" className="btn btn-primary" style={{ marginTop: 16 }}>Create First Case</Link>}
                    </div>
                ) : (
                    <div className="grid grid-2">
                        {cases.map(c => (
                            <Link href={`/cases/${c.id}`} key={c.id} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="flex-between" style={{ marginBottom: 8 }}>
                                    <span className={`badge ${getStatusBadge(c.status)}`}>{c.status.replace('_', ' ')}</span>
                                    {c.isUrgent && <span className="badge badge-urgent">🔴 URGENT</span>}
                                </div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{c.title}</h3>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, color: 'var(--accent)' }}>
                                        {c.category?.icon} {c.category?.name}
                                    </span>
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    {c.description?.substring(0, 120)}...
                                </p>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                                    📍 {c.stateOfIncident}{c.city ? `, ${c.city}` : ''} • {new Date(c.createdAt).toLocaleDateString('en-IN')}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

export default function DashboardPage() {
    return <DashboardContent />;
}
