# 🚀 Migração Completa para Supabase

## ✅ O que foi implementado

1. **AuthContext atualizado** com Supabase Auth
2. **Página de Login** atualizada (email + senha)
3. **Rotas protegidas** implementadas
4. **Fallback para localStorage** (se Supabase não estiver configurado)

---

## 📋 Checklist de Migração

### 1. Executar Migrations no Supabase

1. Acesse o dashboard do Supabase
2. Vá em **SQL Editor** → **New query**
3. Execute os arquivos nesta ordem:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_create_flight_entries.sql`

### 2. Criar Usuário Admin no Supabase Auth

1. No dashboard do Supabase, vá em **Authentication** → **Users**
2. Clique em **"Add user"** → **"Create new user"**
3. Preencha:
   - **Email**: `admin@aerogestao.com`
   - **Password**: Escolha uma senha forte (anote!)
   - **Auto Confirm User**: ✅ Marque esta opção
4. Clique em **"Create user"**
5. **Copie o ID do usuário** (você vai precisar no próximo passo)

### 3. Criar Perfil do Usuário

1. No **Table Editor**, abra a tabela `user_profiles`
2. Clique em **"Insert row"**
3. Preencha:
   - **user_id**: Cole o ID do usuário criado (passo 2)
   - **email**: `admin@aerogestao.com`
   - **nome**: `Administrador`
   - **role**: `admin`
   - **active**: `true`
   - **horas_totais**: `0`
4. Clique em **"Save"**

### 4. Testar Login

1. Reinicie o servidor: `npm run dev`
2. Acesse: http://localhost:5173/login
3. Faça login com:
   - **Email**: `admin@aerogestao.com`
   - **Senha**: A senha que você criou no passo 2

---

## 🔧 Configuração de Variáveis de Ambiente

Certifique-se de que o arquivo `.env.local` existe na raiz do projeto:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (cole a chave anon aqui)
```

---

## 📝 Notas Importantes

### Fallback para localStorage

O sistema continua funcionando com `localStorage` se o Supabase não estiver configurado. Isso significa:

- ✅ Você pode desenvolver localmente sem Supabase
- ✅ O sistema detecta automaticamente se Supabase está disponível
- ✅ Se não estiver disponível, usa localStorage como antes

### Mudanças no Login

- **Antes**: Login apenas com email (sem senha)
- **Agora**: Login com email + senha (Supabase Auth)

### Rotas Protegidas

Todas as rotas (exceto `/login`) agora requerem autenticação. Se o usuário não estiver autenticado, será redirecionado para `/login`.

---

## 🐛 Problemas Comuns

### "Erro ao carregar perfil"

- Verifique se o usuário foi criado no Supabase Auth
- Verifique se o perfil foi criado na tabela `user_profiles`
- Verifique se o `user_id` no perfil corresponde ao ID do usuário no Auth

### "Perfil de usuário não encontrado"

- Verifique se a migration `001_initial_schema.sql` foi executada
- Verifique se o perfil foi criado corretamente na tabela `user_profiles`

### "Missing Supabase environment variables"

- Verifique se o arquivo `.env.local` existe
- Verifique se as variáveis estão corretas
- Reinicie o servidor após criar/editar `.env.local`

### Tela preta / Erro no console

- Verifique se o Supabase está configurado corretamente
- Verifique se as migrations foram executadas
- Verifique o console do navegador para erros

---

## 📊 Próximos Passos (Opcional)

1. **Migrar dados do localStorage para Supabase**
   - Criar script de migração
   - Exportar dados do localStorage
   - Importar para Supabase

2. **Criar mais usuários**
   - Adicionar usuários via Supabase Auth
   - Criar perfis correspondentes

3. **Configurar RLS (Row Level Security)**
   - As migrations já incluem políticas RLS básicas
   - Ajustar conforme necessário

---

## ✅ Status da Migração

- [x] AuthContext integrado com Supabase Auth
- [x] Página de login atualizada (email + senha)
- [x] Rotas protegidas implementadas
- [x] Fallback para localStorage
- [ ] Migrations executadas (você precisa fazer)
- [ ] Usuário admin criado (você precisa fazer)
- [ ] Perfil do usuário criado (você precisa fazer)
- [ ] Login testado (você precisa fazer)

---

## 🎯 Teste Final

1. Execute as migrations
2. Crie o usuário admin
3. Crie o perfil do usuário
4. Teste o login
5. Verifique se consegue acessar o dashboard

Se tudo funcionar, a migração está completa! 🎉
