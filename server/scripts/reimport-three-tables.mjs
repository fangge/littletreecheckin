import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { convertPostgresInsert } from './import-backup.mjs';

const scriptDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const serverDirectory = resolve(scriptDirectory, '..');
const projectDirectory = resolve(serverDirectory, '..');

dotenv.config({ path: resolve(projectDirectory, '.env.local') });
dotenv.config({ path: resolve(projectDirectory, '.env') });

const tableFiles = {
  goals: 'goals_rows.sql',
  trees: 'trees_rows.sql',
  tasks: 'tasks_rows.sql',
};

const valueOf = field => {
  const value = field.trim();
  if (value.toUpperCase() === 'NULL') return null;
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
};

const scanTuples = sql => {
  const valuesMatch = /\bVALUES\b/i.exec(sql);
  if (!valuesMatch) throw new Error('备份 SQL 中不存在 VALUES 子句');

  const tuples = [];
  let currentStart = -1;
  let depth = 0;
  let quote = false;

  for (let index = valuesMatch.index + valuesMatch[0].length; index < sql.length; index += 1) {
    const character = sql[index];
    if (quote) {
      if (character === "'" && sql[index + 1] === "'") {
        index += 1;
      } else if (character === "'") {
        quote = false;
      }
      continue;
    }
    if (character === "'") {
      quote = true;
      continue;
    }
    if (character === '(') {
      if (depth === 0) currentStart = index;
      depth += 1;
      continue;
    }
    if (character === ')') {
      depth -= 1;
      if (depth < 0) throw new Error('备份 SQL 中存在未配对的括号');
      if (depth === 0) {
        tuples.push(sql.slice(currentStart, index + 1));
        currentStart = -1;
      }
    }
  }

  if (quote || depth !== 0 || currentStart !== -1) {
    throw new Error('备份 SQL 中存在未闭合的字符串或 tuple');
  }
  if (tuples.length === 0) throw new Error('备份 SQL 中没有可导入的 tuple');
  return { valuesEnd: valuesMatch.index + valuesMatch[0].length, tuples };
};

const splitTupleFields = tuple => {
  const body = tuple.slice(1, -1);
  const fields = [];
  let start = 0;
  let quote = false;
  let bracketDepth = 0;
  let parenthesisDepth = 0;

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (quote) {
      if (character === "'" && body[index + 1] === "'") {
        index += 1;
      } else if (character === "'") {
        quote = false;
      }
      continue;
    }
    if (character === "'") {
      quote = true;
    } else if (character === '[') {
      bracketDepth += 1;
    } else if (character === ']') {
      bracketDepth -= 1;
    } else if (character === '(') {
      parenthesisDepth += 1;
    } else if (character === ')') {
      parenthesisDepth -= 1;
    } else if (character === ',' && bracketDepth === 0 && parenthesisDepth === 0) {
      fields.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }

  fields.push(body.slice(start).trim());
  if (quote || bracketDepth !== 0 || parenthesisDepth !== 0) {
    throw new Error('备份 SQL 中存在未闭合的字段值');
  }
  return fields;
};

const parseInsertRows = sql => {
  const { valuesEnd, tuples } = scanTuples(sql);
  return {
    header: sql.slice(0, valuesEnd).trimEnd(),
    tuples,
    rows: tuples.map(splitTupleFields),
  };
};

const buildInsertSql = (parsed, tuples) => `${parsed.header} ${tuples.join(', ')};`;

const selectKeptTuples = (parsed, keptRows) => {
  const keptRowSet = new Set(keptRows);
  return parsed.tuples.filter((_, index) => keptRowSet.has(parsed.rows[index]));
};

