# AppCobPrime

Este repositório deve conter todos os códigos do projeto e a pasta `cobprime-pwa`, exceto arquivos confidenciais e dependências que não devem ser versionados.

## O que deve ir para o GitHub

- Código fonte do app principal
- Pasta `cobprime-pwa` e seus arquivos de projeto
- Arquivos de configuração do projeto
- Arquivos de frontend e backend necessários

## O que NÃO deve ir para o GitHub

- Banco de dados local: `banco/` ou qualquer arquivo `.mdb`
- Dependências instaladas: `node_modules/`
- Builds ou artefatos de produção: `build/`
- Arquivos de ambiente local: `.env`, `.env.*`

## `.gitignore` recomendado

O arquivo `c:\TesteAccess\.gitignore` deve conter pelo menos:

```
node_modules/
build/
.env
*.mdb
banco/
```

E `cobprime-pwa/.gitignore` já ignora:

```
/node_modules
/build
```

## Como enviar novas atualizações

1. No diretório raiz do projeto:

```powershell
cd C:\TesteAccess
git add .
git commit -m "Atualização do projeto"
git push origin main
```

2. Se quiser garantir que apenas o que interessa seja enviado, adicione a pasta específica:

```powershell
git add .
git add cobprime-pwa
git commit -m "Atualização da PWA"
git push origin main
```

## Como clonar no outro PC

1. Clonar o repositório:

```powershell
git clone https://github.com/mariamattoss/AppCobPrime.git
cd AppCobPrime
```

2. Instalar dependências e rodar:

```powershell
npm install
npm start
```

3. Se usar a PWA separadamente:

```powershell
cd cobprime-pwa
npm install
npm start
```

## Banco de dados local

O arquivo `banco/banco_dev.mdb` deve ser mantido fora do repositório. No outro PC, copie esse arquivo manualmente para a pasta `banco/` quando precisar.

## Resumo

- A pasta `cobprime-pwa` deve ser incluída no GitHub
- `banco/` e `node_modules/` não devem ser enviados
- Atualize o repositório com `git add .`, `git commit` e `git push`
- No outro computador, clone o repo e instale dependências com `npm install`
