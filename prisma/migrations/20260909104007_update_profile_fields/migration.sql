-- Update profile fields while preserving existing emergency contact data

-- Rename existing emergency contact field
ALTER TABLE "User"
RENAME COLUMN "emergencyContact"
TO "emergencyContactName";

-- Add additional emergency contact fields
ALTER TABLE "User"
ADD COLUMN "emergencyContactRelationship" TEXT,
ADD COLUMN "emergencyContactNumber" TEXT;

-- Add avatar preference fields
ALTER TABLE "User"
ADD COLUMN "avatarMode" TEXT NOT NULL DEFAULT 'INITIALS',
ADD COLUMN "avatarId" TEXT;