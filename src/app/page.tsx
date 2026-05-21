import Link from 'next/link';
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Coffee,
  ExternalLink,
  HeartHandshake,
  Radio,
  Sparkles,
} from 'lucide-react';

const apps = [
  {
    title: 'Summer Camp & Activity Planner',
    description: 'Plan camp weeks, track budgets and deadlines, and match kids to eligible activities.',
    href: '/camp-planner',
    status: 'Ready',
    accent: 'var(--accent-sage)',
    icon: CalendarRange,
    details: ['Week matrix', 'Budget tracking', 'Age and grade warnings'],
  },
  {
    title: 'Pop Trend Cheatsheet',
    description: 'Decode playground slang, games, collectibles, and pop-culture signals without doom-scrolling.',
    href: '/pop-trends',
    status: 'New',
    accent: 'var(--accent-terracotta)',
    icon: Radio,
    details: ['Trend cards', 'Parent translations', 'Local notes'],
  },
];

const upcomingApps = [
  'Family logistics dashboard',
  'School paperwork tracker',
  'Meal and lunchbox planner',
];

export default function ToolkitHome() {
  return (
    <main className="sp-app-shell sp-variant-fun">
      <div className="container py-8">
      <header
        className="mb-6"
        style={{
          borderBottom: '3px solid var(--ink)',
          paddingBottom: '1.25rem',
        }}
      >
        <div className="flex align-center gap-3 mb-4">
          <div
            style={{
              backgroundColor: 'var(--app-accent)',
              color: 'var(--ink)',
              padding: '0.65rem',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              border: '3px solid var(--ink)',
              boxShadow: '4px 4px 0 var(--ink)',
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Super Parent Toolkit</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              A growing set of practical tools for planning, decisions, and family operations.
            </p>
          </div>
        </div>
      </header>

      <section
        className="mb-6"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)',
          gap: '1.5rem',
          alignItems: 'stretch',
        }}
      >
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="flex align-center gap-2 mb-4" style={{ color: 'var(--text-primary)', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.04em' }}>
              <HeartHandshake size={18} />
              Toolkit home
            </div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>
              One calm place for the parent systems that usually live in scattered notes.
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '680px' }}>
              Start with the camp planner, then add more small apps as the toolkit grows.
              Each app should be useful on its own, but designed to feel like part of the same parent command center.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" style={{ marginTop: '1.5rem' }}>
            <span className="badge badge-booked">Local-first</span>
            <span className="badge badge-idea">Planning tools</span>
            <span className="badge badge-waitlisted">Vibe coded</span>
          </div>
        </div>

        <aside className="glass-card">
          <div className="flex justify-between align-start gap-3 mb-4">
            <div className="flex align-center gap-2">
              <ClipboardList size={18} style={{ color: 'var(--accent-slate)' }} />
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Next Toolkit Ideas</h3>
            </div>
            <a
              href="https://ko-fi.com/cannedkalle"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.7rem', whiteSpace: 'nowrap' }}
            >
              <Coffee size={14} />
              Support
              <ExternalLink size={13} />
            </a>
          </div>
          <div className="flex flex-col gap-2">
            {upcomingApps.map((app) => (
              <div
                key={app}
                className="flex align-center gap-2"
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  padding: '0.45rem 0',
                  borderBottom: '1px solid rgba(45, 43, 42, 0.06)',
                }}
              >
                <CheckCircle2 size={15} style={{ color: 'var(--accent-sage)', flexShrink: 0 }} />
                {app}
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section>
        <div className="flex justify-between align-center mb-4">
          <h2 style={{ fontSize: '1.35rem' }}>Apps</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{apps.length} active</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.href}
                href={app.href}
                className="glass-card glass-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  minHeight: '260px',
                  borderLeft: `5px solid ${app.accent}`,
                }}
              >
                <div className="flex justify-between align-start gap-3">
                  <div
                    style={{
                      backgroundColor: app.accent,
                      color: app.accent,
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'inline-flex',
                      border: '2px solid var(--ink)',
                    }}
                  >
                    <Icon size={24} style={{ color: app.href === '/pop-trends' ? '#FFFFFF' : '#FFFFFF' }} />
                  </div>
                  <span className="badge badge-booked">{app.status}</span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{app.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{app.description}</p>
                </div>

                <div className="flex flex-wrap gap-2" style={{ marginTop: 'auto' }}>
                  {app.details.map((detail) => (
                    <span
                      key={detail}
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                        border: '2px solid var(--ink)',
                        borderRadius: 'var(--radius-full)',
                        padding: '0.25rem 0.55rem',
                        backgroundColor: 'var(--surface-soft)',
                        fontWeight: 800,
                      }}
                    >
                      {detail}
                    </span>
                  ))}
                </div>

                <div className="flex align-center gap-2" style={{ fontWeight: 700, color: app.accent }}>
                  Open app
                  <ArrowRight size={16} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      </div>
    </main>
  );
}
