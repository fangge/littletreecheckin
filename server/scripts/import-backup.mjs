import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const scriptDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const serverDirectory = resolve(scriptDirectory, '..');
const projectDirectory = resolve(serverDirectory, '..');
const schemaFile = resolve(serverDirectory, 'db/schema.sql');

dotenv.config({ path: resolve(projectDirectory, '.env.local') });
dotenv.config({ path: resolve(projectDirectory, '.env') });

const backupDirectory = resolve(process.argv[2] || process.env.BACKUP_DIR || resolve(projectDirectory, '../littletreesql_backup'));

const dataFiles = [
  'profiles_rows.sql',
  'children_rows.sql',
  'goals_rows.sql',
  'trees_rows.sql',
  'tasks_rows.sql',
  'medals_rows.sql',
  'child_medals_rows.sql',
  'rewards_rows.sql',
  'reward_redemptions_rows.sql',
  'cash_exchange_settings_rows.sql',
  'cash_redemptions_rows.sql',
  'messages_rows.sql',
];

const isWhitespace = character => /\s/.test(character);

const parseDateLiteral = value => {
  const match = value.match(/^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d+)?)([+-])(\d\d)(?::?(\d\d))?$/);
  if (!match) return null;
  const [, datePart, sign, hours, minutes = '00'] = match;
  const date = new Date(`${datePart.replace(' ', 'T')}${sign}${hours}:${minutes}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 23).replace('T', ' ');
};

const convertStringLiteral = value => {
  const unquoted = value.slice(1, -1).replaceAll("''", "'");
  const date = parseDateLiteral(unquoted);
  if (!date) return value;
  return `'${date}'`;
};

const findArrayEnd = (sql, start) => {
  let depth = 0;
  let quote = false;
  for (let index = start; index < sql.length; index += 1) {
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
    if (character === '[') depth += 1;
    if (character === ']') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error('备份 SQL 中存在未闭合的 ARRAY[...]');
};

const convertPostgresInsert = sql => {
  let output = '';
  let index = 0;
  let quote = false;

  while (index < sql.length) {
    const character = sql[index];
    if (quote) {
      if (character === "'" && sql[index + 1] === "'") {
        output += "''";
        index += 2;
        continue;
      }
      if (character === "'") quote = false;
      output += character;
      index += 1;
      continue;
    }

    if (character === "'") {
      const end = (() => {
        let cursor = index + 1;
        while (cursor < sql.length) {
          if (sql[cursor] === "'" && sql[cursor + 1] === "'") {
            cursor += 2;
            continue;
          }
          if (sql[cursor] === "'") return cursor;
          cursor += 1;
        }
        throw new Error('备份 SQL 中存在未闭合的字符串');
      })();
      output += convertStringLiteral(sql.slice(index, end + 1));
      index = end + 1;
      continue;
    }

    if (sql.startsWith('ARRAY[', index)) {
      const end = findArrayEnd(sql, index + 5);
      output += `JSON_ARRAY(${sql.slice(index + 6, end)})`;
      index = end + 1;
      continue;
    }

    if (sql.startsWith('"public"."', index)) {
      const prefix = '"public"."';
      const tableStart = index + prefix.length;
      const end = sql.indexOf('"', tableStart);
      if (end === -1) throw new Error('备份 SQL 中存在未闭合的表名');
      output += `\`${sql.slice(tableStart, end)}\``;
      index = end + 1;
      continue;
    }

    if (character === '"') {
      const end = sql.indexOf('"', index + 1);
      if (end === -1) throw new Error('备份 SQL 中存在未闭合的字段名');
      output += `\`${sql.slice(index + 1, end)}\``;
      index = end + 1;
      continue;
    }

    if ((character === 't' || character === 'f') && (index === 0 || isWhitespace(sql[index - 1]) || sql[index - 1] === ',')) {
      if (sql.startsWith('true', index) && (isWhitespace(sql[index + 4]) || ',)'.includes(sql[index + 4] || ''))) {
        output += '1';
        index += 4;
        continue;
      }
      if (sql.slice(index, index + 5) === 'false' && (isWhitespace(sql[index + 5]) || ',)'.includes(sql[index + 5] || ''))) {
        output += '0';
        index += 5;
        continue;
      }
    }

    output += character;
    index += 1;
  }

  return output;
};

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    multipleStatements: true,
    charset: 'utf8mb4',
    timezone: 'Z',
  });

  try {
    await connection.query(await readFile(schemaFile, 'utf8'));
    await connection.beginTransaction();
    for (const fileName of dataFiles) {
      const filePath = resolve(backupDirectory, fileName);
      const convertedSql = convertPostgresInsert(await readFile(filePath, 'utf8'));
      const [result] = await connection.query(convertedSql);
      console.log(`Imported ${fileName}: ${result.affectedRows} rows`);
    }
    await connection.commit();
    console.log(`Imported MySQL schema and ${dataFiles.length} backup files from ${backupDirectory}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
};

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) await main();

export { convertPostgresInsert };
