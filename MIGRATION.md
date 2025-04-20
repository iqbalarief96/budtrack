# Wedding Planner App Migration Guide

## WeddingGuest Model Migration

The WeddingGuest model was previously missing from schema.prisma but has now been added.
However, we're still using raw SQL queries in the API routes due to Prisma client regeneration issues.

### Steps to complete the migration:

1. Run: `npx prisma generate`
2. In `app/api/wedding/[id]/guests/route.ts`, replace all raw SQL queries with their Prisma model equivalents
3. Remove the WeddingGuest interface as it will be provided by Prisma

Each function in the route file has comments showing exactly how to replace the raw SQL with Prisma models.

## GET Method

```typescript
// Replace this:
const guests = await prismaClient.$queryRaw<WeddingGuest[]>`
  SELECT * FROM "WeddingGuest"
  WHERE "weddingId" = ${weddingId}
  ORDER BY "name" ASC
`;

// With this:
const guests = await prismaClient.weddingGuest.findMany({
  where: { weddingId },
  orderBy: { name: 'asc' }
});
```

## POST Method

```typescript
// Replace this:
const id = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
const now = new Date();

await prismaClient.$executeRaw`
  INSERT INTO "WeddingGuest" (
    "id", "weddingId", "name", "relationship", "contactNumber", 
    "email", "address", "confirmed", "attended", "group", 
    "seats", "dietaryRestrictions", "notes", "createdAt", "updatedAt"
  ) VALUES (
    ${id}, ${weddingId}, ${name}, ${relationship || null}, ${contactNumber || null},
    ${email || null}, ${address || null}, ${confirmed || false}, ${attended || false}, 
    ${group || null}, ${seats || 1}, ${dietaryRestrictions || null}, ${notes || null}, 
    ${now}, ${now}
  )
`;

const createdGuests = await prismaClient.$queryRaw<WeddingGuest[]>`
  SELECT * FROM "WeddingGuest" WHERE "id" = ${id}
`;

// With this:
const createdGuest = await prismaClient.weddingGuest.create({
  data: {
    weddingId,
    name,
    relationship: relationship || null,
    contactNumber: contactNumber || null,
    email: email || null,
    address: address || null,
    confirmed: confirmed || false,
    attended: attended || false,
    group: group || null,
    seats: seats || 1,
    dietaryRestrictions: dietaryRestrictions || null,
    notes: notes || null
  }
});
```

## DELETE Method

```typescript
// Replace this:
const guests = await prismaClient.$queryRaw<WeddingGuest[]>`
  SELECT * FROM "WeddingGuest" WHERE "id" = ${guestId}
`;

const guest = Array.isArray(guests) && guests.length > 0 ? guests[0] : null;

// And this:
await prismaClient.$executeRaw`
  DELETE FROM "WeddingGuest" WHERE "id" = ${guestId}
`;

// With this:
const guest = await prismaClient.weddingGuest.findUnique({
  where: { id: guestId }
});

// And this:
await prismaClient.weddingGuest.delete({
  where: { id: guestId }
});
```

## PUT Method

```typescript
// Replace this:
const existingGuests = await prismaClient.$queryRaw<WeddingGuest[]>`
  SELECT * FROM "WeddingGuest" WHERE "id" = ${id}
`;

const existingGuest = Array.isArray(existingGuests) && existingGuests.length > 0 
  ? existingGuests[0] 
  : null;

// And this:
await prismaClient.$executeRaw`
  UPDATE "WeddingGuest"
  SET 
    "name" = ${name},
    "relationship" = ${relationship || null},
    "contactNumber" = ${contactNumber || null},
    "email" = ${email || null},
    "address" = ${address || null},
    "confirmed" = ${confirmed || false},
    "attended" = ${attended || false},
    "group" = ${group || null},
    "seats" = ${seats || 1},
    "dietaryRestrictions" = ${dietaryRestrictions || null},
    "notes" = ${notes || null},
    "updatedAt" = ${now}
  WHERE "id" = ${id}
`;

// With this:
const existingGuest = await prismaClient.weddingGuest.findUnique({
  where: { id }
});

// And this:
const updatedGuest = await prismaClient.weddingGuest.update({
  where: { id },
  data: {
    name,
    relationship: relationship || null,
    contactNumber: contactNumber || null,
    email: email || null,
    address: address || null,
    confirmed: confirmed || false,
    attended: attended || false,
    group: group || null,
    seats: seats || 1,
    dietaryRestrictions: dietaryRestrictions || null,
    notes: notes || null
  }
});
```
