import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import {readFileSync} from 'node:fs';
import * as schema from '../db/schema.ts';
const sql=new DatabaseSync(':memory:');
sql.exec(readFileSync('drizzle/0000_wealthy_brood.sql','utf8'));
const binding={prepare(query){let values=[];return {bind(...args){values=args;return this},async all(){return {results:sql.prepare(query).all(...values)}},async raw(){return sql.prepare(query).all(...values).map(r=>Object.values(r))},async run(){return sql.prepare(query).run(...values)}}}};
export function getDb(){return drizzle(binding,{schema})}
