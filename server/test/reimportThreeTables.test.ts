import assert from 'node:assert/strict';
import test from 'node:test';

const { filterRelationalRows, parseInsertRows } = await import('../scripts/reimport-three-tables.mjs');

test('parses each top-level tuple independently when values contain commas and parentheses', () => {
  const parsed = parseInsertRows(
    `INSERT INTO "public"."goals" ("id", "child_id", "title", "shared_child_ids") VALUES
      ('goal-1', 'child-1', 'title, with (details)', ARRAY[]),
      ('goal-2', 'child-2', 'second', ARRAY['child-1','child-2']);`,
  );

  assert.equal(parsed.tuples.length, 2);
  assert.equal(parsed.rows[0][0], "'goal-1'");
  assert.equal(parsed.rows[1][0], "'goal-2'");
  assert.equal(parsed.rows[0][2], "'title, with (details)'");
  assert.equal(parsed.rows[1][3], "ARRAY['child-1','child-2']");
});

test('filters goals, trees, and tasks as one foreign-key-consistent set', () => {
  const result = filterRelationalRows(
    {
      goals: [
        ["'g1'", "'c1'"],
        ["'g2'", "'c2'"],
      ],
      trees: [
        ["'t1'", "'c1'", "'g1'"],
        ["'t2'", "'c2'", "'g2'"],
        ["'t3'", "'c1'", "'g2'"],
      ],
      tasks: [
        ["'x1'", "'g1'", "'c1'", "'t1'"],
        ["'x2'", "'g2'", "'c2'", "'t2'"],
        ["'x3'", "'g1'", "'c1'", "'missing-tree'"],
      ],
    },
    new Set(['c1']),
  );

  assert.deepEqual(result.goals.map(row => row[0]), ["'g1'"]);
  assert.deepEqual(result.trees.map(row => row[0]), ["'t1'"]);
  assert.deepEqual(result.tasks.map(row => row[0]), ["'x1'"]);
});
