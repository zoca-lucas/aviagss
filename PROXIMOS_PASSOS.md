# 🚀 Próximos Passos - Integração Supabase

## ✅ O que já está feito

- [x] Projeto Supabase criado
- [x] Credenciais configuradas no `.env.local`
- [x] Migrations criadas (mas precisam ser executadas!)
- [x] Sistema funcionando com localStorage

---

## 🔍 Passo 1: Verificar se as Migrations Foram Executadas

1. Acesse o dashboard do Supabase
2. Vá em **Table Editor** (menu lateral)
3. Você deve ver várias tabelas:
   - `aircrafts`
   - `flights`
   - `expenses`
   - `revenues`
   - `bank_accounts`
   - etc.

**❌ Se as tabelas NÃO existirem:**
- Vá em **SQL Editor** → **New query**
- Abra `supabase/migrations/001_initial_schema.sql`
- Copie TODO o conteúdo → Cole → **Run**
- Repita para `002_rls_policies.sql` e `003_create_flight_entries.sql`

**✅ Se as tabelas existirem:**
- Continue para o próximo passo!

---

## 🔐 Passo 2: Criar Usuário Admin no Supabase Auth

**Opção A: Via Dashboard (MAIS FÁCIL)**

1. No dashboard do Supabase, vá em **Authentication** → **Users**
2. Clique em **"Add user"** → **"Create new user"**
3. Preencha:
   - **Email**: `admin@aerogestao.com`
   - **Password**: Escolha uma senha forte
   - **Auto Confirm User**: ✅ Marque esta opção
4. Clique em **"Create user"**
5. **Anote a senha!** Você vai usar para fazer login

**Opção B: Via SQL (ADVANÇADO)**

Execute no SQL Editor:
```sql
-- Criar usuário via Auth (requer função personalizada)
-- Recomendado usar Opção A (Dashboard)
```

---

## 📝 Passo 3: Criar Perfil do Usuário

Depois de criar o usuário no Auth, você precisa criar o perfil na tabela `user_profiles`:

1. No **Table Editor**, abra a tabela `user_profiles`
2. Clique em **"Insert row"**
3. Preencha:
   - **user_id**: Copie o ID do usuário criado (está em Authentication → Users)
   - **email**: `admin@aerogestao.com`
   - **nome**: `Administrador`
   - **role**: `admin`
   - **active**: `true`
4. Clique em **"Save"**

> **Dica**: O `user_id` você encontra em **Authentication** → **Users** → Clique no usuário → O ID está no topo

---

## 🔄 Passo 4: Testar Login (Opcional por enquanto)

O sistema **continua funcionando com localStorage** normalmente.

Se quiser testar com Supabase Auth:
1. Precisamos criar uma página de login
2. Integrar o AuthContext com Supabase Auth
3. Migrar dados do localStorage para Supabase

**Isso pode ser feito depois, quando você estiver pronto!**

---

## 🎯 Estratégia Recomendada

### **Opção 1: Continuar com localStorage (RECOMENDADO AGORA)**

- ✅ Sistema já está funcionando
- ✅ Dados salvos localmente
- ✅ Sem necessidade de login/senha
- ⚠️ Dados não sincronizam entre dispositivos
- ⚠️ Dados podem ser perdidos se limpar o navegador

**Use esta opção para:**
- Testes locais
- Desenvolvimento
- Protótipos

### **Opção 2: Migrar para Supabase (QUANDO ESTIVER PRONTO)**

- ✅ Dados na nuvem
- ✅ Backup automático
- ✅ Múltiplos usuários
- ✅ Sincronização entre dispositivos
- ⚠️ Precisa criar login/senha
- ⚠️ Precisa migrar dados existentes

**Use esta opção para:**
- Produção
- Uso em equipe
- Quando quiser backup automático

---

## 📋 Checklist dos Próximos Passos

- [ ] ✅ Migrations executadas (tabelas criadas)
- [ ] ✅ Usuário admin criado no Supabase Auth
- [ ] ✅ Perfil criado na tabela `user_profiles`
- [ ] ⏳ (Opcional) Criar página de login
- [ ] ⏳ (Opcional) Integrar AuthContext com Supabase
- [ ] ⏳ (Opcional) Migrar dados do localStorage

---

## ❓ O que você quer fazer agora?

**A) Continuar usando localStorage (funciona assim mesmo)**
- Não precisa fazer nada mais!
- Sistema continua funcionando normalmente
- Pode usar o Supabase depois quando quiser

**B) Migrar para Supabase agora**
- Precisamos criar página de login
- Integrar autenticação
- Migrar dados existentes
- Vai levar mais tempo (~30 min)

**O que você prefere?**
