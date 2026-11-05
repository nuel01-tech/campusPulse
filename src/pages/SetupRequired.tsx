export function SetupRequired() {
  return (
    <main className="container narrow center-page">
      <h1>Almost there</h1>
      <p>
        The app needs a Supabase project. Copy <code>.env.example</code> to <code>.env.local</code>, fill in{' '}
        <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
      </p>
      <p className="muted">See README.md for the full setup steps.</p>
    </main>
  );
}
