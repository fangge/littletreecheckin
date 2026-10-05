import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import type { Pool, PoolConnection } from 'mysql2/promise';

type QueryError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

export type QueryResponse<T = any> = {
  data: T | null;
  error: QueryError | null;
  count?: number | null;
};

type SelectOptions = {
  count?: 'exact';
  head?: boolean;
};

type RelationSelection = {
  name: string;
  columns: string[];
};

type ParsedSelection = {
  columns: string[];
  relations: RelationSelection[];
};

type RelationDefinition = {
  table: string;
  foreignKey: string;
  cardinality?: 'one' | 'many';
};

type DbRow = Record<string, any>;

type SqlExecutor = {
  query(sql: string, values?: unknown[]): Promise<[unknown, unknown]>;
};

const relationDefinitions: Record<string, RelationDefinition> = {
  'goals.trees': { table: 'trees', foreignKey: 'goal_id', cardinality: 'many' },
  'tasks.goals': { table: 'goals', foreignKey: 'goal_id' },
  'tasks.trees': { table: 'trees', foreignKey: 'tree_id' },
  'reward_redemptions.rewards': { table: 'rewards', foreignKey: 'reward_id' },
  'reward_redemptions.children': { table: 'children', foreignKey: 'child_id' },
  'cash_redemptions.children': { table: 'children', foreignKey: 'child_id' },
};

const allowedTables = new Set([
  'profiles',
  'children',
  'goals',
  'trees',
  'tasks',
  'medals',
  'child_medals',
  'rewards',
  'reward_redemptions',
  'cash_exchange_settings',
  'cash_redemptions',
  'messages',
  'push_subscriptions',
]);

const jsonColumns = new Set(['shared_child_ids', 'unlock_condition', 'subscription']);
const booleanColumns = new Set(['is_deleted', 'is_active', 'is_shared', 'is_read', 'is_enabled']);
const dateColumns = new Set(['created_at', 'updated_at', 'checkin_time', 'redeemed_at', 'unlocked_at', 'completed_at']);

const quoteIdentifier = (identifier: string): string => {
  if (identifier === '*') return '*';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`非法数据库标识符: ${identifier}`);
  }
  return `\`${identifier}\``;
};

const splitTopLevel = (value: string): string[] => {
  const result: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index - 1] !== '\\') quote = null;
      continue;
    }
    if (character === '\'' || character === '"') {
      quote = character;
      continue;
    }
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  const tail = value.slice(start).trim();
  if (tail) result.push(tail);
  return result;
};

const parseSelection = (selection?: string): ParsedSelection => {
  const source = selection?.trim() || '*';
  if (source === '*') return { columns: [], relations: [] };

  const columns: string[] = [];
  const relations: RelationSelection[] = [];
  for (const token of splitTopLevel(source)) {
    const openIndex = token.indexOf('(');
    if (openIndex > 0 && token.endsWith(')')) {
      const name = token.slice(0, openIndex).trim();
      const relationColumns = splitTopLevel(token.slice(openIndex + 1, -1))
        .map(column => column.trim())
        .filter(Boolean);
      relations.push({ name, columns: relationColumns });
      continue;
    }
    if (token) columns.push(token);
  }
  return { columns, relations };
};

const errorFrom = (cause: unknown): QueryError => {
  const error = cause as { message?: string; code?: string; errno?: number; sqlMessage?: string; detail?: string; hint?: string };
  const code = error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062 ? '23505' : error?.code || (error?.errno ? String(error.errno) : undefined);
  return {
    message: error?.sqlMessage || error?.message || '数据库操作失败',
    code,
    details: error?.detail,
    hint: error?.hint,
  };
};

const rowsFrom = (result: [unknown, unknown]): DbRow[] => {
  const rows = result[0];
  return Array.isArray(rows) ? rows as DbRow[] : [];
};

const formatDateForMysql = (value: unknown): unknown => {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 23).replace('T', ' ');
};

