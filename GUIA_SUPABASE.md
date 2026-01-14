# Guia Rápido: Configurar Supabase

## 📋 O que você precisa

1. **Conta no Supabase** (gratuita)
2. **5 minutos** de tempo
3. **Terminal** para executar comandos

---

## 🚀 Passo a Passo

### 1. Criar Conta e Projeto no Supabase

1. Acesse: https://supabase.com
2. Clique em **"Start your project"** ou **"Sign up"**
3. Faça login com GitHub (recomendado) ou email
4. Clique em **"New Project"**
5. Preencha:
   - **Name**: `aerogestao` (ou qualquer nome)
   - **Database Password**: Escolha uma senha forte (salve em local seguro!)
   - **Region**: Escolha mais próxima (ex: `South America (São Paulo)`)
   - **Pricing Plan**: Free (já selecionado)
6. Clique em **"Create new project"**
7. **Aguarde 2-3 minutos** enquanto o projeto é criado

---

### 2. Obter Credenciais do Projeto

1. No dashboard do Supabase, vá em **Settings** (⚙️) no menu lateral
2. Clique em **API**
3. Você verá:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (chave longa)
   - **service_role key**: `eyJhbGc...` (chave longa - ⚠️ SECRETO!)

**Copie essas 3 informações!** Você vai precisar.

---

### 3. Executar Migrations (Criar Tabelas)

**Opção A: Via Supabase Dashboard (MAIS FÁCIL)**

1. No dashboard do Supabase, vá em **SQL Editor** no menu lateral
2. Clique em **"New query"**
3. Abra o arquivo: `supabase/migrations/001_initial_schema.sql`
4. **Copie TODO o conteúdo** do arquivo
5. Cole no editor SQL
6. Clique em **"Run"** (ou Ctrl+Enter)
7. Repita para `supabase/migrations/002_rls_policies.sql`

**Opção B: Via Supabase CLI (MAIS PROFISSIONAL)**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Fazer login
supabase login

# Linkar projeto
supabase link --project-ref seu-project-ref

# Executar migrations
supabase db push
```

> **Nota**: O `project-ref` está na URL do projeto: `https://xxxxx.supabase.co` → `xxxxx` é o project-ref

---

### 4. Configurar Variáveis de Ambiente

**Local (para desenvolvimento):**

Crie um arquivo `.env.local` na raiz do projeto:

```bash
# .env.local
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (chave anon)
```

**Vercel (para produção):**

1. Vá em: https://vercel.com/dashboard
2. Selecione seu projeto
3. **Settings** → **Environment Variables**
4. Adicione:
   - `VITE_SUPABASE_URL` = `https://xxxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGc...` (chave anon)
   - `SUPABASE_URL` = `https://xxxxx.supabase.co` (mesma URL)
   - `SUPABASE_ANON_KEY` = `eyJhbGc...` (mesma chave anon)
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGc...` (service_role key - SECRETO!)

---

### 5. Testar se Está Funcionando

1. **Reinicie o servidor de desenvolvimento:**
   ```bash
   # Pare o servidor (Ctrl+C)
   npm run dev
   ```

2. **Abra o console do navegador** (F12)
3. **Verifique se não há erros**
4. **O sistema deve funcionar normalmente**

---

## ✅ Checklist

- [ ] Conta criada no Supabase
- [ ] Projeto criado
- [ ] Migrations executadas (tabelas criadas)
- [ ] Credenciais copiadas
- [ ] `.env.local` criado com as credenciais
- [ ] Servidor reiniciado
- [ ] Sistema funcionando

---

## 🔍 Como Verificar se as Migrations Funcionaram

1. No Supabase Dashboard, vá em **Table Editor** no menu lateral
2. Você deve ver várias tabelas:
   - `aircrafts`
   - `flights`
   - `expenses`
   - `revenues`
   - `bank_accounts`
   - etc.

Se as tabelas aparecerem, está tudo certo! ✅

---

## ⚠️ Problemas Comuns

**"Missing Supabase environment variables"**
- Verifique se o arquivo `.env.local` existe
- Verifique se as variáveis estão corretas
- Reinicie o servidor após criar/editar `.env.local`

**"Error connecting to Supabase"**
- Verifique se a URL está correta
- Verifique se a chave anon está correta
- Verifique se o projeto está ativo no Supabase

**"Table doesn't exist"**
- Execute as migrations novamente
- Verifique no Table Editor se as tabelas existem

---

## 📞 Próximos Passos

Depois de configurar:

1. **Sistema funcionará com localStorage** (como antes)
2. **Para usar Supabase**, precisamos integrar autenticação
3. **Para migrar dados**, use o script: `scripts/migrate-localStorage-to-supabase.ts`

---

## 🎯 Resumo Rápido

1. Criar projeto no Supabase (5 min)
2. Copiar credenciais (1 min)
3. Executar migrations no SQL Editor (2 min)
4. Criar `.env.local` com credenciais (1 min)
5. Reiniciar servidor
6. Pronto! ✅

**Tempo total: ~10 minutos**
