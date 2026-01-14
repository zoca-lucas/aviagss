# 🔧 COMO CORRIGIR O ERRO DE RLS - PASSO A PASSO

## ❌ Erro que você está vendo:

```
Erro ao criar perfil do usuário: new row violates row-level security policy for table "user_profiles"
```

## ✅ SOLUÇÃO RÁPIDA (2 minutos):

### 1. Acesse o Supabase Dashboard

1. Vá em: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em **SQL Editor** (menu lateral)

### 2. Execute o SQL de Correção

1. Clique em **"New query"**
2. **Abra o arquivo**: `EXECUTAR_RLS_FIX.sql`
3. **Copie TODO o conteúdo** do arquivo
4. **Cole no editor SQL**
5. Clique em **"Run"** (ou pressione Ctrl+Enter)

### 3. Pronto! ✅

Agora tente cadastrar novamente. Deve funcionar!

---

## 🔍 O que o script faz:

- ✅ Habilita RLS na tabela `user_profiles`
- ✅ Remove políticas antigas (se existirem)
- ✅ Cria a política **`user_profiles_insert_own`** que permite cadastro
- ✅ Cria outras políticas necessárias (SELECT, UPDATE)

## 📋 Política Principal:

```sql
CREATE POLICY "user_profiles_insert_own"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

Esta política permite que usuários autenticados criem um perfil desde que o `user_id` seja igual ao ID do usuário autenticado (`auth.uid()`).

---

## ⚠️ Se ainda não funcionar:

1. **Verifique se executou o SQL no Supabase**
2. **Verifique se há erros no console do SQL Editor**
3. **Tente cadastrar novamente após executar o SQL**

---

## 📞 Próximos Passos:

Depois de executar o SQL, o cadastro deve funcionar normalmente!