const toDatabaseValue = (column: string, value: unknown): unknown => {
  if (value === undefined) return null;
  if (jsonColumns.has(column) && value !== null && typeof value !== 'string') return JSON.stringify(value);
  if (dateColumns.has(column) && value !== null) return formatDateForMysql(value);
  return value;
};

const normalizeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeRow = (row: DbRow): DbRow => {
  const normalized = { ...row };
  for (const column of jsonColumns) {
    if (column in normalized) normalized[column] = normalizeJson(normalized[column]);
  }
  for (const column of booleanColumns) {
    if (column in normalized && normalized[column] !== null) normalized[column] = Boolean(normalized[column]);
  }
  for (const column of dateColumns) {
    const value = normalized[column];
    if (value instanceof Date) normalized[column] = value.toISOString();
    else if (typeof value === 'string' && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d/.test(value)) {
      normalized[column] = `${value.replace(' ', 'T')}Z`;
    }
  }
  return normalized;
};

export class QueryBuilder<T = any> implements PromiseLike<QueryResponse<T>> {
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selection?: string;
  private selectionOptions: SelectOptions = {};
  private payload: Record<string, unknown> | Array<Record<string, unknown>> = {};
  private filters: Array<{ sql: string; values: unknown[] }> = [];
  private ordering: { column: string; ascending: boolean }[] = [];
  private rowLimit?: number;
  private rowOffset?: number;
  private singleMode: 'single' | 'maybeSingle' | null = null;
  private conflictColumns?: string;

  public constructor(
    private readonly table: string,
    private readonly pool: SqlExecutor,
  ) {
    if (!allowedTables.has(table)) throw new Error(`不支持的数据库表: ${table}`);
  }

  public select(columns = '*', options: SelectOptions = {}): QueryBuilder<any[]> {
    this.selection = columns;
    this.selectionOptions = options;
    return this as QueryBuilder<any[]>;
  }

  public insert(values: Record<string, unknown> | Array<Record<string, unknown>>): QueryBuilder<any> {
    this.operation = 'insert';
    this.payload = values;
    return this;
  }

  public update(values: Record<string, unknown>): QueryBuilder<any> {
    this.operation = 'update';
    this.payload = values;
    return this;
  }

  public delete(): QueryBuilder<any> {
    this.operation = 'delete';
    return this;
  }

  public upsert(values: Record<string, unknown>, options: { onConflict?: string } = {}): QueryBuilder<any> {
    this.operation = 'insert';
    this.payload = values;
    this.conflictColumns = options.onConflict;
    return this;
  }

  public eq(column: string, value: unknown): QueryBuilder<T> {
    if (value === null) return this.addFilter(`${quoteIdentifier(column)} IS NULL`, []);
    return this.addFilter(`${quoteIdentifier(column)} = ?`, [toDatabaseValue(column, value)]);
  }

  public neq(column: string, value: unknown): QueryBuilder<T> {
    if (value === null) return this.addFilter(`${quoteIdentifier(column)} IS NOT NULL`, []);
    return this.addFilter(`${quoteIdentifier(column)} <> ?`, [toDatabaseValue(column, value)]);
  }

  public not(column: string, operator: string, value: unknown): QueryBuilder<T> {
    if (operator === 'eq') return this.neq(column, value);
    if (operator === 'is' && value === null) return this.addFilter(`${quoteIdentifier(column)} IS NOT NULL`, []);
    throw new Error(`不支持的 not 条件: ${operator}`);
  }

  public gt(column: string, value: unknown): QueryBuilder<T> {
    return this.addFilter(`${quoteIdentifier(column)} > ?`, [toDatabaseValue(column, value)]);
  }

  public gte(column: string, value: unknown): QueryBuilder<T> {
    return this.addFilter(`${quoteIdentifier(column)} >= ?`, [toDatabaseValue(column, value)]);
  }

  public lt(column: string, value: unknown): QueryBuilder<T> {
    return this.addFilter(`${quoteIdentifier(column)} < ?`, [toDatabaseValue(column, value)]);
  }

