/**
 * Anandam My Property - additive, one-time PostgreSQL table setup.
 * Uses the EXISTING @prisma/client connection, NOT prisma migrate's Windows
 * schema-engine executable. Requires Node.js and Prisma Client 5.21.1.
 *
 * Usage, from the backend project root (PowerShell):
 *   node -r dotenv/config .\my-property-db-setup.cjs
 *
 * Type CREATE at the prompt to apply the additions. Any failure in the
 * transaction rolls all additions back. Existing tables are never modified.
 * This is direct SQL, so it does not register a Prisma migration-history row.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { PrismaClient } = require('@prisma/client');

const NEW_TABLES = Object.freeze([
  'ResortRoomUnit',
  'ResortEvent',
  'ResortEventOccurrence',
  'ResortEventRoomAllocation',
  'ResortEventRoomHold',
  'ResortEventImage',
  'ResortReservation',
  'ResortRoomBlock',
]);
const NEW_ENUMS = Object.freeze([
  'ResortEventType',
  'ResortEventStatus',
  'ResortEventPricingType',
  'ResortEventImageKind',
  'ResortReservationStatus',
]);

// Identical field types, requiredness, defaults, relationships and unique/index
// definitions to the supplied My Property prisma/schema.prisma models.
const STATEMENTS = Object.freeze([
  `CREATE TYPE "ResortEventType" AS ENUM ('EVENT', 'DAY_PROGRAMME', 'MULTI_DAY_RETREAT')`,
  `CREATE TYPE "ResortEventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED')`,
  `CREATE TYPE "ResortEventPricingType" AS ENUM ('FREE', 'PER_PERSON', 'PER_PACKAGE')`,
  `CREATE TYPE "ResortEventImageKind" AS ENUM ('COVER', 'GALLERY')`,
  `CREATE TYPE "ResortReservationStatus" AS ENUM ('EXPECTED', 'IN_HOUSE', 'DEPARTED', 'CANCELLED', 'NO_SHOW')`,

  `CREATE TABLE "ResortRoomUnit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResortRoomUnit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResortRoomUnit_propertyId_number_key" UNIQUE ("propertyId", "number"),
    CONSTRAINT "ResortRoomUnit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ResortProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResortRoomUnit_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ResortRoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE TABLE "ResortEvent" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" "ResortEventStatus" NOT NULL DEFAULT 'DRAFT',
    "draftStep" INTEGER NOT NULL DEFAULT 1,
    "listingType" "ResortEventType",
    "name" TEXT,
    "shortDescription" TEXT,
    "venue" TEXT,
    "maxParticipants" INTEGER,
    "minParticipants" INTEGER,
    "ageRequirements" TEXT,
    "experienceLevel" TEXT,
    "pricingType" "ResortEventPricingType",
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "price" DECIMAL(12,2),
    "accommodationIncluded" BOOLEAN,
    "whatsIncluded" TEXT,
    "whatToBring" TEXT,
    "whatsNotIncluded" TEXT,
    "cancellationPolicy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResortEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResortEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ResortProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE "ResortEventOccurrence" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timeZone" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResortEventOccurrence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResortEventOccurrence_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ResortEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE "ResortEventRoomAllocation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "ResortEventRoomAllocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResortEventRoomAllocation_eventId_roomTypeId_key" UNIQUE ("eventId", "roomTypeId"),
    CONSTRAINT "ResortEventRoomAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ResortEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResortEventRoomAllocation_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ResortRoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE TABLE "ResortEventRoomHold" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "roomUnitId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDateExclusive" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResortEventRoomHold_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResortEventRoomHold_occurrenceId_roomUnitId_key" UNIQUE ("occurrenceId", "roomUnitId"),
    CONSTRAINT "ResortEventRoomHold_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ResortProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResortEventRoomHold_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ResortEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResortEventRoomHold_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "ResortEventOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResortEventRoomHold_roomUnitId_fkey" FOREIGN KEY ("roomUnitId") REFERENCES "ResortRoomUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE TABLE "ResortEventImage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" "ResortEventImageKind" NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResortEventImage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResortEventImage_pathname_key" UNIQUE ("pathname"),
    CONSTRAINT "ResortEventImage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ResortEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,

  `CREATE TABLE "ResortReservation" (
    "id" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "roomUnitId" TEXT,
    "status" "ResortReservationStatus" NOT NULL DEFAULT 'EXPECTED',
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    "expectedArrivalTime" TEXT,
    "specialRequests" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResortReservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResortReservation_bookingReference_key" UNIQUE ("bookingReference"),
    CONSTRAINT "ResortReservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ResortProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResortReservation_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "ResortRoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ResortReservation_roomUnitId_fkey" FOREIGN KEY ("roomUnitId") REFERENCES "ResortRoomUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE TABLE "ResortRoomBlock" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomUnitId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDateExclusive" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResortRoomBlock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ResortRoomBlock_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "ResortProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResortRoomBlock_roomUnitId_fkey" FOREIGN KEY ("roomUnitId") REFERENCES "ResortRoomUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,

  `CREATE INDEX "ResortRoomUnit_roomTypeId_idx" ON "ResortRoomUnit"("roomTypeId")`,
  `CREATE INDEX "ResortEvent_propertyId_status_createdAt_idx" ON "ResortEvent"("propertyId", "status", "createdAt")`,
  `CREATE INDEX "ResortEventOccurrence_eventId_startAt_idx" ON "ResortEventOccurrence"("eventId", "startAt")`,
  `CREATE INDEX "ResortEventRoomHold_propertyId_startDate_endDateExclusive_idx" ON "ResortEventRoomHold"("propertyId", "startDate", "endDateExclusive")`,
  `CREATE INDEX "ResortEventRoomHold_roomUnitId_startDate_endDateExclusive_idx" ON "ResortEventRoomHold"("roomUnitId", "startDate", "endDateExclusive")`,
  `CREATE INDEX "ResortEventImage_eventId_kind_sortOrder_idx" ON "ResortEventImage"("eventId", "kind", "sortOrder")`,
  `CREATE INDEX "ResortReservation_propertyId_status_checkInDate_idx" ON "ResortReservation"("propertyId", "status", "checkInDate")`,
  `CREATE INDEX "ResortReservation_propertyId_checkOutDate_idx" ON "ResortReservation"("propertyId", "checkOutDate")`,
  `CREATE INDEX "ResortReservation_roomTypeId_checkInDate_checkOutDate_idx" ON "ResortReservation"("roomTypeId", "checkInDate", "checkOutDate")`,
  `CREATE INDEX "ResortReservation_roomUnitId_checkInDate_checkOutDate_idx" ON "ResortReservation"("roomUnitId", "checkInDate", "checkOutDate")`,
  `CREATE INDEX "ResortRoomBlock_propertyId_startDate_endDateExclusive_idx" ON "ResortRoomBlock"("propertyId", "startDate", "endDateExclusive")`,
  `CREATE INDEX "ResortRoomBlock_roomUnitId_startDate_endDateExclusive_idx" ON "ResortRoomBlock"("roomUnitId", "startDate", "endDateExclusive")`,
]);

function abort(message) {
  throw new Error(message);
}

function verifySchemaFile() {
  const schemaFile = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaFile)) abort('Run this from the anandam-backend project folder (prisma/schema.prisma was not found).');
  const schema = fs.readFileSync(schemaFile, 'utf8');
  for (const model of NEW_TABLES) {
    if (!new RegExp(`\\bmodel\\s+${model}\\s*\\{`).test(schema)) abort(`Your current schema.prisma is missing model ${model}. No changes made.`);
  }
  for (const type of NEW_ENUMS) {
    if (!new RegExp(`\\benum\\s+${type}\\s*\\{`).test(schema)) abort(`Your current schema.prisma is missing enum ${type}. No changes made.`);
  }
}

async function main() {
  verifySchemaFile();
  if (!process.env.DIRECT_DATABASE_URL) {
    abort('DIRECT_DATABASE_URL is missing from .env. No database changes made.');
  }
  let connection;
  try { connection = new URL(process.env.DIRECT_DATABASE_URL); }
  catch { abort('DIRECT_DATABASE_URL is not a valid URL. No database changes made.'); }
  if (!['postgresql:', 'postgres:'].includes(connection.protocol)) {
    abort('DIRECT_DATABASE_URL must be a PostgreSQL URL. No database changes made.');
  }
  // Older Anandam .env files call the pooled Prisma Postgres address
  // DIRECT_DATABASE_URL. Use the documented direct database endpoint for
  // this ONE-TIME setup, without editing .env or changing application traffic.
  // Both endpoints are for the same database and accept the same credentials.
  if (connection.hostname === 'pooled.db.prisma.io') {
    connection.hostname = 'db.prisma.io';
    console.log('Setup connection: Prisma Postgres direct host (temporary, .env unchanged).');
  } else if (connection.hostname.startsWith('pooled.')) {
    abort('Unrecognized pooled database host. Obtain the corresponding direct database URL before setup. No changes made.');
  }
  const setupDatabaseUrl = connection.toString();

  const prisma = new PrismaClient({
    datasources: { db: { url: setupDatabaseUrl } },
    log: ['error'],
  });

  try {
    const [details] = await prisma.$queryRawUnsafe(
      'SELECT current_database() AS database, current_schema() AS schema'
    );
    if (details?.schema !== 'public') abort(`Expected public schema; connected to ${details?.schema}. No changes made.`);
    const tableRows = await prisma.$queryRawUnsafe(
      'SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = current_schema()'
    );
    const names = new Set(tableRows.map((r) => r.tablename));
    for (const baseline of ['ResortProperty', 'ResortRoomType']) {
      if (!names.has(baseline)) abort(`Existing ${baseline} table not found. Check DIRECT_DATABASE_URL. No changes made.`);
    }
    const alreadyThere = NEW_TABLES.filter((name) => names.has(name));
    if (alreadyThere.length) {
      abort(`Some My Property tables already exist (${alreadyThere.join(', ')}). Stopping to avoid altering existing objects. No changes made.`);
    }
    const enumRows = await prisma.$queryRawUnsafe(
      `SELECT t.typname FROM pg_catalog.pg_type t
       JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = current_schema() AND t.typtype = 'e'`
    );
    const enumNames = new Set(enumRows.map((r) => r.typname));
    const alreadyEnums = NEW_ENUMS.filter((name) => enumNames.has(name));
    if (alreadyEnums.length) {
      abort(`Some My Property enums already exist (${alreadyEnums.join(', ')}). Stopping for safety. No changes made.`);
    }

    const snapshotQuery = `SELECT
      (SELECT COUNT(*) FROM "ResortProperty") AS properties,
      (SELECT COUNT(*) FROM "ResortRoomType") AS room_types`;
    const [before] = await prisma.$queryRawUnsafe(snapshotQuery);
    console.log('\nAnandam - My Property database setup');
    console.log('Database:', details.database, '| Schema:', details.schema);
    console.log('Server:', connection.hostname);
    console.log('Existing resort properties:', String(before.properties));
    console.log('Existing room types:', String(before.room_types));
    console.log('\nWill ADD:', NEW_TABLES.length, 'new tables and', NEW_ENUMS.length, 'new enum types.');
    console.log('Will NOT modify/drop any existing tables or rows.');
    console.log('No Docker, no schema-engine-windows.exe, no Prisma upgrade.\n');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let answer;
    try { answer = await rl.question('Type CREATE to add the new tables (anything else cancels): '); }
    finally { rl.close(); }
    if (String(answer).trim() !== 'CREATE') {
      console.log('Cancelled. Nothing changed.');
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
      for (const sql of STATEMENTS) {
        // Deliberately limited to CREATE TYPE/TABLE/INDEX statements.
        if (!/^CREATE\s+(TYPE|TABLE|INDEX)\b/.test(sql)) abort('Unexpected SQL statement. Rolled back.');
        await tx.$executeRawUnsafe(sql);
      }
      const [after] = await tx.$queryRawUnsafe(snapshotQuery);
      if (String(after.properties) !== String(before.properties) || String(after.room_types) !== String(before.room_types)) {
        abort('Existing row counts changed unexpectedly. Rolled back.');
      }
    }, { timeout: 60000, maxWait: 10000 });

    const newRows = await prisma.$queryRawUnsafe(
      'SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = current_schema()'
    );
    const now = new Set(newRows.map((r) => r.tablename));
    const missing = NEW_TABLES.filter((name) => !now.has(name));
    if (missing.length) abort(`Transaction finished, but new tables were not all visible: ${missing.join(', ')}`);
    console.log('\nSUCCESS: all 8 My Property tables created.');
    console.log('Existing resort properties and room types were preserved.');
    console.log('Your current backend can now use the new tables.');
    console.log('NOTE: This direct-SQL setup is not entered into Prisma migration history.');
    console.log('Keep this script with your project and reconcile migration history before any future Prisma migrate dev/deploy.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('\nSETUP STOPPED:', error?.message || error);
  console.error('If it stopped before SUCCESS, do not run prisma migrate reset.');
  process.exitCode = 1;
});
