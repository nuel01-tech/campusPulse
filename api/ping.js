/**
 * Serverless keep-alive endpoint (`/api/ping`).
 *
 * Point UptimeRobot or cron-job.org at `https://<your-domain>/api/ping` with a
 * standard GET request. This endpoint executes `public.ping()` inside Postgres
 * so Supabase registers database activity and never pauses on the free tier.
 */
export default async function handler(_req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    res.status(500).json({ ok: false, error: 'Missing Supabase environment variables' });
    return;
  }

  try {
    const response = await fetch(`${url}/rest/v1/rpc/ping`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!response.ok) {
      res.status(502).json({ ok: false, status: response.status });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}