  public lte(column: string, value: unknown): QueryBuilder<T> {
    return this.addFilter(`${quoteIdentifier(column)} <= ?`, [toDatabaseValue(column, value)]);
  }

  public in(column: string, values: unknown[]): QueryBuilder<T> {
    if (values.length === 0) {
      this.filters.push({ sql: '1 = 0', values: [] });
      return this;
    }
    const placeholders = values.map(() => '?').join(', ');
    return this.addFilter(`${quoteIdentifier(column)} IN (${placeholders})`, values.map(value => toDatabaseValue(column, value)));
  }

  public contains(column: string, values: unknown[]): QueryBuilder<T> {
    return this.addFilter(`JSON_CONTAINS(COALESCE(${quoteIdentifier(column)}, JSON_ARRAY()), ?, '$')`, [JSON.stringify(values)]);
  }

  public or(expression: string): QueryBuilder<T> {
    const parts = expression.split(',').map(part => part.trim()).filter(Boolean);
    const sqlParts: string[] = [];
    const values: unknown[] = [];

    for (const part of parts) {
      const match = part.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.(eq|cs)\.(.+)$/);
      if (!match) throw new Error(`不支持的 or 条件: ${part}`);
      const [, column, operator, rawValue] = match;
      if (operator === 'eq') {
        sqlParts.push(`${quoteIdentifier(column)} = ?`);
        values.push(rawValue);
      } else {
        const arrayValue = rawValue.startsWith('{') && rawValue.endsWith('}')
          ? rawValue.slice(1, -1).split(',').filter(Boolean)
          : [rawValue];
        sqlParts.push(`JSON_CONTAINS(COALESCE(${quoteIdentifier(column)}, JSON_ARRAY()), ?, '$')`);
        values.push(JSON.stringify(arrayValue));
      }
    }

