# Base de Dados OurAirports

## Arquivos CSV do OurAirports

Coloque todos os arquivos CSV do OurAirports nesta pasta (`public/data/`):

### Arquivos de Aeroportos:
- **`airports.csv`** - Dados principais dos aeroportos (obrigatório)
- **`airport-frequencies.csv`** - Frequências de rádio dos aeroportos
- **`airport-comments.csv`** - Comentários sobre aeroportos
- **`runways.csv`** - Dados das pistas

### Arquivos de Referência:
- **`countries.csv`** - Lista de países
- **`regions.csv`** - Regiões/estados
- **`navaids.csv`** - Navegação aérea (VOR, NDB, etc.)

## Como obter os arquivos

Baixe os arquivos do repositório oficial do OurAirports:
https://github.com/davidmegginson/ourairports-data

Ou diretamente de:
https://davidmegginson.github.io/ourairports-data/

## Formato

Todos os arquivos devem estar no formato CSV padrão do OurAirports, com headers na primeira linha.

O sistema irá carregar automaticamente os dados quando você acessar a página de Estimativa de Voo ou quando o serviço de aeroportos for inicializado.