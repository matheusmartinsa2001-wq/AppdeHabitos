# Prompts úteis — App de Hábitos

Coleção de prompts para retomar o desenvolvimento em novas sessões, sem depender do histórico da conversa.

## Conversa de requisitos (próximo passo)

```
Leia CLAUDE.md e toda a pasta docs/.
Vamos definir o app de hábitos. Use o roteiro de perguntas em
docs/regras-negocio.md, uma área por vez. Não presuma nenhuma regra:
pergunte. Ao final, preencha docs/regras-negocio.md, atualize
docs/roadmap.md com as etapas de funcionalidade e registre as decisões
em docs/decisoes.md. Não escreva código.
```

## Revisão do projeto (início de qualquer sessão nova)

```
Leia CLAUDE.md e toda a pasta docs/ (arquitetura, regras-negocio, padroes,
decisoes, backlog, roadmap, api, banco, changelog).
Analise o estado atual do projeto (código real, não só a documentação —
aponte qualquer divergência que encontrar).
Identifique pendências em docs/backlog.md.
Resuma em poucas linhas onde o projeto está e qual é a próxima etapa
pendente em docs/roadmap.md, e aguarde minha confirmação antes de continuar.
```

## Implementar a próxima etapa do roadmap

```
Leia CLAUDE.md e toda a pasta docs/ antes de começar.
Confirme comigo qual é a próxima etapa pendente em docs/roadmap.md.
Analise ambiguidades nos requisitos dessa etapa (docs/regras-negocio.md) e
pergunte antes de implementar, se houver.
Implemente mantendo os padrões de docs/padroes.md e a arquitetura de
docs/arquitetura.md.
Teste no Docker (build + navegador, quando envolver UI) antes de considerar
concluído.
Ao final, atualize: backlog, changelog, decisoes (se houver decisão
relevante), api (se endpoint mudou), banco (se o schema mudou), padroes
(se surgiu padrão novo).
Aguarde minha aprovação explícita antes de seguir para a próxima etapa.
```

## Implementar uma funcionalidade específica (fora da sequência do roadmap)

```
Leia CLAUDE.md e toda a pasta docs/ antes de iniciar.
Implemente [descrever a funcionalidade] mantendo os padrões do projeto.
Se a funcionalidade não estiver prevista em docs/regras-negocio.md ou
docs/roadmap.md, pare e confirme comigo antes — não invente regra nova.
Atualize backlog, changelog e, se necessário, decisoes, api e banco.
```

## Corrigir um bug reportado

```
Leia docs/arquitetura.md e docs/padroes.md antes de investigar.
Reproduza o bug antes de propor a correção — não corrija "no escuro".
Depois de corrigir e validar, registre em docs/changelog.md (e em
docs/decisoes.md se revelar um padrão a evitar) e mova o item em
docs/backlog.md de "Bugs" para "Concluído".
```

## Revisão de código

```
Leia docs/padroes.md e docs/arquitetura.md antes de revisar.
Analise [módulo/arquivo] procurando bugs, code smells, violações dos
padrões e divergências entre código e docs/. Para cada problema, indique
arquivo, linha e sugestão. Não corrija a documentação sem confirmar
comigo qual versão está certa.
```

## Retomar após uma pausa longa

```
Continue da onde paramos.
Leia CLAUDE.md, docs/backlog.md e docs/changelog.md para reconstruir o
contexto. Se o Docker não estiver rodando, peça para eu iniciá-lo.
Resuma o que estava em andamento e confirme comigo antes de prosseguir.
```

## Auditoria de consistência documentação × código

```
Compare docs/api.md com os controllers em backend/src/*/, docs/banco.md
com backend/prisma/schema.prisma e docs/backlog.md com o que está
implementado. Liste toda divergência e proponha a correção — não corrija
sem eu confirmar.
```