const filterRelationalRows = ({ goals, trees, tasks }, childIds) => {
  const keptGoals = goals.filter(row => childIds.has(valueOf(row[1])));
  const goalIds = new Set(keptGoals.map(row => valueOf(row[0])));
  const keptTrees = trees.filter(row => (
    childIds.has(valueOf(row[1]))
    && (valueOf(row[2]) === null || goalIds.has(valueOf(row[2])))
  ));
  const treeIds = new Set(keptTrees.map(row => valueOf(row[0])));
  const keptTasks = tasks.filter(row => (
    childIds.has(valueOf(row[2]))
    && goalIds.has(valueOf(row[1]))
    && (valueOf(row[3]) === null || treeIds.has(valueOf(row[3])))
  ));
  return { goals: keptGoals, trees: keptTrees, tasks: keptTasks };
};

const readBackup = async backupDirectory => {
  const parsed = {};
  for (const [table, fileName] of Object.entries(tableFiles)) {
    parsed[table] = parseInsertRows(await readFile(resolve(backupDirectory, fileName), 'utf8'));
  }
  return parsed;
};

const countRows = async (connection, table) => {
  const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
  return Number(rows[0].count);
};

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const backupDirectory = resolve(
    args.find(argument => argument !== '--dry-run')
      || process.env.BACKUP_DIR
      || resolve(projectDirectory, '../littletreesql_backup'),
  );
  const parsed = await readBackup(backupDirectory);

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    multipleStatements: true,
    charset: 'utf8mb4',
    timezone: 'Z',
  });

  let transactionStarted = false;
  try {
    const [childRows] = await connection.query('SELECT id FROM children');
    const childIds = new Set(childRows.map(row => String(row.id)));
    const sourceRows = Object.fromEntries(Object.entries(parsed).map(([table, value]) => [table, value.rows]));
    const keptRows = filterRelationalRows(sourceRows, childIds);
    const skippedRows = Object.fromEntries(
      Object.entries(sourceRows).map(([table, rows]) => [table, rows.length - keptRows[table].length]),
    );

    console.log(JSON.stringify({
      backupDirectory,
      source: Object.fromEntries(Object.entries(sourceRows).map(([table, rows]) => [table, rows.length])),
      import: Object.fromEntries(Object.entries(keptRows).map(([table, rows]) => [table, rows.length])),
      skipped: skippedRows,
    }, null, 2));

    if (dryRun) return;

    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query('DELETE FROM tasks');
    await connection.query('DELETE FROM trees');
    await connection.query('DELETE FROM goals');

    for (const table of ['goals', 'trees', 'tasks']) {
      const tuples = selectKeptTuples(parsed[table], keptRows[table]);
      const sql = buildInsertSql(parsed[table], tuples);
      await connection.query(convertPostgresInsert(sql));
    }

    const counts = {};
    for (const table of ['goals', 'trees', 'tasks']) counts[table] = await countRows(connection, table);
    const [orphanRows] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM trees t LEFT JOIN goals g ON g.id = t.goal_id WHERE t.goal_id IS NOT NULL AND g.id IS NULL) AS orphan_tree_goals,
        (SELECT COUNT(*) FROM tasks t LEFT JOIN goals g ON g.id = t.goal_id WHERE g.id IS NULL) AS orphan_task_goals,
        (SELECT COUNT(*) FROM tasks t LEFT JOIN trees tr ON tr.id = t.tree_id WHERE t.tree_id IS NOT NULL AND tr.id IS NULL) AS orphan_task_trees
    `);
    const expected = Object.fromEntries(Object.entries(keptRows).map(([table, rows]) => [table, rows.length]));
    const orphanCounts = Object.fromEntries(Object.entries(orphanRows[0]).map(([key, value]) => [key, Number(value)]));
    const countsMatch = ['goals', 'trees', 'tasks'].every(table => counts[table] === expected[table]);
    if (!countsMatch || Object.values(orphanCounts).some(value => value !== 0)) {
      throw new Error(`导入后校验失败: ${JSON.stringify({ counts, expected, orphanCounts })}`);
    }

    await connection.commit();
    console.log(JSON.stringify({ committed: true, counts, orphanCounts }, null, 2));
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
};

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) await main();

export { filterRelationalRows, parseInsertRows, selectKeptTuples };
