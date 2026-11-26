import { brasiliaNow, toDayString } from '../src/common/utils/brasilia';
import {
  createTestApp,
  login,
  resetDatabase,
  Session,
  TestContext,
} from './e2e/helpers';

interface Task {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  repeat: number[] | null;
  done: boolean;
}
interface Lists {
  day: string;
  today: Task[];
  upcoming: Task[];
  overdue: Task[];
  recurring: Task[];
}

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDayString(date);
};

describe('Tarefas (e2e)', () => {
  let ctx: TestContext;
  let session: Session;
  const today = toDayString(brasiliaNow().today);

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx);
    session = await login(ctx);
  });

  beforeEach(async () => {
    await ctx.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE task_completions, task_repeat_changes, tasks CASCADE',
    );
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const lists = async () =>
    (await ctx.http().get('/api/tasks').set(session.auth).expect(200))
      .body as Lists;

  const create = async (body: object) =>
    (
      await ctx
        .http()
        .post('/api/tasks')
        .set(session.auth)
        .send(body)
        .expect(201)
    ).body as Lists;

  it('exige login', async () => {
    await ctx.http().get('/api/tasks').expect(401);
  });

  it('cria e separa em Hoje e Próximas', async () => {
    await create({ title: '  Sem data  ' });
    await create({ title: 'Hoje', date: today, time: '07:00' });
    const result = await create({ title: 'Amanhã', date: addDays(today, 1) });

    expect(result.day).toBe(today);
    expect(result.today.map((t) => t.title)).toEqual(['Hoje', 'Sem data']);
    expect(result.today[0]).toMatchObject({ date: today, time: '07:00' });
    expect(result.upcoming.map((t) => t.title)).toEqual(['Amanhã']);
    expect(result.overdue).toEqual([]);
  });

  it('tarefa com data passada (criada antes) aparece em Atrasadas', async () => {
    await ctx.prisma.task.create({
      data: {
        title: 'Esquecida',
        dueDate: new Date(`${addDays(today, -2)}T00:00:00Z`),
      },
    });
    expect((await lists()).overdue.map((t) => t.title)).toEqual(['Esquecida']);
  });

  it('valida título, data e horário', async () => {
    const res = await ctx
      .http()
      .post('/api/tasks')
      .set(session.auth)
      .send({ title: '   ', date: 'amanhã', extra: 1 })
      .expect(400);
    expect((res.body as { message: string[] }).message.length).toBeGreaterThan(
      0,
    );

    await ctx
      .http()
      .post('/api/tasks')
      .set(session.auth)
      .send({ title: 'x'.repeat(121) })
      .expect(400);
    await ctx
      .http()
      .post('/api/tasks')
      .set(session.auth)
      .send({ title: 'Ontem', date: addDays(today, -1) })
      .expect(400);
    await ctx
      .http()
      .post('/api/tasks')
      .set(session.auth)
      .send({ title: 'Só horário', time: '10:00' })
      .expect(400);
  });

  it('edita, conclui, desfaz e exclui', async () => {
    const [task] = (await create({ title: 'Ligar para o banco' })).today;

    const edited = (
      await ctx
        .http()
        .patch(`/api/tasks/${task.id}`)
        .set(session.auth)
        .send({ date: addDays(today, 3), time: '14:00' })
        .expect(200)
    ).body as Lists;
    expect(edited.upcoming[0]).toMatchObject({
      id: task.id,
      title: 'Ligar para o banco',
      time: '14:00',
    });

    // Concluir antes da data: sai de Próximas e aparece riscada em Hoje.
    const done = (
      await ctx
        .http()
        .post(`/api/tasks/${task.id}/complete`)
        .set(session.auth)
        .expect(200)
    ).body as Lists;
    expect(done.upcoming).toEqual([]);
    expect(done.today).toEqual([
      expect.objectContaining({ id: task.id, done: true }),
    ]);

    await ctx
      .http()
      .post(`/api/tasks/${task.id}/complete`)
      .set(session.auth)
      .expect(409);

    const undone = (
      await ctx
        .http()
        .delete(`/api/tasks/${task.id}/complete`)
        .set(session.auth)
        .expect(200)
    ).body as Lists;
    expect(undone.upcoming[0]).toMatchObject({ id: task.id, done: false });

    await ctx
      .http()
      .delete(`/api/tasks/${task.id}`)
      .set(session.auth)
      .expect(200);
    const after = await lists();
    expect([...after.today, ...after.upcoming, ...after.overdue]).toEqual([]);
    await ctx
      .http()
      .patch(`/api/tasks/${task.id}`)
      .set(session.auth)
      .send({ title: 'x' })
      .expect(404);
  });

  it('conclusão de outro dia não pode ser desfeita e some das listas', async () => {
    const task = await ctx.prisma.task.create({ data: { title: 'Antiga' } });
    await ctx.prisma.taskCompletion.create({
      data: {
        taskId: task.id,
        day: new Date(`${addDays(today, -1)}T00:00:00Z`),
      },
    });
    expect((await lists()).today).toEqual([]);
    await ctx
      .http()
      .delete(`/api/tasks/${task.id}/complete`)
      .set(session.auth)
      .expect(409);
  });

  it('recorrente: aparece hoje, conclui a ocorrência e guarda a regra dos dias', async () => {
    const todayWeekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const otherWeekday = (todayWeekday + 1) % 7;
    const created = await create({
      title: 'Academia',
      repeat: [todayWeekday],
      time: '06:00',
    });
    const [rec] = created.recurring;
    expect(rec).toMatchObject({
      title: 'Academia',
      date: null,
      time: '06:00',
      repeat: [todayWeekday],
    });
    expect(created.today.map((t) => t.id)).toEqual([rec.id]);

    const done = (
      await ctx
        .http()
        .post(`/api/tasks/${rec.id}/complete`)
        .set(session.auth)
        .expect(200)
    ).body as Lists;
    expect(done.today[0]).toMatchObject({ id: rec.id, done: true });
    await ctx
      .http()
      .post(`/api/tasks/${rec.id}/complete`)
      .set(session.auth)
      .expect(409);
    await ctx
      .http()
      .delete(`/api/tasks/${rec.id}/complete`)
      .set(session.auth)
      .expect(200);

    // Muda os dias: sai de Hoje, a regra de hoje é regravada.
    const moved = (
      await ctx
        .http()
        .patch(`/api/tasks/${rec.id}`)
        .set(session.auth)
        .send({ repeat: [otherWeekday] })
        .expect(200)
    ).body as Lists;
    expect(moved.today).toEqual([]);
    expect(moved.recurring[0].repeat).toEqual([otherWeekday]);
    const changes = await ctx.prisma.taskRepeatChange.findMany({
      where: { taskId: rec.id },
    });
    expect(changes).toHaveLength(1);
    expect(changes[0].repeatDays).toBe(1 << otherWeekday);

    await ctx
      .http()
      .post(`/api/tasks/${rec.id}/complete`)
      .set(session.auth)
      .expect(409);
  });

  it('recorrente: sem data, e não troca de tipo', async () => {
    await ctx
      .http()
      .post('/api/tasks')
      .set(session.auth)
      .send({ title: 'X', repeat: [1], date: today })
      .expect(400);
    await ctx
      .http()
      .post('/api/tasks')
      .set(session.auth)
      .send({ title: 'X', repeat: [] })
      .expect(400);
    await ctx
      .http()
      .post('/api/tasks')
      .set(session.auth)
      .send({ title: 'X', repeat: [7] })
      .expect(400);

    const [avulsa] = (await create({ title: 'Avulsa' })).today;
    await ctx
      .http()
      .patch(`/api/tasks/${avulsa.id}`)
      .set(session.auth)
      .send({ repeat: [1] })
      .expect(400);
  });

  it('id inválido: 400', async () => {
    await ctx
      .http()
      .post('/api/tasks/nao-e-uuid/complete')
      .set(session.auth)
      .expect(400);
  });
});
