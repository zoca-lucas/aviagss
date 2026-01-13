# Instruções para Base de Dados

## Onde colocar os arquivos CSV

Coloque **TODOS** os arquivos CSV do OurAirports nesta pasta: `public/data/`

### Arquivos necessários:

1. **`airports.csv`** ⭐ (OBRIGATÓRIO)
   - Dados principais dos aeroportos
   - Usado para busca e seleção de aeroportos

2. **`aircraft-catalog.csv`** ⭐ (OBRIGATÓRIO para catálogo)
   - Catálogo de aeronaves (fabricante, modelo, variante, tipo)
   - Formato: `manufacturer,model,variant,aircraft_type,year_start,year_end`

### Arquivos opcionais (podem ser adicionados depois):

- `airport-frequencies.csv` - Frequências de rádio
- `airport-comments.csv` - Comentários sobre aeroportos  
- `runways.csv` - Dados das pistas
- `countries.csv` - Lista de países
- `regions.csv` - Regiões/estados
- `navaids.csv` - Navegação aérea (VOR, NDB, etc.)

## Como obter os arquivos

### OurAirports (Aeroportos):
1. Acesse: https://github.com/davidmegginson/ourairports-data
2. Vá em "Releases" ou acesse diretamente: https://davidmegginson.github.io/ourairports-data/
3. Baixe os arquivos CSV que você precisa
4. Coloque nesta pasta (`public/data/`)

### Catálogo de Aeronaves:
Crie o arquivo `aircraft-catalog.csv` com o formato:

```csv
manufacturer,model,variant,aircraft_type,year_start,year_end
Beechcraft,King Air C90,C90GTi,turbohelice,2010,
Cessna,172,,pistao,1956,
Cessna,182,,pistao,1956,
Embraer,Phenom,100,jato,2008,
```

## Após colocar os arquivos

1. **Para aeroportos**: O sistema carregará automaticamente na próxima vez que você usar a Estimativa de Voo
2. **Para catálogo**: Vá em "Catálogo" → "Importar CSV" ou coloque o arquivo e clique em "Atualizar Dados"

## Estrutura de pastas

```
public/
  └── data/
      ├── airports.csv          ← Coloque aqui
      ├── aircraft-catalog.csv  ← Coloque aqui
      ├── airport-frequencies.csv (opcional)
      ├── runways.csv (opcional)
      └── ... (outros arquivos opcionais)
```

## Notas importantes

- Os arquivos devem estar em formato CSV UTF-8
- Use vírgula (`,`) como separador
- A primeira linha deve conter os headers (nomes das colunas)
- O sistema tentará carregar do arquivo local primeiro, depois da internet como fallback