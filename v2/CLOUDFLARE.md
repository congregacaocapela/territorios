# Publicar no Cloudflare Workers

Este projeto está preparado para ser publicado como um Worker com Static Assets. Não é necessário criar um servidor Node separado: o Vite gera a pasta `dist` e o Cloudflare entrega esses arquivos globalmente.

## Proteções já aplicadas

- `wrangler.jsonc` aponta para `dist` e habilita o fallback de SPA para o React Router.
- Builds de produção exigem autenticação administrativa por padrão.
- `.env.local` e `.local-backups` não entram no Git.
- O banco continua no Firebase; a publicação no Cloudflare não copia nem migra os dados.
- URLs de preview estão habilitadas.

## Conferência local

```powershell
cd "C:\Users\enipr\Desktop\Pessoal\Codigos e Projetos\Territorio\territorios\v2"
npm ci
npm run test
npm run cf:check
```

`cf:check` gera o build e valida o pacote do Worker sem publicá-lo.

## Opção A — conectar o GitHub no painel do Cloudflare

Envie o repositório ao GitHub. Como a nova aplicação está dentro do repositório antigo, use estas configurações ao importar o projeto em **Workers & Pages**:

| Configuração | Valor |
| --- | --- |
| Nome | `territorios-capela-v2` |
| Branch de produção | `main` (ou a branch principal utilizada) |
| Diretório raiz | `v2` |
| Comando de build | `npm run build` |
| Comando de deploy | `npx wrangler deploy` |
| Deploy de branches não produtivas | `npx wrangler versions upload` |
| Diretório de saída | `dist` |

Se o GitHub receber somente o conteúdo da pasta `v2` como raiz do repositório, deixe **Diretório raiz** vazio.

### Variáveis do build

Cadastre no Cloudflare, em **Settings > Builds > Variables and secrets**, os valores correspondentes ao seu `.env.local`:

```text
VITE_TERRITORIES_API_KEY
VITE_TERRITORIES_AUTH_DOMAIN
VITE_TERRITORIES_PROJECT_ID
VITE_TERRITORIES_STORAGE_BUCKET
VITE_TERRITORIES_MESSAGING_SENDER_ID
VITE_TERRITORIES_APP_ID
VITE_CONTROL_API_KEY
VITE_CONTROL_AUTH_DOMAIN
VITE_CONTROL_PROJECT_ID
VITE_CONTROL_STORAGE_BUCKET
VITE_CONTROL_MESSAGING_SENDER_ID
VITE_CONTROL_APP_ID
VITE_REQUIRE_ADMIN_AUTH=true
NODE_VERSION=22
```

As variáveis `VITE_*` são incorporadas ao JavaScript durante o build. A proteção real dos dados deve estar nas regras do Firestore; não dependa de esconder as chaves de configuração web do Firebase.

## Opção B — publicar manualmente

Na primeira utilização, faça login:

```powershell
npx wrangler login
```

Para gerar uma URL temporária de preview sem promovê-la para produção:

```powershell
npm run cf:preview
```

Para publicar no endereço principal `workers.dev`:

```powershell
npm run cf:deploy
```

Os comandos geram o build antes de enviar os arquivos.

## Firebase antes do acesso público

1. Ative a autenticação anônima no projeto Firebase dos territórios.
2. Ative e-mail/senha e crie a mesma conta administrativa nos dois projetos Firebase.
3. Aplique a custom claim `admin: true` à conta nos dois projetos.
4. Revise e publique `firebase/territories.rules` no projeto dos territórios.
5. Revise e publique `firebase/control.rules` no projeto do painel.
6. Inclua o hostname exato fornecido pelo Cloudflare, por exemplo `territorios-capela-v2.seu-subdominio.workers.dev`, na lista de domínios autorizados dos dois projetos Firebase.

Os modelos de regras não são publicados automaticamente. Para um teste anterior à configuração completa do Firebase, proteja toda a URL de preview com Cloudflare Access; não desative a autenticação administrativa no build público.

## Checklist depois do deploy

- Abrir `/portal` e confirmar os 50 territórios.
- Abrir `/territorio/2` e conferir imagem, quadras e mapa interativo.
- Atualizar a página diretamente em `/territorio/2?quadra=A` para validar o fallback da SPA.
- Entrar em `/admin/painel` e confirmar que a tela de login aparece.
- Testar o login somente depois que a mesma conta existir nos dois projetos Firebase.
