# Regras de Negócio — App de Hábitos

Visão funcional do sistema. Toda regra aqui documentada deve vir de uma conversa explícita com o usuário (ver `docs/decisoes.md` para o "porquê" de cada uma). **Nada aqui pode ser inventado ou presumido.**

## Visão geral do produto

App **de uso pessoal**, só para o próprio usuário (Matheus), para acompanhar os seus hábitos. Roda como PWA no iPhone (ver `docs/decisoes.md`, 2026-11-25). Cada hábito é um **módulo próprio**, com regras próprias. O primeiro é **Água**. Outros hábitos virão depois, na ordem combinada com o usuário.

## Acesso

- Um único usuário. Não existem cadastro de pessoas, papéis nem compartilhamento.
- O login é **só uma tela de senha**, sem e-mail nem nome de usuário (2026-11-25). São 5 tentativas por minuto; depois disso, o app pede para esperar.
- **Senha de acesso** (decisão do usuário, 2026-11-25): o app pede uma senha para entrar, porque fica publicado na internet. Não há tela de cadastro nem de "esqueci a senha".
- **Sessão**: depois de entrar, o app continua conectado por 30 dias a partir do último uso (cada uso renova o prazo). "Sair" encerra a sessão naquele aparelho.
- **Trocar a senha**: mudar `ADMIN_PASSWORD` e reiniciar o backend. A troca encerra todas as sessões abertas.
- **A senha nunca é escrita em texto puro** em nenhum arquivo do projeto, nem no git. Ela é definida por variável de ambiente (`backend/.env` em desenvolvimento, painel do provedor em produção). O banco guarda só o hash bcrypt.

## Módulo Água

Requisitos definidos com o usuário em 2026-11-25.

### Meta diária

- A meta diária (em mL) é **um valor cadastrado à parte**. Não é a soma dos lembretes.
- **Limites da meta**: de 500 a 10.000 mL (2026-11-25).
- **Antes da primeira meta**, o campo já vem preenchido com **4.000 mL** como sugestão, mas nada é gravado até o usuário salvar. O calendário só começa quando a meta é salva (2026-11-25).
- Quando a **soma dos mL dos lembretes for menor que a meta**, o app mostra um aviso dizendo que, seguindo só os lembretes, a meta não será batida.
  - O aviso aparece na tela de configuração (ao salvar a meta ou os lembretes) e na tela de Água do dia. Não é uma notificação push.
- Se a meta mudar, **cada dia continua avaliado pela meta que valia naquele dia**. O app guarda a meta de cada dia.
- Uma meta alterada no meio do dia **já vale para o dia de hoje** (2026-11-25).

### Lembretes

- Cada lembrete tem um **horário** e uma **quantidade em mL**, de **50 a 2.000 mL** (2026-11-25).
- Um lembrete pode ter o horário e os mL **editados**, ou ser **excluído** (exclusão lógica: o histórico de registros continua).
- Os lembretes são **iguais todos os dias**. Não há variação por dia da semana.
- Não pode haver dois lembretes ativos no mesmo horário (2026-11-25).
- No horário do lembrete, o app envia **uma única notificação**. Ela não se repete, mesmo que o lembrete não seja confirmado.
  - O iPhone do usuário está no iOS 27.2.1, que suporta push em PWA instalado na tela de início.

### Registro do que foi bebido

Há duas formas, e as duas somam no total do dia:

- **Confirmar o lembrete** ("tomei"): soma a quantidade daquele lembrete. Cada lembrete só pode ser confirmado **uma vez por dia**, e a confirmação pode ser feita antes do horário dele (2026-11-25).
- **Registro livre**: soma uma quantidade a qualquer hora (ex.: botões de +200, +300 e +500 mL).
  - Botões rápidos de +200, +300 e +500 mL, mais um campo para digitar outro valor, de **50 a 2.000 mL** (mesmos limites do lembrete).

Regras de edição:

- **Dias que já passaram não podem ser alterados**: não se registra, corrige nem apaga nada de dias anteriores.
- No dia de hoje é possível desfazer (apagar) um registro feito por engano.

### Quanto falta

- A tela do dia (tela inicial do app) mostra o total tomado, a meta do dia e **quanto falta** para chegar nela, com barra de progresso. Quando chega à meta, mostra "Meta batida!".
- Mostra também os lembretes de hoje (quais já foram tomados) e a lista de registros de hoje, cada um com hora, quantidade, origem (lembrete ou livre) e "Desfazer".
- Desfazer o registro de um lembrete libera o "Tomei" desse lembrete de novo.
- Um lembrete excluído depois de confirmado sai da lista de lembretes, mas o registro dele continua contando no dia.

### Bateu a meta

- Um dia conta como **meta batida** quando o total tomado é **maior ou igual** à meta daquele dia.
- O dia vira à **meia-noite, no horário de Brasília**.

### Acompanhamento macro

- **Calendário do mês** com os dias em verde (meta batida) e vermelho (não batida).
  - O calendário começa no dia em que a primeira meta foi cadastrada. Antes disso não há dias avaliados.
  - O dia de hoje aparece **neutro (cinza)** até a meia-noite em Brasília, quando passa a verde ou vermelho (2026-11-25).
- **Sequência** de dias seguidos batendo a meta.
- **Percentual** de dias do mês com a meta batida.

## Outros hábitos

`[A DEFINIR]`: em conversas futuras, um módulo por vez.

## Regras transversais

- **Todo texto de negócio (labels, mensagens de erro, nomes de campos) em português**; nomes técnicos de código em inglês.
- **Fuso horário**: horário de Brasília para "hoje", para a virada do dia e para os horários dos lembretes.
- **Segurança**:
  - senha com bcrypt, nunca exposta em resposta de API;
  - refresh token rotativo, com o hash armazenado (não o valor bruto);
  - rate limiting no login;
  - segredos só em variável de ambiente, nunca no repositório.
