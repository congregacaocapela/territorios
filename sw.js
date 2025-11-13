// Define o nome do cache
const CACHE_NAME = 'territorios-cache-v1';

// Lista de arquivos essenciais (o "App Shell") para salvar no cache
const urlsToCache = [
  'portaldeterritorios.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
  // Não cacheamos os ícones ou imagens de território aqui,
  // pois eles são muitos ou podem mudar. O cache normal do navegador cuidará deles.
];

// Evento de Instalação: Salva os arquivos do App Shell no cache
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto. Adicionando App Shell.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: App Shell cacheado com sucesso.');
      })
      .catch(error => {
        console.error('Service Worker: Falha ao cachear o App Shell.', error);
      })
  );
});

// Evento de Fetch: Responde com o cache primeiro (Cache First)
self.addEventListener('fetch', event => {
  event.respondWith(
    // Tenta encontrar o recurso no cache
    caches.match(event.request)
      .then(cachedResponse => {
        // Se encontrar no cache, retorna o recurso cacheado
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Se não encontrar, busca na rede
        return fetch(event.request);
      })
  );
});

// Evento de Ativação: Limpa caches antigos (opcional, mas boa prática)
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Se o cache não estiver na lista de permissões, delete-o
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});