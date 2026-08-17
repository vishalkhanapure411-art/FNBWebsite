/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@omniops/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    // Proxy all /api/* browser requests server-side to the NestJS API on :4000.
    // This keeps the owner's browser talking only to port 3000 — no localhost:4000 leaks.
    // /socket.io/* is proxied too so KDS/CDS real-time (long-polling transport) works
    // through port 3000; Next rewrites do NOT proxy WebSocket upgrades, so the web
    // client forces the 'polling' transport (see kds/cds pages).
    // Note: Next normalizes '/socket.io/' -> '/socket.io' (308) before proxying, and
    // engine.io requires the trailing slash, so the bare path is forwarded WITH it.
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
      {
        // Client pitch deck lives in public/pitch/ (static). Next does not serve
        // directory indexes, so map bare /pitch -> public/pitch.html (same deck).
        source: '/pitch',
        destination: '/pitch.html',
      },
      {
        source: '/socket.io',
        destination: 'http://localhost:4000/socket.io/',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:4000/socket.io/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
