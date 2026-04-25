import { SANJI_VERSION } from '@sanji/shared';

export default function App() {
  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '2rem',
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Sanji 🐈</h1>
      <p style={{ color: '#666', marginTop: 0 }}>
        v{SANJI_VERSION} in development. See <code>NEXT_SESSION.md</code> for current state.
      </p>
      <p>
        This shell is a placeholder. Real chat-primary UI lands in week 3 per the spec.
      </p>
    </div>
  );
}
