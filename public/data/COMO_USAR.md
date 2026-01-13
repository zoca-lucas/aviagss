# ✅ Como Usar a Base de Dados

## 📁 Onde Colocar os Arquivos

Coloque **TODOS** os arquivos CSV nesta pasta: `public/data/`

## 📋 Checklist de Arquivos

### Arquivos Principais (Obrigatórios):

- [ ] `airports.csv` - Dados dos aeroportos
- [ ] `aircraft-catalog.csv` - Catálogo de aeronaves (opcional, mas recomendado)

### Arquivos Adicionais (Opcionais):

- [ ] `airport-frequencies.csv`
- [ ] `airport-comments.csv`
- [ ] `runways.csv`
- [ ] `countries.csv`
- [ ] `regions.csv`
- [ ] `navaids.csv`

## 🚀 Como Funciona

1. **Arquivos locais têm prioridade**: O sistema tenta carregar primeiro de `public/data/`
2. **Fallback automático**: Se não encontrar local, baixa da internet
3. **Cache inteligente**: Dados são salvos no navegador por 7 dias

## ✅ Como Verificar se Está Funcionando

1. Abra o console do navegador (F12)
2. Acesse a página "Estimativa de Voo"
3. Procure a mensagem no console:
   - ✅ `"Carregado arquivo local: /data/airports.csv"` = Funcionando com arquivo local!
   - ⚠️ `"Arquivo local não encontrado, tentando baixar da internet..."` = Usando internet (arquivo não encontrado)

## 🔧 Solução de Problemas

### Arquivo não está sendo carregado?

1. Verifique se o arquivo está em `public/data/airports.csv` (não em `src/data/`)
2. Verifique se o nome do arquivo está correto (case-sensitive)
3. Limpe o cache do navegador: `localStorage.clear()` no console
4. Reinicie o servidor de desenvolvimento

### Quer forçar recarregamento?

No console do navegador, execute:
```javascript
localStorage.removeItem('ourairports_data');
localStorage.removeItem('ourairports_data_timestamp');
```
Depois recarregue a página.

## 📝 Formato do aircraft-catalog.csv

Se você tiver um catálogo de aeronaves, use este formato:

```csv
manufacturer,model,variant,aircraft_type,year_start,year_end
Beechcraft,King Air C90,C90GTi,turbohelice,2010,
Cessna,172,,pistao,1956,
Embraer,Phenom,100,jato,2008,
```

**Colunas obrigatórias**: `manufacturer`, `model`, `aircraft_type`
**Colunas opcionais**: `variant`, `year_start`, `year_end`
**Tipos válidos**: `pistao`, `turbohelice`, `jato`, `helicoptero`