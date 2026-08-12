# Livro de Horas

App pessoal de controlo de horas normais e horas extras, com cálculo automático
conforme as regras do teu trabalho, período de folha 20-20 para extras, mês de
calendário para horas normais/vale alimentação, exportação em PDF e Excel, e
funcionamento como PWA (instalável no celular).

## Estrutura

```
overtime-tracker/
  backend/    -> API Node.js + Express
  frontend/   -> App web (servida pelo próprio backend)
```

---

## Parte 1 — Testar localmente (opcional, mas recomendado antes do deploy)

### 1. Criar a base de dados no Supabase

1. Cria uma conta em https://supabase.com (grátis)
2. Cria um novo projeto (escolhe uma senha forte para o banco — vais precisar dela)
3. No menu lateral, vai em **SQL Editor** → cola o conteúdo do arquivo
   `backend/schema.sql` → executa (Run)
4. Vai em **Project Settings → Database → Connection string → URI** e copia
   a connection string (algo como
   `postgresql://postgres:[SENHA]@db.xxxxx.supabase.co:5432/postgres`)

### 2. Configurar o backend

```bash
cd backend
cp .env.example .env
```

Edita o `.env` e preenche:
- `DATABASE_URL` → a connection string do Supabase (com a tua senha)
- `APP_PASSWORD` → a senha que tu vais usar pra entrar na app
- `JWT_SECRET` → qualquer texto longo e aleatório (ex: gera em
  https://randomkeygen.com)

### 3. Instalar e rodar

```bash
npm install
npm start
```

Abre `http://localhost:3000` no navegador. Pronto, já dá pra usar no PC.

Pra testar no celular **na mesma rede Wi-Fi**: descobre o IP local do teu PC
(`ipconfig` no Windows, `ifconfig` ou `ip a` no Mac/Linux — algo tipo
`192.168.1.x`) e abre `http://192.168.1.x:3000` no navegador do celular.

---

## Parte 2 — Deploy definitivo (acesso de qualquer lugar)

### 1. Subir o código para o GitHub

Se ainda não tens um repositório:
```bash
cd overtime-tracker
git init
git add .
git commit -m "Primeira versão do Livro de Horas"
```
Cria um repositório novo no GitHub e segue as instruções para dar `git push`.

**Importante:** o arquivo `.env` NÃO deve ir para o GitHub (contém senhas).
Cria um arquivo `.gitignore` dentro de `backend/` com o conteúdo:
```
node_modules
.env
```

### 2. Deploy no Render

1. Cria uma conta em https://render.com (grátis, dá pra logar com GitHub)
2. **New → Web Service** → conecta o teu repositório do GitHub
3. Configura:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Em **Environment Variables**, adiciona as mesmas três variáveis do `.env`:
   - `DATABASE_URL`
   - `APP_PASSWORD`
   - `JWT_SECRET`
5. Clica em **Deploy**

Depois de alguns minutos, o Render te dá um link tipo
`https://livro-de-horas.onrender.com` — esse é o link que usas tanto no PC
quanto no celular (podes até adicionar à tela inicial do celular, como um
app de verdade, graças ao PWA).

**Nota sobre o plano gratuito do Render:** o servidor "dorme" depois de um
tempo sem uso e demora uns 30-50 segundos para acordar no primeiro acesso do
dia. Isso é normal no plano free — não é bug.

---

## Regras de cálculo implementadas

- Jornada padrão: 8h/dia
- Dia normal: até 8h = hora normal. 1ª hora extra +50%, 2ª hora extra +75%,
  da 3ª em diante +100%
- Sábado/feriado: toda hora trabalhada é +100%, desde a primeira
- Horas extras são agrupadas pelo período de folha (dia 20 a dia 20)
- Horas normais, dias trabalhados e vale alimentação (10,46€/dia por
  omissão, editável) são agrupados pelo mês de calendário
- Valor da hora e do vale alimentação são editáveis nas Configurações (⚙),
  sem afetar registos já lançados anteriormente
