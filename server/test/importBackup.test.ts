import assert from 'node:assert/strict';
import test from 'node:test';

const { convertPostgresInsert } = await import('../scripts/import-backup.mjs');

test('converts Supabase PostgreSQL row exports to MySQL syntax', () => {
  const converted = convertPostgresInsert(
    `INSERT INTO "public"."goals" ("id", "is_active", "shared_child_ids", "created_at") VALUES ('goal-1', true, ARRAY['child-1','child-2'], '2026-08-31 16:00:00.123+00');`,
  );

  assert.equal(
    converted,
    "INSERT INTO `goals` (`id`, `is_active`, `shared_child_ids`, `created_at`) VALUES ('goal-1', 1, JSON_ARRAY('child-1','child-2'), '2026-08-31 16:00:00.123');",
  );
});

test('keeps JSON strings and escaped text intact', () => {
  const converted = convertPostgresInsert(
    `INSERT INTO "public"."medals" ("id", "description", "unlock_condition") VALUES ('medal-1', '孩子''的勋章', '{"type":"total_tasks","threshold":30}');`,
  );

  assert.match(converted, /`medals`/);
  assert.match(converted, /'孩子''的勋章'/);
  assert.match(converted, /'\{"type":"total_tasks","threshold":30\}'/);
});
