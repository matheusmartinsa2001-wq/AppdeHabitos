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
  done: boolean;
}
interface Lists {
  day: string;
  today: Task[];
  upcoming: Task[];
  overdue: Task[];
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
      'TRUNCATE TABLE task_completions, tasks CASCADE',
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

  it('id inválido: 400', async () => {
    await ctx
      .http()
      .post('/api/tasks/nao-e-uuid/complete')
      .set(session.auth)
      .expect(400);
  });
});
