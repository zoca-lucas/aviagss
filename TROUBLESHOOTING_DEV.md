# 🔧 Troubleshooting: npm run dev não está rodando

## ✅ O build está funcionando

O comando `npm run build` funciona perfeitamente, então o código está correto.

## 🔍 Possíveis problemas e soluções:

### 1. **Porta já está em uso**

Se outra aplicação está usando a porta 5173 (porta padrão do Vite):

**Solução:**
```bash
# Ver processos na porta 5173
lsof -ti:5173

# Matar processo (se necessário)
kill -9 $(lsof -ti:5173)

# Ou use uma porta diferente
npm run dev -- --port 5174
```

### 2. **Servidor já está rodando em background**

Se o servidor já está rodando em outro terminal:

**Solução:**
- Verifique se há um terminal com o servidor rodando
- Ou pare o processo:
```bash
pkill -f "vite"
```

### 3. **Erro no console**

Execute o comando e verifique a saída:
```bash
npm run dev
```

Se houver erros, eles aparecerão no console.

### 4. **Node_modules desatualizado**

Tente reinstalar as dependências:
```bash
rm -rf node_modules
rm -rf package-lock.json
npm install
npm run dev
```

### 5. **Variáveis de ambiente**

Se o Supabase não estiver configurado, o servidor ainda deve rodar, mas pode haver warnings no console.

## 📋 Checklist rápido:

- [ ] Node.js instalado? (`node --version`)
- [ ] npm instalado? (`npm --version`)
- [ ] Dependências instaladas? (`npm install`)
- [ ] Porta 5173 livre?
- [ ] Servidor não está rodando em outro terminal?
- [ ] Há erros no console?

## 🎯 Comando para iniciar:

```bash
npm run dev
```

O servidor deve iniciar e mostrar algo como:
```
  VITE v7.3.1  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 💡 Dica:

Se o servidor não iniciar, tente:
1. Limpar cache do npm: `npm cache clean --force`
2. Reinstalar dependências: `rm -rf node_modules && npm install`
3. Verificar se há erros de sintaxe: `npm run build`
