# Base de Dados do Catálogo de Aeronaves

## Localização do CSV

Coloque o arquivo CSV com os dados do catálogo de aeronaves nesta pasta com o nome:

**`aircraft-catalog.csv`**

## Formato Esperado do CSV

O CSV deve ter as seguintes colunas (header na primeira linha):

```csv
manufacturer,model,variant,aircraft_type,year_start,year_end
Beechcraft,King Air C90,C90GTi,turbohelice,2010,
Cessna,172,,pistao,1956,
Cessna,182,,pistao,1956,
```

### Colunas:

- **manufacturer** (obrigatório): Nome do fabricante (ex: "Beechcraft", "Cessna", "Embraer")
- **model** (obrigatório): Nome do modelo (ex: "King Air C90", "172", "Phenom 100")
- **variant** (opcional): Variante do modelo (ex: "C90GTi", "A", "B")
- **aircraft_type** (obrigatório): Tipo de aeronave - valores: `pistao`, `turbohelice`, `jato`, `helicoptero`
- **year_start** (opcional): Ano inicial de fabricação
- **year_end** (opcional): Ano final de fabricação (deixe vazio se ainda em produção)

### Exemplo Completo:

```csv
manufacturer,model,variant,aircraft_type,year_start,year_end
Beechcraft,King Air C90,C90GTi,turbohelice,2010,
Beechcraft,King Air B200,,turbohelice,1981,
Cessna,172,,pistao,1956,
Cessna,182,,pistao,1956,
Cessna,Citation,CJ3,jato,2004,
Embraer,Phenom,100,jato,2008,
Embraer,Phenom,300,jato,2012,
Piper,Cherokee,,pistao,1961,
Piper,Seneca,,pistao,1971,
```

## Como Importar

1. Coloque o arquivo `aircraft-catalog.csv` nesta pasta (`src/data/`)
2. O sistema irá carregar automaticamente quando você clicar em "Atualizar Dados" no catálogo
3. Ou o CSV será carregado automaticamente na primeira sincronização

## Notas

- O arquivo deve usar codificação UTF-8
- Use vírgula (`,`) como separador
- Aspas duplas (`"`) são opcionais, mas recomendadas se houver vírgulas no texto
- Linhas vazias serão ignoradas