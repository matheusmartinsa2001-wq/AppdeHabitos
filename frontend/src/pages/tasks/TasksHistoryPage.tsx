/** Histórico de Tarefas: chega na Etapa 16 (calendário, sequência e percentual). */
export function TasksHistoryPage() {
  return (
    <div className="flex flex-col gap-[18px] px-6">
      <header className="flex flex-col gap-0.5 px-1 pt-1">
        <span className="text-[15px] font-bold text-muted-foreground">Tarefas</span>
        <h1 className="text-[34px] leading-10 font-black tracking-[-0.6px]">Histórico</h1>
      </header>
      <div className="flex flex-col gap-1.5 rounded-3xl bg-card px-5 py-6">
        <span className="self-start rounded-full bg-muted px-2.5 py-1 text-[13px] font-extrabold text-muted-foreground">
          Em breve
        </span>
        <p className="text-[15px] leading-snug font-bold text-muted-foreground">
          Aqui vai ficar o calendário com as tarefas concluídas por dia, a sequência e o percentual do mês.
        </p>
      </div>
    </div>
  )
}
