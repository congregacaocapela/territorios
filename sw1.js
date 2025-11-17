const CACHE_NAME = 'territorios-cache-v1';
// Lista de arquivos essenciais para o app funcionar offline
const URLS_TO_CACHE = [
    '.', // Atalho para a 'start_url' (index)
    'paineldecontrole.html',
    'gestaodequadras.html', // Adicionado da barra de navegação
    'manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
];

// Evento de Instalação: Salva os arquivos essenciais no cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto, adicionando URLs principais.');
                // Usamos 'reload' para garantir que estamos pegando os arquivos mais recentes da rede
                // durante a instalação, e não do cache HTTP do navegador.
                return cache.addAll(URLS_TO_CACHE.map(url => new Request(url, { cache: 'reload' })));
            })
    );
});

// Evento de Ativação: Limpa caches antigos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    // Deleta caches que começam com o nosso prefixo, mas não são o cache atual
                    return cacheName.startsWith('territorios-cache-') && cacheName !== CACHE_NAME;
                }).map(cacheName => {
                    console.log('Limpando cache antigo:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

// Evento de Fetch (Busca): Intercepta requisições
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Ignora totalmente as requisições do Firestore (sempre busca na rede)
    if (url.hostname.includes('firestore.googleapis.com')) {
        return event.respondWith(fetch(event.request));
    }

    // Estratégia Cache-First (Primeiro o Cache) para todos os outros
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // 1. Se encontrar no cache, retorna a resposta do cache
                if (cachedResponse) {
                    return cachedResponse;
                }

                // 2. Se não, busca na rede
                return fetch(event.request).then(
                    networkResponse => {
                        // Resposta válida? Clona e armazena no cache para a próxima vez.
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        // Retorna a resposta da rede
                        return networkResponse;
                    }
                ).catch(error => {
                    console.error('Fetch falhou; ', error);
                    // (Opcional) Você poderia retornar uma página de fallback offline aqui
                });
            })
    );
});