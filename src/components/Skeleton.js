export function SkeletonCard() {
  return (
    <div className="annonce-card" style={{ pointerEvents: 'none' }}>
      <div className="card-img-wrap skeleton-pulse" style={{ background: '#e0ddd5' }} />
      <div className="card-body" style={{ gap: 10 }}>
        <div className="skeleton-pulse" style={{ width: 80, height: 20, borderRadius: 100 }} />
        <div className="skeleton-pulse" style={{ width: '90%', height: 16, borderRadius: 6 }} />
        <div className="skeleton-pulse" style={{ width: '70%', height: 14, borderRadius: 6 }} />
        <div className="skeleton-pulse" style={{ width: 100, height: 22, borderRadius: 6, marginTop: 6 }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <div className="skeleton-pulse" style={{ width: 90, height: 12, borderRadius: 6 }} />
          <div className="skeleton-pulse" style={{ width: 70, height: 12, borderRadius: 6 }} />
        </div>
      </div>
      <div className="card-footer-line">
        <div className="skeleton-pulse" style={{ flex: 1, height: 34, borderRadius: 9 }} />
      </div>
    </div>
  );
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="cards-grid">
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="stats-grid">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="stat-card">
          <div className="skeleton-pulse" style={{ width: '50%', height: 32, borderRadius: 6, margin: '0 auto 8px' }} />
          <div className="skeleton-pulse" style={{ width: '70%', height: 14, borderRadius: 6, margin: '0 auto' }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="skeleton-pulse" style={{ height: 20, width: '100%', borderRadius: 6 }} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, padding: '8px 0' }}>
          <div className="skeleton-pulse" style={{ flex: 2, height: 14, borderRadius: 6 }} />
          <div className="skeleton-pulse" style={{ flex: 1, height: 14, borderRadius: 6 }} />
          <div className="skeleton-pulse" style={{ flex: 1, height: 14, borderRadius: 6 }} />
          <div className="skeleton-pulse" style={{ width: 80, height: 14, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="profile-banner">
      <div className="skeleton-pulse" style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton-pulse" style={{ width: 180, height: 22, borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton-pulse" style={{ width: 240, height: 14, borderRadius: 6, marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skeleton-pulse" style={{ width: 80, height: 24, borderRadius: 100 }} />
          <div className="skeleton-pulse" style={{ width: 120, height: 24, borderRadius: 100 }} />
        </div>
      </div>
    </div>
  );
}
