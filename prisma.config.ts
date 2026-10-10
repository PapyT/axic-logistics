import {config} from 'dotenv';
import {defineConfig} from 'prisma/config';
config({path:'.env.local',quiet:true});
config({quiet:true});
export default defineConfig({
  schema:'prisma/schema.prisma',
  // Generation/builds do not connect to the database. Database CLI operations
  // require the private direct/session connection (never a runtime fallback).
  datasource:{url:process.env.DIRECT_URL ?? ''}
});
