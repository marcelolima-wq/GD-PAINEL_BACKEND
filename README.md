# GD-PAINEL_BACKEND

API de autenticação do GD Painel, preparada para Vercel Functions.

## Estrutura

```text
api/
  auth/login.js
  auth/session.js
  auth/logout.js
  health.js
lib/auth.js
scripts/hash-password.mjs
```

## Segurança

- JWT HS256 com expiração de 8 horas.
- Cookie `HttpOnly`, `SameSite=Strict` e `Secure` em produção.
- Senha armazenada como hash `scrypt`.
- Segredos mantidos em variáveis de ambiente.

## Configuração

1. Instale Node.js 20 ou superior.
2. Execute `npm install` dentro de `backend/`.
3. Gere o hash da senha com `APP_PASSWORD` definido e execute `npm run hash-password`.
4. Copie `.env.example` para `.env.local` e preencha as variáveis.
5. Execute `npm run dev`.

## Vercel

Crie um projeto no Vercel usando este repositório e configure **Root Directory** como `backend`. Cadastre `AUTH_EMAIL`, `APP_PASSWORD_HASH` e `JWT_SECRET` nos ambientes Production, Preview e Development.

Para habilitar o login corporativo pelo Google, crie um cliente OAuth 2.0 do tipo Aplicativo da Web no Google Cloud, autorize a origem `https://gd-painel-frontend.vercel.app` e configure `GOOGLE_CLIENT_ID` e `GOOGLE_ALLOWED_DOMAIN=granddos.tech` no backend. O client ID é público; nenhum client secret é usado ou enviado ao navegador.

Contas Google com `email_verified=true` e claim `hd=granddos.tech` são criadas no Redis no primeiro acesso. Quando já existe uma conta local com o mesmo e-mail, o provedor Google é vinculado automaticamente ao mesmo cadastro.

Depois de publicar, anote a URL do backend. O frontend precisará encaminhar `/api/*` para essa URL para manter a autenticação no mesmo domínio do navegador.
