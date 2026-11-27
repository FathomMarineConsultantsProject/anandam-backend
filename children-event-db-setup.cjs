/**
 * Anandam - Children's Events: create ONLY the 1 new details table.
 * No database reset, no migrations, no additional dependencies.
 * Run from the backend root:
 *   node -r dotenv/config .\children-event-db-setup.cjs
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { PrismaClient } = require('@prisma/client');

function stop(message) { throw new Error(message); }

const sql = `CREATE TABLE "ResortChildrenEventDetails" (
  "eventId" TEXT NOT NULL,
  "ageGroups" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "minimumAge" INTEGER,
  "maximumAge" INTEGER,
  "guardianPolicy" TEXT,
  "maxAccompanyingAdultsPerChild" INTEGER,
  "guardianParticipationIncluded" BOOLEAN,
  "additionalAdultPrice" DECIMAL(12,2),
  "childrenPerPackage" INTEGER,
  "guardianInstructions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResortChildrenEventDetails_pkey" PRIMARY KEY ("eventId"),
  CONSTRAINT "ResortChildrenEventDetails_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "ResortEvent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
)`;

async function main() {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) stop('Run this command inside anandam-backend. No database changes.');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  if (!/model\s+ResortChildrenEventDetails\s*\{/.test(schema) ||
      !/childrenDetails\s+ResortChildrenEventDetails\?/.test(schema)) {
    stop('The new children details model/relation is missing from prisma/schema.prisma. No changes made.');
  }
  if (!process.env.DIRECT_DATABASE_URL) stop('DIRECT_DATABASE_URL is missing from .env. No changes made.');
  let url;
  try { url = new URL(process.env.DIRECT_DATABASE_URL); }
  catch { stop('DIRECT_DATABASE_URL is not a valid URL. No changes made.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) stop('Expected a PostgreSQL direct URL. No changes made.');
  if (url.hostname === 'pooled.db.prisma.io') {
    url.hostname = 'db.prisma.io';
    console.log('Using Prisma Postgres direct host for this setup only (.env unchanged).');
  } else if (url.hostname.startsWith('pooled.')) {
    stop('Unrecognized pooled host; direct PostgreSQL host required. No changes made.');
  }
  const prisma = new PrismaClient({
    datasources: { db: { url: url.toString() } },
    log: ['error'],
  });
  try {
    const [db] = await prisma.$queryRawUnsafe('SELECT current_database() AS database, current_schema() AS schema');
    if (db.schema !== 'public') stop('Expected public schema. No changes made.');
    const tables = await prisma.$queryRawUnsafe(
      'SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = current_schema()'
    );
    const names = new Set(tables.map(r => r.tablename));
    for (const name of ['ResortProperty', 'ResortRoomType', 'ResortEvent']) {
      if (!names.has(name)) stop(`Existing ${name} table not found. Check the database URL. No changes made.`);
    }
    if (names.has('ResortChildrenEventDetails')) {
      const columns = await prisma.$queryRawUnsafe(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'ResortChildrenEventDetails'"
      );
      const present = new Set(columns.map(r => r.column_name));
      const needed = ['eventId','ageGroups','minimumAge','maximumAge','guardianPolicy',
        'maxAccompanyingAdultsPerChild','guardianParticipationIncluded',
        'additionalAdultPrice','childrenPerPackage','guardianInstructions','createdAt','updatedAt'];
      const missing = needed.filter(name => !present.has(name));
      if (missing.length) stop(`Table exists but is missing columns: ${missing.join(', ')}. No changes made.`);
      console.log('Already set up: ResortChildrenEventDetails exists with all expected columns. No changes made.');
      return;
    }
    const before = await prisma.$queryRawUnsafe(
      'SELECT (SELECT COUNT(*) FROM "ResortProperty") AS properties, (SELECT COUNT(*) FROM "ResortEvent") AS events'
    );
    console.log('\nAnandam - Children Events database update');
    console.log('Database:', db.database, '| Schema:', db.schema, '| Server:', url.hostname);
    console.log('Existing resort properties:', String(before[0].properties));
    console.log('Existing events:', String(before[0].events));
    console.log('Will create ONLY 1 table: ResortChildrenEventDetails.');
    console.log('No existing rows, events, or other tables will be changed.\n');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let confirmation;
    try { confirmation = await rl.question('Type CREATE to continue (anything else cancels): '); }
    finally { rl.close(); }
    if (confirmation.trim() !== 'CREATE') { console.log('Cancelled. No changes.'); return; }
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
      await tx.$executeRawUnsafe(sql);
      const after = await tx.$queryRawUnsafe(
        'SELECT (SELECT COUNT(*) FROM "ResortProperty") AS properties, (SELECT COUNT(*) FROM "ResortEvent") AS events'
      );
      if (String(before[0].properties) !== String(after[0].properties) ||
          String(before[0].events) !== String(after[0].events)) {
        stop('Existing record count changed unexpectedly. Transaction rolled back.');
      }
    }, { timeout: 30000, maxWait: 10000 });
    console.log('\nSUCCESS: ResortChildrenEventDetails table created.');
    console.log('Existing resort and event data preserved.');
    console.log('NOTE: Direct SQL is not recorded in Prisma migration history.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('\nSETUP STOPPED:', error?.message || error);
  console.error('Do not run prisma migrate reset.');
  process.exitCode = 1;
});
