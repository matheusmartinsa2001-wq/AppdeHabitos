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
  - Se o lembrete já foi marcado como "tomei" antes do horário, a notificação não é enviada (2026-11-25).
  - Se o servidor atrasar (cron atrasado ou servidor gratuito "acordando"), a notificação ainda sai até **10 minutos** depois do horário. Depois disso, não sai mais naquele dia.
  - Ao tocar na notificação, o app abre na tela de Água do dia.
  - As notificações são ativadas por aparelho, na tela de configuração ("Ativar notificações", com "Enviar teste" e "Desativar").
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
- **Sequência** de dias seguidos batendo a meta: conta os dias até ontem e soma hoje se a meta de hoje já foi batida (hoje continua neutro no calendário até a meia-noite).
- **Percentual** de dias do mês com a meta batida: dias batidos ÷ dias já fechados e avaliados no mês (desde a primeira meta; hoje não entra). Mostrado também como "X de Y dias".
- Dia sem nenhum registro conta como **não batido**.
- Dá para navegar pelos meses, do mês da primeira meta até o mês atual. Tocar num dia mostra o total e a meta daquele dia.

### Telas (redesign de 2026-11-25)

- Dentro do módulo, a navegação é uma barra inferior com Hoje · Histórico · Ajustes, e "‹ Módulos" no topo volta para a escolha de módulo. "Sair deste aparelho" fica em Ajustes.
- **Hoje**:
  - o "Tomei" do **lembrete da vez** fica em destaque, logo abaixo do progresso. O lembrete da vez é o último pendente que já passou do horário ou, se nenhum passou, o próximo;
  - lembretes e registros aparecem numa linha só ("Seu dia"), com a marca de "agora";
  - logo depois de registrar, aparece um aviso com **Desfazer**. Depois, desfazer é tocando no item da linha.
- **Histórico**: cada dia do calendário mostra quanto da meta foi bebido (altura do preenchimento), além do verde/vermelho. O card da sequência diz se já conta hoje.
- **Ajustes**:
  - a meta tem botões − / + de 250 mL e "Salvar meta" só aparece quando o valor muda;
  - criar e editar lembrete abrem um painel, e excluir pede confirmação;
  - as notificações ficam numa chave, com "Enviar teste".

## Navegação entre módulos (2026-11-26)

Decisão do usuário (2026-11-26), para não mexer no módulo Água e permitir novos módulos depois:

- Ao abrir o app (depois do login ou com a sessão já ativa), aparece **só a escolha de módulo**: **Água** e **Tarefas**. Novos módulos entram como mais uma opção nessa tela.
- **Água** abre o módulo exatamente como está hoje (barra Hoje · Histórico · Ajustes, mesmas telas e regras). Só o endereço muda: a tela Hoje da Água passa de `/` para `/agua`.
- **Tarefas** abre o módulo novo, com a barra própria dele. Barra **Tarefas · Histórico · Ajustes**, com Hoje, Próximas e Atrasadas como abas no topo da tela Tarefas, e um botão "+ Nova tarefa".
- Dentro de um módulo, um botão "‹ Módulos" no topo volta para a escolha.
- Tocar numa notificação abre direto o módulo dela (Água ou Tarefas), sem passar pela escolha.
- "Sair deste aparelho" continua em Ajustes da Água e aparece também em Ajustes de Tarefas e na tela de escolha.

## Módulo Tarefas (lista de tarefas)

Funções aprovadas pelo usuário em 2026-11-26; regras confirmadas em 2026-11-26 (respostas 1 a 5 = "ok" às sugestões).

### Funções

1. **Tarefas do dia**: criar, marcar como feita e desfazer, com prazo opcional.
2. **Lembrete**: notificação no horário da tarefa, usando o mesmo sistema da Água (cron-job.org + Web Push).
3. **Recorrentes**: tarefas que se repetem todo dia ou em dias da semana escolhidos.
4. **Organização simples**: Hoje, Próximas e Atrasadas, sem projetos nem etiquetas.
5. **Histórico**: calendário com as tarefas concluídas por dia.

### Tarefa

- Campos: **título** (obrigatório, até 120 caracteres), **data** (opcional), **horário** (opcional, só com data) e **repetição** (nenhuma, todo dia ou dias da semana escolhidos).
- **Tarefa sem data** pode existir e aparece em **Hoje** até ser concluída (2026-11-26).
- Editar e excluir a qualquer momento. A exclusão é lógica: o que já foi concluído continua contando no histórico.

### Hoje, Próximas e Atrasadas

- **Hoje**: tarefas com data de hoje, recorrentes que caem hoje e tarefas sem data. Ordem por horário, as sem horário no fim. As concluídas hoje ficam na lista, riscadas, até a meia-noite.
- **Próximas**: tarefas com data futura, agrupadas por dia.
- **Atrasadas**: tarefas avulsas com data passada e não concluídas. Uma tarefa só vira atrasada **no dia seguinte**, depois da meia-noite de Brasília. Durante o dia, a tarefa com horário vencido fica só destacada em Hoje (2026-11-26).
- O dia vira à **meia-noite no horário de Brasília**, como na Água.

### Concluir e desfazer

- Tarefa avulsa pode ser concluída a qualquer momento, inclusive antes da data ou já atrasada. Conta no histórico do dia em que foi concluída.
- Desfazer a conclusão só no mesmo dia (dias passados não mudam). Logo depois de marcar, aparece o aviso com **Desfazer**.

### Recorrentes

- Repetem **todo dia** ou em **dias da semana escolhidos**. A recorrente não tem data: começa no dia em que é criada e o horário é opcional (2026-11-26).
- Uma tarefa avulsa não vira recorrente, nem o contrário: para isso, cria-se outra tarefa (2026-11-26).
- A ocorrência do dia aparece em **Hoje**, marcada com os dias ("Todo dia", "seg · qua · sex"). Todas as recorrentes ficam numa seção "Recorrentes" no fim de **Próximas**, para ver e editar (2026-11-26). Outras repetições ficam fora da primeira versão.
- Cada dia é uma ocorrência separada. **Não acumula**: a ocorrência não feita fica como "não feita" no histórico daquele dia e não vai para Atrasadas; hoje aparece só a de hoje (2026-11-26).
- Editar ou excluir uma recorrente vale de hoje em diante. Os dias passados não mudam.

### Lembrete

- Só para tarefa com horário. Chega **no horário exato**, sem opção de antecedência (2026-11-26).
- Uma notificação, sem repetir, com a janela de 10 minutos de atraso da Água. Não é enviada se a tarefa já foi concluída. Tocar nela abre o módulo Tarefas.
- Usa as notificações já ativadas no aparelho (a mesma inscrição serve para Água e Tarefas).

### Histórico

- Calendário do mês no visual do Histórico da Água, com o número de tarefas concluídas em cada dia (2026-11-26).
- O dia fica **verde** quando tudo o que era daquele dia foi feito e **vermelho** quando faltou algo. Hoje fica neutro até a meia-noite, como na Água (2026-11-26).
- "O que era daquele dia": as recorrentes que caíam no dia e as avulsas com data naquele dia. Dia sem nenhuma tarefa fica cinza e não entra na sequência nem no percentual.
- **Sequência** e **percentual do mês** com as mesmas regras da Água (2026-11-26).

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
