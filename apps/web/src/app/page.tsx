import { redirect } from 'next/navigation';

// Owner request: the login page is the default landing view.
// Redirect (server-side) to /login so the login form is the single source
// of truth — no duplicated landing/login markup at the root.
// force-dynamic: without it Next statically prerenders this page and the 307
// comes back WITHOUT a Location header (a browser cannot follow it). Dynamic
// rendering makes Next emit a proper 307 + Location: /login on every request.
export const dynamic = 'force-dynamic';
export default function HomePage() {
  redirect('/login');
}
