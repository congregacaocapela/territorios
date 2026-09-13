# Territórios v2

Nova versão do portal de territórios, construída com React, TypeScript e Vite. A aplicação substitui as dezenas de páginas HTML repetidas por rotas dinâmicas, mantendo os dois bancos Firestore e os dados no formato em que já existem.

## O que foi preservado

- Os projetos e as coleções Firestore originais não foram migrados, apagados ou renomeados.
- O banco de territórios continua usando a coleção `territories`.
- O painel continua usando `appState` e `assignmentHistory`.
- Status de casas, casas DND, quadras, ruas, links, mapas, designações, histórico, publicadores e registros S-13 continuam compatíveis.
- Os 50 mapas em imagem foram copiados para `public/territories`.
- Os endereços antigos (`territorio_N.html`, `portaldeterritorios.html` etc.) redirecionam para as rotas novas.

Um snapshot de segurança foi criado em `.local-backups`. Essa pasta e o arquivo `.env.local` estão ignorados pelo Git para não publicar dados ou configurações privadas.

## Estrutura

```text
territorios/
├── public/territories/      mapas estáticos existentes
├── scripts/                 backup somente leitura do Firestore
├── firebase/                modelos de regras (não publicados automaticamente)
├── src/components/          componentes reutilizáveis
├── src/contexts/            dados do painel em tempo real
├── src/hooks/               consultas de territórios
├── src/lib/                 Firebase, repositórios e utilitários
└── src/pages/               páginas e módulos administrativos
```

## Rodar localmente

Requer Node.js 20.19 ou superior.

```powershell
cd "C:\Users\enipr\Desktop\Pessoal\Codigos e Projetos\Territorio\territorios"
npm install
npm run dev
```

O Vite informa o endereço local no terminal. Para validar a versão de produção:

```powershell
npm run test
npm run build
npm run preview
```

## Variáveis de ambiente

O arquivo `.env.example` documenta as chaves necessárias para os dois projetos Firebase. O `.env.local` desta migração já foi preparado com as configurações encontradas no site antigo e não deve ser versionado.

`VITE_REQUIRE_ADMIN_AUTH=false` mantém temporariamente a mesma disponibilidade do sistema antigo e exibe um aviso no painel. Antes de publicar definitivamente:

1. Ative autenticação anônima no projeto dos territórios.
2. Ative e-mail/senha nos dois projetos Firebase.
3. Crie a mesma conta administrativa nos dois projetos.
4. Atribua a custom claim `admin: true` a essa conta nos dois projetos, usando um ambiente seguro com o Firebase Admin SDK.
5. Revise e publique `firebase/territories.rules` no projeto dos territórios.
6. Revise e publique `firebase/control.rules` no projeto do painel.
7. Troque `VITE_REQUIRE_ADMIN_AUTH` para `true`, gere um novo build e teste o login.

As regras incluídas são modelos seguros para revisão; nenhum deploy de regras foi executado durante a migração.

## Backup do banco

Para gerar outro snapshot somente leitura:

```powershell
npm run backup
```

O comando consulta as coleções conhecidas e grava um JSON datado em `.local-backups`. Guarde uma cópia desse arquivo fora do projeto antes de qualquer futura alteração de estrutura. O backup feito nesta migração contém 50 documentos do banco de territórios e 107 documentos do banco do painel.

## Publicação

`npm run build` cria a pasta `dist`. O servidor escolhido deve redirecionar rotas desconhecidas para `index.html`; o arquivo `public/_redirects` já cobre hospedagens compatíveis com essa convenção.

O service worker é gerado automaticamente. O código essencial entra no cache inicial; as imagens de mapas, que somam mais de 16 MB, só são armazenadas quando o usuário as abre.

### Cloudflare Workers

O projeto inclui `wrangler.jsonc`, scripts de conferência, preview e deploy, além das configurações necessárias para importar o repositório pelo GitHub. Consulte [CLOUDFLARE.md](./CLOUDFLARE.md) antes de publicar.
