// Re-block Twitter and Reddit when a 15-minute break runs out, also after a restart
// (lib/breaks.js). Runs once per server process.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { sync } = await import('./lib/breaks.js')
  const tick = () => sync().catch(e => console.error('[breaks]', e.message))
  tick()
  setInterval(tick, 30_000)
}
