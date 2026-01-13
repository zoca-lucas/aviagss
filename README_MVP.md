# MVP Produção - AeroGestão

## Status da Implementação

✅ **Infraestrutura Base**
- [x] Schema SQL criado (`supabase/migrations/001_initial_schema.sql`)
- [x] Row Level Security (RLS) configurado (`supabase/migrations/002_rls_policies.sql`)
- [x] Cliente Supabase configurado (`src/services/supabase.ts`)
- [x] Tipos do banco criados (`src/services/database.types.ts`)

✅ **API Backend (Vercel Functions)**
- [x] Estrutura `/api` criada
- [x] Endpoints implementados:
  - `/api/aircrafts` (GET, POST)
  - `/api/aircrafts/[id]` (GET, PUT, DELETE)
  - `/api/flights` (GET, POST)
  - `/api/expenses` (GET, POST)
  - `/api/revenues` (GET, POST)
- [x] Autenticação JWT implementada
- [x] Utilitários de resposta e autenticação

✅ **Serviço de API (Frontend)**
- [x] Serviço `api.ts` criado com fallback para localStorage
- [x] Conversores DB <-> App implementados
- [x] Modo offline-first (tenta API, usa localStorage se falhar)

⚠️ **Pendente**
- [ ] Integração do Supabase Auth no `AuthContext.tsx`
- [ ] Migração de dados localStorage → Supabase
- [ ] Script de backup/export
- [ ] Configuração de variáveis de ambiente no Vercel

## Próximos Passos

### 1. Configurar Supabase

1. Criar projeto em https://supabase.com
2. Executar migrations:
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
3. Obter credenciais:
   - URL do projeto
   - Anon Key
   - Service Role Key

### 2. Configurar Variáveis de Ambiente

**Local (.env.local):**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_USE_API=true
```

**Vercel (Dashboard → Settings → Environment Variables):**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 3. Integrar Autenticação

O `AuthContext.tsx` ainda usa o sistema antigo de localStorage. Precisa ser migrado para usar Supabase Auth.

### 4. Testar

1. Iniciar dev server: `npm run dev`
2. Testar login/logout com Supabase
3. Testar CRUD de aeronaves, voos, despesas
4. Verificar fallback para localStorage quando offline

### 5. Migrar Dados Existentes

Criar script `scripts/migrate-localStorage-to-supabase.ts` para migrar dados do localStorage para o Supabase antes do go-live.

## Estrutura de Arquivos

```
├── api/                          # Vercel Functions (Backend)
│   ├── aircrafts.ts             # Endpoint aeronaves
│   ├── aircrafts/[id].ts        # Endpoint aeronave por ID
│   ├── flights.ts               # Endpoint voos
│   ├── expenses.ts              # Endpoint despesas
│   ├── revenues.ts              # Endpoint receitas
│   └── utils/
│       ├── auth.ts              # Autenticação JWT
│       ├── supabase.ts          # Cliente Supabase backend
│       └── response.ts          # Helpers de resposta
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # Schema do banco
│       └── 002_rls_policies.sql      # Políticas de segurança
└── src/
    ├── services/
    │   ├── api.ts               # Serviço API (substitui storage)
    │   ├── supabase.ts          # Cliente Supabase frontend
    │   ├── storage.ts           # localStorage (fallback)
    │   └── database.types.ts    # Tipos TypeScript do banco
    └── contexts/
        └── AuthContext.tsx      # ⚠️ Precisa migrar para Supabase Auth
```

## Comandos Úteis

```bash
# Instalar dependências
npm install

# Desenvolvimento local
npm run dev

# Build
npm run build

# Testar build localmente
npm run preview

# Executar migrations Supabase
supabase db push

# Ver logs Supabase
supabase logs
```

## Notas Importantes

1. **Modo Híbrido**: O sistema funciona em modo híbrido - tenta usar a API primeiro, se falhar usa localStorage
2. **Autenticação**: Atualmente usa sistema próprio, precisa migrar para Supabase Auth
3. **RLS**: As políticas de segurança estão configuradas - usuários só veem dados de aeronaves que pertencem
4. **Backup**: Supabase faz backup automático, mas recomendado criar export manual também

## Troubleshooting

**Erro: "Missing Supabase environment variables"**
- Verifique se `.env.local` existe e tem as variáveis corretas
- No Vercel, configure as variáveis no dashboard

**Erro: "Unauthorized"**
- Verifique se o token JWT está sendo enviado
- Confira se o usuário está autenticado no Supabase
- Verifique se o usuário tem membership ativo na aeronave

**Dados não aparecem**
- Verifique RLS policies no Supabase
- Confira logs no Vercel Functions
- Verifique se fallback para localStorage está funcionando
