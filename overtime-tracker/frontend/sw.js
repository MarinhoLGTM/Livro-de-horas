// Sobe este número sempre que fizeres uma mudança grande no frontend,
// como reforço extra (a estratégia abaixo já resolve isso sozinha na maioria dos casos).
const CACHE_NAME = 'livro-de-horas-v2';
const ARQUIVOS_ESTATICOS = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_ESTATICOS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((c) => c !== CACHE_NAME).map((c) => caches.delete(c)))
    )
  );
  self.clients.claim();
});

// Estratégia "rede primeiro": tenta sempre buscar a versão mais nova.
// Só usa o cache se estiveres offline. Assim, updates aparecem automaticamente.
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return; // nunca cachear chamadas à API

  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return resposta;
      })
      .catch(() => caches.match(event.request))
  );
});
