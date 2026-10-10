import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../generated/prisma/client';
const globalPrisma=globalThis as unknown as {axicPrisma?:PrismaClient};
export function getPrisma(){
  if(typeof window!=='undefined')throw new Error('Server-only database access.');
  if(globalPrisma.axicPrisma)return globalPrisma.axicPrisma;
  const connectionString=process.env.DATABASE_URL;
  if(!connectionString)throw new Error('Database configuration missing.');
  const adapter=new PrismaPg({connectionString,max:3,connectionTimeoutMillis:5000,idleTimeoutMillis:20000});
  globalPrisma.axicPrisma=new PrismaClient({adapter,log:[]});
  return globalPrisma.axicPrisma;
}