    this.filters.push({ sql: `(${sqlParts.join(' OR ')})`, values });
    return this;
  }

  public order(column: string, options: { ascending?: boolean } = {}): QueryBuilder<T> {
    this.ordering.push({ column, ascending: options.ascending !== false });
    return this;
  }

  public limit(value: number): QueryBuilder<T> {
    this.rowLimit = value;
    return this;
  }

  public range(from: number, to: number): QueryBuilder<T> {
    this.rowOffset = from;
    this.rowLimit = Math.max(0, to - from + 1);
    return this;
  }

  public single(): QueryBuilder<any> {
    this.singleMode = 'single';
    return this as QueryBuilder<any>;
  }

  public maybeSingle(): QueryBuilder<any> {
    this.singleMode = 'maybeSingle';
    return this as QueryBuilder<any>;
  }

  public then<TResult1 = QueryResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private addFilter(sql: string, values: unknown[]): QueryBuilder<T> {
    this.filters.push({ sql, values });
    return this;
  }

  private buildWhere(): { sql: string; values: unknown[] } {
    return {
      sql: this.filters.length ? ` WHERE ${this.filters.map(filter => filter.sql).join(' AND ')}` : '',
      values: this.filters.flatMap(filter => filter.values),
    };
  }

  private parseSelection(): ParsedSelection {
    return parseSelection(this.selection);
  }

  private selectedColumns(columns: string[]): string {
    if (columns.length === 0 || columns.includes('*')) return '*';
    return columns.map(column => quoteIdentifier(column)).join(', ');
  }

  private async hydrateRelations(rows: DbRow[], relations: RelationSelection[], selectedColumns: string[]): Promise<DbRow[]> {
    if (rows.length === 0 || relations.length === 0) return rows;

    const hydratedRows = rows.map(normalizeRow);
    for (const relation of relations) {
      const definition = relationDefinitions[`${this.table}.${relation.name}`];
      if (!definition) throw new Error(`未配置的关联关系: ${this.table}.${relation.name}`);

      if (definition.cardinality === 'many') {
        const parentIds = [...new Set(
          rows.map(row => row.id).filter((value): value is string => Boolean(value)),
        )];
        if (parentIds.length === 0) {
          for (const row of hydratedRows) row[relation.name] = [];
          continue;
        }

        const columns = relation.columns.length ? [...relation.columns] : ['*'];
        const hasForeignKey = columns.includes('*') || columns.includes(definition.foreignKey);
        if (!hasForeignKey) columns.push(definition.foreignKey);
        const placeholders = parentIds.map(() => '?').join(', ');
        const result = await this.pool.query(
          `SELECT ${this.selectedColumns(columns)} FROM ${quoteIdentifier(definition.table)} WHERE ${quoteIdentifier(definition.foreignKey)} IN (${placeholders})`,
          parentIds,
        );
        const grouped = new Map<string, DbRow[]>();
        for (const child of rowsFrom(result)) {
          const parentId = child[definition.foreignKey];
          if (!parentId) continue;
          const normalizedChild = normalizeRow(child);
          if (!hasForeignKey) delete normalizedChild[definition.foreignKey];
          const children = grouped.get(String(parentId)) || [];
          children.push(normalizedChild);
          grouped.set(String(parentId), children);
        }
        for (const row of hydratedRows) {
          row[relation.name] = grouped.get(String(row.id)) || [];
        }
        continue;
      }

      const foreignKeys = [...new Set(
        rows.map(row => row[definition.foreignKey]).filter((value): value is string => Boolean(value)),
      )];
      if (foreignKeys.length === 0) {
        for (const row of hydratedRows) row[relation.name] = null;
        continue;
      }

      const columns = relation.columns.length ? relation.columns : ['*'];
      const placeholders = foreignKeys.map(() => '?').join(', ');
      const result = await this.pool.query(
        `SELECT ${this.selectedColumns(columns)} FROM ${quoteIdentifier(definition.table)} WHERE ${quoteIdentifier('id')} IN (${placeholders})`,
        foreignKeys,
      );
      const byId = new Map(rowsFrom(result).map(row => [String(row.id), normalizeRow(row)]));
      for (const row of hydratedRows) {
        const foreignKey = row[definition.foreignKey];
        row[relation.name] = foreignKey ? byId.get(String(foreignKey)) || null : null;
        if (selectedColumns.length > 0 && !selectedColumns.includes(definition.foreignKey)) {
          delete row[definition.foreignKey];
        }
      }
    }
    return hydratedRows;
  }

  private async execute(): Promise<QueryResponse<T>> {
    try {
      if (this.operation === 'select') return await this.executeSelect();
      return await this.executeMutation();
    } catch (cause) {
      return { data: null, error: errorFrom(cause) };
    }
  }

  private async selectRows(
    where: { sql: string; values: unknown[] },
    parsedSelection: ParsedSelection,
    limitAndOrder = true,
  ): Promise<DbRow[]> {
    const queryColumns = [...parsedSelection.columns];
    for (const relation of parsedSelection.relations) {
      const definition = relationDefinitions[`${this.table}.${relation.name}`];
      if (!definition) continue;
      if (definition.cardinality === 'many') {
        if (!queryColumns.includes('id')) queryColumns.push('id');
      } else if (!queryColumns.includes(definition.foreignKey)) {
        queryColumns.push(definition.foreignKey);
      }
    }
    const orderSql = limitAndOrder && this.ordering.length
      ? ` ORDER BY ${this.ordering.map(item => `${quoteIdentifier(item.column)} ${item.ascending ? 'ASC' : 'DESC'}`).join(', ')}`
      : '';
    const limitSql = limitAndOrder && this.rowLimit !== undefined ? ` LIMIT ${Math.max(0, this.rowLimit)}` : '';
    const offsetSql = limitAndOrder && this.rowOffset !== undefined ? ` OFFSET ${Math.max(0, this.rowOffset)}` : '';
    const result = await this.pool.query(
      `SELECT ${this.selectedColumns(queryColumns)} FROM ${quoteIdentifier(this.table)}${where.sql}${orderSql}${limitSql}${offsetSql}`,
      where.values,
    );
    return this.hydrateRelations(rowsFrom(result), parsedSelection.relations, parsedSelection.columns);
  }

  private async executeSelect(): Promise<QueryResponse<T>> {
    const parsedSelection = this.parseSelection();
    const where = this.buildWhere();
    let count: number | undefined;
    if (this.selectionOptions.count === 'exact') {
      const countResult = await this.pool.query(
        `SELECT COUNT(*) AS count FROM ${quoteIdentifier(this.table)}${where.sql}`,
        where.values,
      );
      count = Number(rowsFrom(countResult)[0]?.count || 0);
      if (this.selectionOptions.head) return { data: null, error: null, count };
    }

    const rows = await this.selectRows(where, parsedSelection);
    const response = this.normalizeRows(rows);
    if (count !== undefined) response.count = count;
    return response;
  }

  private async executeMutation(): Promise<QueryResponse<T>> {
    const parsedSelection = this.parseSelection();
    const records: Array<Record<string, unknown>> = this.operation === 'insert'
      ? (Array.isArray(this.payload) ? this.payload : [this.payload]).map(record => ({
        ...record,
        id: record.id || randomUUID(),
      })) as Array<Record<string, unknown>>
      : [];
    const values: unknown[] = [];
    let sql: string;
    let returningWhere: { sql: string; values: unknown[] } | null = null;

    if (this.operation === 'insert') {
      const columns = [...new Set(records.flatMap(record => Object.keys(record)))];
      if (columns.length === 0) throw new Error('插入数据不能为空');
      const placeholders = records.map(record => `(${columns.map(column => {
        values.push(toDatabaseValue(column, record[column]));
        return '?';
      }).join(', ')})`).join(', ');
      sql = `INSERT INTO ${quoteIdentifier(this.table)} (${columns.map(quoteIdentifier).join(', ')}) VALUES ${placeholders}`;
      if (this.conflictColumns) {
        const conflictColumns = this.conflictColumns.split(',').map(column => column.trim());
        const updates = columns.filter(column => !conflictColumns.includes(column));
        sql += updates.length === 0
          ? ` ON DUPLICATE KEY UPDATE ${quoteIdentifier(conflictColumns[0])} = ${quoteIdentifier(conflictColumns[0])}`
          : ` ON DUPLICATE KEY UPDATE ${updates.map(column => `${quoteIdentifier(column)} = VALUES(${quoteIdentifier(column)})`).join(', ')}`;
        const clauses = conflictColumns.map(column => `${quoteIdentifier(column)} = ?`).join(' AND ');
        returningWhere = {
          sql: ` WHERE ${clauses}`,
          values: conflictColumns.map(column => toDatabaseValue(column, records[0][column])),
        };
      } else {
        const placeholdersForIds = records.map(() => '?').join(', ');
        returningWhere = {
          sql: ` WHERE ${quoteIdentifier('id')} IN (${placeholdersForIds})`,
          values: records.map(record => record.id),
        };
      }
    } else if (this.operation === 'update') {
      const record = this.payload as Record<string, unknown>;
      const entries = Object.entries(record);
      if (entries.length === 0) throw new Error('更新数据不能为空');
      const assignments = entries.map(([column, value]) => {
        values.push(toDatabaseValue(column, value));
        return `${quoteIdentifier(column)} = ?`;
      });
      const where = this.buildWhere();
      values.push(...where.values);
      sql = `UPDATE ${quoteIdentifier(this.table)} SET ${assignments.join(', ')}${where.sql}`;
      returningWhere = where;
    } else {
      const where = this.buildWhere();
      sql = `DELETE FROM ${quoteIdentifier(this.table)}${where.sql}`;
      values.push(...where.values);
    }

    await this.pool.query(sql, values);
    if (!this.selection || !returningWhere) return { data: null, error: null };

    const rows = await this.selectRows(returningWhere, parsedSelection, false);
    return this.normalizeRows(rows);
  }

  private normalizeRows(rows: DbRow[]): QueryResponse<T> {
    const normalizedRows = rows.map(normalizeRow);
    if (this.singleMode === 'single') {
      if (normalizedRows.length !== 1) {
        return {
          data: null,
          error: { message: normalizedRows.length === 0 ? '未找到记录' : '返回了多条记录' },
        };
      }
      return { data: normalizedRows[0] as T, error: null };
    }
    if (this.singleMode === 'maybeSingle') {
      if (normalizedRows.length > 1) return { data: null, error: { message: '返回了多条记录' } };
      return { data: (normalizedRows[0] || null) as T | null, error: null };
    }
    return { data: normalizedRows as T, error: null };
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Missing DATABASE_URL environment variable');

export const pool = mysql.createPool({
  uri: databaseUrl,
  connectionLimit: Number(process.env.DATABASE_POOL_MAX || 10),
  waitForConnections: true,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: true,
});

const queryRows = async (executor: SqlExecutor, sql: string, values: unknown[] = []): Promise<DbRow[]> => {
  return rowsFrom(await executor.query(sql, values));
};

const getUserStats = async (client: SqlExecutor, childId: string, startDate: string, endDate: string) => {
  return queryRows(client, `
    SELECT
      COUNT(t.id) AS total_tasks,
      SUM(CASE WHEN t.status = 'approved' THEN 1 ELSE 0 END) AS approved_tasks,
      CASE WHEN COUNT(t.id) > 0
        THEN ROUND(100.0 * SUM(CASE WHEN t.status = 'approved' THEN 1 ELSE 0 END) / COUNT(t.id))
        ELSE 0 END AS forest_health,
      (SELECT COUNT(*) FROM goals WHERE child_id = ? AND is_active = 1) AS active_goals,
      (SELECT COUNT(*) FROM trees
        WHERE child_id = ? AND status = 'completed'
          AND updated_at >= ? AND updated_at <= ?) AS completed_trees,
      c.fruits_balance
    FROM children c
    LEFT JOIN tasks t ON t.child_id = c.id AND t.checkin_time >= ? AND t.checkin_time <= ?
    WHERE c.id = ?
    GROUP BY c.fruits_balance`,
  [childId, childId, formatDateForMysql(startDate), formatDateForMysql(endDate), formatDateForMysql(startDate), formatDateForMysql(endDate), childId]);
};

const approveTask = async (client: SqlExecutor, taskId: string, bonusFruits: number) => {
  const task = (await queryRows(client, 'SELECT * FROM tasks WHERE id = ? FOR UPDATE', [taskId]))[0];
  if (!task) return [{ task_id: taskId, goal_title: null, total_fruits: null, tree_completed: false, error_msg: '任务不存在' }];
  if (task.status !== 'pending') return [{ task_id: taskId, goal_title: null, total_fruits: null, tree_completed: false, error_msg: '任务已审核，无法重复操作' }];

  const child = (await queryRows(client, 'SELECT id, fruits_balance FROM children WHERE id = ? FOR UPDATE', [task.child_id]))[0];
  if (!child) return [{ task_id: taskId, goal_title: null, total_fruits: null, tree_completed: false, error_msg: '孩子不存在' }];

  const goal = task.goal_id
    ? (await queryRows(client, 'SELECT title, duration_days, fruits_per_task FROM goals WHERE id = ?', [task.goal_id]))[0]
    : undefined;
  const safeBonus = Math.max(0, bonusFruits);
  const totalFruits = Number(goal?.fruits_per_task ?? 10) + safeBonus;

  await client.query('UPDATE tasks SET status = \'approved\', bonus_fruits = ? WHERE id = ?', [safeBonus, taskId]);
  await client.query('UPDATE children SET fruits_balance = fruits_balance + ? WHERE id = ?', [totalFruits, task.child_id]);

  let treeCompleted = false;
  if (task.tree_id) {
    const tree = (await queryRows(client, 'SELECT id FROM trees WHERE id = ? FOR UPDATE', [task.tree_id]))[0];
    if (tree) {
      const progressRow = (await queryRows(client, `
        SELECT COUNT(DISTINCT DATE(DATE_ADD(t.checkin_time, INTERVAL 8 HOUR))) AS completed_days,
               COALESCE(g.duration_days, 30) AS duration_days
          FROM tasks t
          LEFT JOIN goals g ON g.id = t.goal_id
         WHERE t.tree_id = ? AND t.status = 'approved'
         GROUP BY g.duration_days`, [task.tree_id]))[0];
      const progress = progressRow
        ? Math.min(100, Math.round(100 * Number(progressRow.completed_days) / Number(progressRow.duration_days)))
        : 0;
      treeCompleted = progress >= 100;
      await client.query('UPDATE trees SET progress = ?, status = ? WHERE id = ?', [progress, treeCompleted ? 'completed' : 'growing', task.tree_id]);
      if (treeCompleted && task.goal_id) await client.query('UPDATE goals SET is_active = 0 WHERE id = ?', [task.goal_id]);
    }
  }

  const fruitMessage = safeBonus > 0
    ? `获得 ${totalFruits} 个果实（含额外奖励 ${safeBonus} 个）`
    : `获得 ${totalFruits} 个果实`;
  await client.query(
    'INSERT INTO messages (id, child_id, sender_type, text, type, is_read) VALUES (?, ?, \'system\', ?, \'text\', 0)',
    [randomUUID(), task.child_id, `🎉 太棒了！你的任务"${task.title}"已通过审核，${fruitMessage}！`],
  );

  return [{
    task_id: taskId,
    goal_title: goal?.title || null,
    total_fruits: totalFruits,
    tree_completed: treeCompleted,
    error_msg: null,
  }];
};

const redeemCash = async (client: SqlExecutor, childId: string, fruitsSpent: number) => {
  if (!Number.isInteger(fruitsSpent) || fruitsSpent <= 0) {
    return [{ redemption_id: null, fruits_spent: 0, fruits_per_yuan: 0, yuan_amount: 0, cash_amount: 0, remaining_balance: 0, error_msg: '兑换果实数必须大于0' }];
  }
  const child = (await queryRows(client, 'SELECT id, parent_id, fruits_balance FROM children WHERE id = ? AND is_deleted = 0 FOR UPDATE', [childId]))[0];
  if (!child) return [{ redemption_id: null, fruits_spent: 0, fruits_per_yuan: 0, yuan_amount: 0, cash_amount: 0, remaining_balance: 0, error_msg: '孩子不存在' }];

  let setting = (await queryRows(client, 'SELECT fruits_per_yuan, yuan_amount, is_enabled FROM cash_exchange_settings WHERE parent_id = ? FOR UPDATE', [child.parent_id]))[0];
  if (!setting) {
    await client.query(
      'INSERT INTO cash_exchange_settings (id, parent_id, fruits_per_yuan, yuan_amount, is_enabled) VALUES (?, ?, 100, 1.00, 1) ON DUPLICATE KEY UPDATE parent_id = parent_id',
      [randomUUID(), child.parent_id],
    );
    setting = (await queryRows(client, 'SELECT fruits_per_yuan, yuan_amount, is_enabled FROM cash_exchange_settings WHERE parent_id = ? FOR UPDATE', [child.parent_id]))[0];
  }
  if (!setting.is_enabled) return [{ redemption_id: null, fruits_spent: fruitsSpent, fruits_per_yuan: setting.fruits_per_yuan, yuan_amount: setting.yuan_amount, cash_amount: 0, remaining_balance: child.fruits_balance, error_msg: '现金兑换暂未开启' }];
  if (child.fruits_balance < fruitsSpent) return [{ redemption_id: null, fruits_spent: fruitsSpent, fruits_per_yuan: setting.fruits_per_yuan, yuan_amount: setting.yuan_amount, cash_amount: 0, remaining_balance: child.fruits_balance, error_msg: '果实余额不足' }];

  const cashAmount = Number((fruitsSpent / Number(setting.fruits_per_yuan) * Number(setting.yuan_amount)).toFixed(2));
  if (cashAmount <= 0) return [{ redemption_id: null, fruits_spent: fruitsSpent, fruits_per_yuan: setting.fruits_per_yuan, yuan_amount: setting.yuan_amount, cash_amount: 0, remaining_balance: child.fruits_balance, error_msg: '兑换金额必须大于0' }];

  await client.query('UPDATE children SET fruits_balance = fruits_balance - ? WHERE id = ?', [fruitsSpent, childId]);
  const redemptionId = randomUUID();
  await client.query(
    'INSERT INTO cash_redemptions (id, child_id, parent_id, fruits_spent, fruits_per_yuan, yuan_amount, cash_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, \'pending\')',
    [redemptionId, childId, child.parent_id, fruitsSpent, setting.fruits_per_yuan, setting.yuan_amount, cashAmount],
  );
  return [{
    redemption_id: redemptionId,
    fruits_spent: fruitsSpent,
    fruits_per_yuan: setting.fruits_per_yuan,
    yuan_amount: setting.yuan_amount,
    cash_amount: cashAmount,
    remaining_balance: child.fruits_balance - fruitsSpent,
    error_msg: null,
  }];
};

const recalculateTreeProgress = async (client: SqlExecutor, treeId: string) => {
  const tree = (await queryRows(client, 'SELECT t.id, t.goal_id, g.duration_days FROM trees t LEFT JOIN goals g ON g.id = t.goal_id WHERE t.id = ? FOR UPDATE', [treeId]))[0];
  if (!tree) return;
  const countRow = (await queryRows(client, `
    SELECT COUNT(DISTINCT DATE(DATE_ADD(checkin_time, INTERVAL 8 HOUR))) AS completed_days
      FROM tasks WHERE tree_id = ? AND status = 'approved'`, [treeId]))[0];
  const progress = Math.min(100, Math.round(100 * Number(countRow?.completed_days || 0) / Number(tree.duration_days || 30)));
  const status = progress >= 100 ? 'completed' : 'growing';
  await client.query('UPDATE trees SET progress = ?, status = ? WHERE id = ?', [progress, status, treeId]);
  if (tree.goal_id) await client.query('UPDATE goals SET is_active = ? WHERE id = ?', [status !== 'completed' ? 1 : 0, tree.goal_id]);
};

export class DatabaseClient {
  public constructor(private readonly databasePool: Pool) {}

  public from(table: string): QueryBuilder<any[]> {
    return new QueryBuilder(table, this.databasePool);
  }

  public async rpc(name: string, args: Record<string, unknown>): Promise<QueryResponse<any>> {
    try {
      if (name === 'get_child_stats') {
        return { data: await getUserStats(this.databasePool, String(args.p_child_id), String(args.p_start_date), String(args.p_end_date)), error: null };
      }
      const client = await this.databasePool.getConnection();
      try {
        await client.beginTransaction();
        let data: any[] = [];
        if (name === 'approve_task_rpc') {
          data = await approveTask(client, String(args.p_task_id), Number(args.p_bonus_fruits || 0));
        } else if (name === 'redeem_cash_rpc') {
          data = await redeemCash(client, String(args.p_child_id), Number(args.p_fruits_spent));
        } else if (name === 'recalculate_tree_progress') {
          await recalculateTreeProgress(client, String(args.p_tree_id));
        } else {
          throw new Error(`不支持的数据库函数: ${name}`);
        }
        await client.commit();
        return { data, error: null };
      } catch (cause) {
        await client.rollback();
        return { data: null, error: errorFrom(cause) };
      } finally {
        client.release();
      }
    } catch (cause) {
      return { data: null, error: errorFrom(cause) };
    }
  }
}

export const database = new DatabaseClient(pool);

export type { PoolConnection };
