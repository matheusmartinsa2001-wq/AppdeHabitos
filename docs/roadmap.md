# Roadmap — App de Hábitos

O desenvolvimento segue um fluxo de etapas: uma etapa por vez, com aprovação explícita do usuário antes de avançar para a próxima. Não pular etapas.

> As fases 1 e 2 abaixo são a sequência padrão (a mesma usada no projeto Vivo Team Management). As etapas de funcionalidade da Fase 3 em diante serão definidas depois da conversa de requisitos.

## Fase 0 — Estrutura do projeto (concluída)

- ✔ Pastas, `CLAUDE.md` e `docs/` criados (2026-11-25)

## Fase 1 — Fundação

- ✔ Etapa 1 — Análise de requisitos com o usuário (`docs/regras-negocio.md`). Regras do módulo Água definidas e aprovadas pelo usuário em 2026-11-25.
- ✔ Etapa 2 — Confirmação da stack e das decisões de arquitetura (`docs/decisoes.md`). **Já decidido (2026-11-25):** PWA no iPhone + hospedagem gratuita (Vercel/Netlify/Cloudflare Pages, Render/Koyeb, Neon/Supabase). Login com senha também já foi decidido. Stack confirmada em 2026-11-25: base do Vivo + cron externo gratuito para os lembretes, tudo gratuito.
- ✔ Etapa 3 — Modelagem do banco de dados (`docs/banco.md`), aprovada em 2026-11-25
- ✔ Etapa 4 — Estrutura inicial do código (backend, frontend com manifest e service worker, Docker para dev, testes), aprovada em 2026-11-25
- ✔ Etapa 5 — Login com senha (conta única criada no boot a partir de `ADMIN_PASSWORD`), aprovada em 2026-11-25
- ✔ Etapa 6 — Primeiro deploy nos planos gratuitos e teste de instalação no iPhone. No ar em 2026-11-25 (https://appde-habitos.vercel.app), testado no iPhone pelo usuário; aprovada.

## Fase 2 — Módulo Água (primeiro módulo, pedido em 2026-11-25)

Divisão proposta, a confirmar junto com a aprovação da Etapa 1:

- ✔ Etapa 7 — Configuração: meta diária (com histórico por dia), lembretes (horário + mL) e aviso quando os lembretes não somam a meta — aprovada em 2026-11-25.
- ✔ Etapa 8 — Registro do que foi bebido (confirmar lembrete + registro livre, só no dia de hoje) e "quanto falta" — aprovada em 2026-11-25.
- ✔ Etapa 9 — Notificação push no horário de cada lembrete, uma vez, sem repetir — no ar e testada no iPhone pelo usuário em 2026-11-25; aprovada.
- ✔ Etapa 10 — Acompanhamento macro: calendário verde/vermelho, sequência e percentual do mês — aprovada em 2026-11-25.

## Redesign do módulo Água (design "Módulo Água · UX + visual novo", Claude Design)

- ✱ Novo visual e UX das três telas (Hoje, Histórico, Ajustes), sem mudar regras nem API. Entregue em 2026-11-25, aguardando aprovação.

## Fase 3+ — Outros hábitos

`[A DEFINIR]`: um módulo por hábito, na ordem combinada com o usuário.

## Fase final — Consolidação

- ○ Revisão completa do projeto — bugs, performance, segurança, consistência, responsividade

## Fora do escopo atual (não solicitado)

`[A DEFINIR]` — registrar aqui o que o usuário disser explicitamente que não quer agora.
