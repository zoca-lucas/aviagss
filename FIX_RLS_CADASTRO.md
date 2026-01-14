# 🔧 Como Corrigir o Erro de RLS no Cadastro

## ❌ Erro Atual

```
Erro ao criar perfil do usuário: new row violates row-level security policy for table "user_profiles"
```

## 🔍 Causa

O erro acontece porque as políticas de Row Level Security (RLS) no Supabase não permitem que usuários criem seus próprios perfis durante o cadastro.

## ✅ Solução

Execute a migration atualizada no Supabase:

1. **Acesse o dashboard do Supabase**
2. Vá em **SQL Editor** → **New query**
3. **Abra o arquivo**: `supabase/migrations/002_rls_policies.sql`
4. **Copie TODO o conteúdo** do arquivo
5. **Cole no editor SQL**
6. **Clique em "Run"**

### O que a migration faz:

- ✅ Cria política `user_profiles_insert_own` que permite usuários criarem seu próprio perfil
- ✅ Atualiza políticas de SELECT e UPDATE para user_profiles
- ✅ Adiciona políticas RLS para outras tabelas (aircrafts, memberships, flights, expenses, revenues)

## 📋 Política de INSERT Adicionada

```sql
CREATE POLICY "user_profiles_insert_own"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

Esta política permite que usuários autenticados criem um perfil desde que o `user_id` seja igual ao ID do usuário autenticado (`auth.uid()`).

## ✅ Após executar a migration

O cadastro de novos usuários deve funcionar normalmente!

---

**Nota**: Se você já executou a migration `002_rls_policies.sql` antes, pode ser necessário deletar as políticas antigas primeiro ou atualizar o arquivo SQL para usar `CREATE POLICY IF NOT EXISTS` ou `DROP POLICY IF EXISTS` antes de criar.
