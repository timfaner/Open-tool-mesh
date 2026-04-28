export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#07111F',
        color: '#E6EEF8',
        fontFamily: 'var(--font-ui), sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, opacity: 0.72 }}>OpenTool Mesh</p>
        <h1 style={{ margin: '12px 0 0', fontFamily: 'var(--font-display), sans-serif' }}>Page not found</h1>
      </div>
    </main>
  );
}
