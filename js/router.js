// Tiny hash router: '#/subject/physics' -> handler('subject', ['physics'])
const routes = [];
export function route(pattern, handler) { routes.push({ pattern, handler }); }
export function navigate(hash) { location.hash = hash; }
export function parse() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  return { parts, query };
}
export function start(render) {
  const run = () => {
    const { parts, query } = parse();
    const name = parts[0] || 'home';
    const r = routes.find((x) => x.pattern === name) || routes.find((x) => x.pattern === '*');
    render(() => r.handler(parts.slice(1), query), name);
  };
  window.addEventListener('hashchange', run);
  run();
}
