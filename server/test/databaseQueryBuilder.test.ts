import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'mysql://test:test@127.0.0.1:3306/test';

const { QueryBuilder } = await import('../src/config/database.js');

type RecordedQuery = { sql: string; values: unknown[] };

class FakePool {
  public readonly queries: RecordedQuery[] = [];

  public async query(sql: string, values: unknown[] = []): Promise<[unknown, unknown]> {
    this.queries.push({ sql, values });

    if (sql.includes('SELECT `id`, `status` FROM `tasks`')) {
      return [[{ id: 'task-1', status: 'approved' }], []];
    }
    if (sql.includes('FROM `tasks`')) {
      return [[{ id: 'task-1', title: '阅读', goal_id: 'goal-1', tree_id: 'tree-1' }], []];
    }
    if (sql.includes('FROM `goals`')) {
      return [[{ id: 'goal-1', title: '阅读目标' }], []];
    }
    if (sql.includes('FROM `trees`')) {
      if (sql.includes('`goal_id` IN')) {
        return [[{ id: 'tree-1', name: '阅读树', goal_id: 'goal-1' }], []];
      }
      return [[{ id: 'tree-1', name: '阅读树' }], []];
    }
    return [[], []];
  }
}

test('translates filters and hydrates configured relations', async () => {
  const pool = new FakePool();
  const result = await new QueryBuilder('tasks', pool as never)
    .select('id, title, goals(title), trees(name)')
    .eq('child_id', 'child-1')
    .or('child_id.eq.child-1,shared_child_ids.cs.{child-1}');

  assert.equal(result.error, null);
  assert.deepEqual(result.data, [{
    id: 'task-1',
    title: '阅读',
    goals: { id: 'goal-1', title: '阅读目标' },
    trees: { id: 'tree-1', name: '阅读树' },
  }]);
  assert.match(pool.queries[0].sql, /`child_id` = \?/);
  assert.match(pool.queries[0].sql, /JSON_CONTAINS\(COALESCE\(`shared_child_ids`, JSON_ARRAY\(\)\), \?, '\$'\)/);
  assert.deepEqual(pool.queries[0].values, [
    'child-1',
    'child-1',
    '["child-1"]',
  ]);
});

test('hydrates trees as a has-many relation from goals', async () => {
  const pool = new FakePool();
  const result = await new QueryBuilder('goals', pool as never)
    .select('id, title, trees(id, name, goal_id)')
    .eq('id', 'goal-1');

  assert.equal(result.error, null);
  assert.deepEqual(result.data, [{
    id: 'goal-1',
    title: '阅读目标',
    trees: [{ id: 'tree-1', name: '阅读树', goal_id: 'goal-1' }],
  }]);
  assert.match(pool.queries[1].sql, /FROM `trees` WHERE `goal_id` IN \(\?\)/);
  assert.deepEqual(pool.queries[1].values, ['goal-1']);
});

test('keeps update placeholders after filters and returns a single row', async () => {
  const pool = new FakePool();
  const result = await new QueryBuilder('tasks', pool as never)
    .update({ status: 'approved' })
    .eq('id', 'task-1')
    .select('id, status')
    .single();

  assert.equal(result.error, null);
  assert.deepEqual(result.data, { id: 'task-1', status: 'approved' });
  assert.deepEqual(pool.queries[0].values, ['approved', 'task-1']);
  assert.match(pool.queries[0].sql, /UPDATE `tasks` SET `status` = \? WHERE `id` = \?/);
});
