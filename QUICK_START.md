# ⚡ Quick Start - Configurar Supabase em 5 minutos

## 1️⃣ Criar Projeto

1. Acesse: https://supabase.com → **Start your project**
2. Login com GitHub
3. **New Project** → Nome: `aerogestao` → Criar
4. **Aguarde 2-3 minutos**

## 2️⃣ Copiar Credenciais

1. **Settings** → **API**
2. Copie:
   - Project URL: `https://xxxxx.supabase.co`
   - `anon public` key: `eyJhbGc...`
   - `service_role` key: `eyJhbGc...` (SECRETO!)

## 3️⃣ Criar Tabelas

1. **SQL Editor** → **New query**
2. Abra `supabase/migrations/001_initial_schema.sql`
3. Copie TODO o conteúdo → Cole no editor → **Run**
4. Abra `supabase/migrations/002_rls_policies.sql`
5. Copie TODO o conteúdo → Cole no editor → **Run**

## 4️⃣ Configurar .env.local

Crie arquivo `.env.local` na raiz:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (cole a chave anon aqui)
```

## 5️⃣ Reiniciar Servidor

```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

## ✅ Pronto!

O sistema vai funcionar normalmente. As migrations criaram todas as tabelas no banco.

---

## 🔍 Verificar se Funcionou

1. Supabase Dashboard → **Table Editor**
2. Você deve ver tabelas: `aircrafts`, `flights`, `expenses`, etc.
3. Se aparecerem, está tudo certo! ✅

---

## ⚠️ IMPORTANTE

- **NÃO compartilhe** a `service_role` key publicamente
- **Não commite** o `.env.local` no Git (já está no .gitignore)
- O sistema **continua funcionando com localStorage** se Supabase não estiver configurado
