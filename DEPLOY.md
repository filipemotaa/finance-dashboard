# Como Hospedar o FinanceApp (Grátis)

Você vai usar 4 serviços gratuitos:
- **GitHub** → guarda o código
- **Neon.tech** → banco de dados PostgreSQL (grátis)
- **Render.com** → hospeda o backend Node.js (grátis)
- **Vercel.com** → hospeda o frontend React (grátis)

Tempo estimado: **30–45 minutos**

---

## PASSO 1 — Instalar o Git e publicar no GitHub

### 1.1 Instalar o Git
1. Acesse https://git-scm.com/download/win
2. Baixe e instale (pode clicar "Next" em tudo)
3. Abra o **Prompt de Comando** (tecla Windows → pesquise "cmd")

### 1.2 Criar conta no GitHub
1. Acesse https://github.com e crie uma conta gratuita
2. Verifique seu e-mail

### 1.3 Criar repositório
1. No GitHub, clique em **"New"** (botão verde)
2. Nome do repositório: `finance-dashboard`
3. Deixe como **Public**
4. Clique em **"Create repository"**

### 1.4 Enviar o código para o GitHub
No Prompt de Comando, navegue até a pasta do projeto e execute:

```
cd "CAMINHO_DA_PASTA\finance-dashboard"
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/finance-dashboard.git
git push -u origin main
```

> Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub.
> Se pedir senha, use um Personal Access Token (GitHub → Settings → Developer Settings → Tokens → Generate new token)

---

## PASSO 2 — Criar o banco de dados (Neon.tech)

1. Acesse https://neon.tech e crie uma conta gratuita
2. Clique em **"Create a project"**
3. Escolha um nome (ex: `finance-db`) e selecione a região mais próxima (ex: `us-east-1`)
4. Clique em **"Create project"**
5. Na tela que abrir, copie a **Connection string** — ela tem este formato:
   ```
   postgresql://usuario:senha@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
6. Guarde essa string — você vai precisar dela nos próximos passos

---

## PASSO 3 — Hospedar o backend (Render.com)

1. Acesse https://render.com e crie uma conta gratuita (pode entrar com o GitHub)
2. No painel, clique em **"New +"** → **"Web Service"**
3. Conecte sua conta do GitHub se ainda não tiver feito
4. Selecione o repositório `finance-dashboard`
5. Configure:
   - **Name:** `finance-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`
6. Role até **"Environment Variables"** e adicione:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (cole a Connection String do Neon aqui) |
   | `JWT_SECRET` | (qualquer texto longo e aleatório, ex: `minhachavesecreta2024financeapp`) |
   | `NODE_ENV` | `production` |

7. Clique em **"Create Web Service"**
8. Aguarde o deploy terminar (2–5 minutos)
9. Anote a URL do serviço — será algo como:
   ```
   https://finance-backend-xxxx.onrender.com
   ```

---

## PASSO 4 — Hospedar o frontend (Vercel.com)

1. Acesse https://vercel.com e crie uma conta gratuita (pode entrar com o GitHub)
2. Clique em **"New Project"**
3. Selecione o repositório `finance-dashboard`
4. Configure:
   - **Root Directory:** clique em "Edit" → selecione `frontend`
   - **Framework Preset:** Vite (deve detectar automaticamente)
5. Abra **"Environment Variables"** e adicione:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://finance-backend-xxxx.onrender.com/api` |

   > Substitua pelo URL real do seu Render (do Passo 3, passo 9)

6. Clique em **"Deploy"**
7. Aguarde (1–3 minutos)
8. Sua URL estará disponível — algo como:
   ```
   https://finance-dashboard-xxxx.vercel.app
   ```

---

## PASSO 5 — Testar

1. Abra o link do Vercel no celular e no computador
2. Cadastre-se com seu e-mail e senha
3. O sistema criará automaticamente as 18 categorias padrão

**Para instalar no celular (PWA):**
- Chrome Android: botão "⋮" → "Adicionar à tela inicial"
- Safari iOS: botão compartilhar → "Adicionar à Tela de Início"

---

## ⚠️ Limitações da versão gratuita

| Serviço | Limitação |
|---------|-----------|
| Render (free) | Backend "dorme" após 15min sem uso. Na próxima visita, demora ~30s para acordar. |
| Neon | 0.5 GB de armazenamento. Para uso pessoal, é mais que suficiente. |
| Vercel | Ilimitado para sites estáticos. Sem limitações práticas. |

---

## Atualizando o app no futuro

Sempre que você quiser atualizar o código, faça no CMD:

```
cd "CAMINHO_DA_PASTA\finance-dashboard"
git add .
git commit -m "minha atualização"
git push
```

Render e Vercel detectarão automaticamente e farão o deploy das mudanças.

---

## Problemas comuns

**Backend não conecta ao banco:**
- Verifique se a `DATABASE_URL` no Render está correta (sem espaços extras)
- A string deve começar com `postgresql://`

**Frontend mostra erro de CORS ou rede:**
- Verifique se a `VITE_API_URL` no Vercel aponta para o URL correto do Render
- Inclua `/api` no final: `https://seu-backend.onrender.com/api`

**Push para o GitHub pede senha:**
- Crie um Personal Access Token em: GitHub → Settings → Developer Settings → Personal access tokens → Tokens (classic) → Generate new token
- Use como senha no lugar da sua senha do GitHub
