import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ======================================================
  // TEST PRACTITIONER LOGIN
  // ======================================================

  const email =
    "luna.test@anandam.local";

  const password =
    "Test@12345";

  const passwordHash =
    await bcrypt.hash(
      password,
      10
    );


  // ======================================================
  // 1. CREATE / UPDATE LUNA USER ACCOUNT
  // ======================================================

  const lunaUser =
    await prisma.user.upsert({
      where: {
        email,
      },

      update: {
        fullName:
          "Luna Lovegood",

        role:
          "PRACTITIONER",

        // Makes rerunning the seed predictable
        passwordHash,
      },

      create: {
        email,

        passwordHash,

        fullName:
          "Luna Lovegood",

        role:
          "PRACTITIONER",
      },
    });


  // ======================================================
  // 2. CREATE MARKETPLACE SPECIALTIES
  // ======================================================

  const anxiety =
    await prisma.specialty.upsert({
      where: {
        slug: "anxiety",
      },

      update: {
        name:
          "Anxiety",

        description:
          "Support for anxiety and persistent worry.",

        isActive:
          true,
      },

      create: {
        slug:
          "anxiety",

        name:
          "Anxiety",

        description:
          "Support for anxiety and persistent worry.",

        isActive:
          true,
      },
    });


  const stress =
    await prisma.specialty.upsert({
      where: {
        slug:
          "stress",
      },

      update: {
        name:
          "Stress",

        description:
          "Support for stress and overwhelm.",

        isActive:
          true,
      },

      create: {
        slug:
          "stress",

        name:
          "Stress",

        description:
          "Support for stress and overwhelm.",

        isActive:
          true,
      },
    });


  const sleep =
    await prisma.specialty.upsert({
      where: {
        slug:
          "sleep",
      },

      update: {
        name:
          "Sleep",

        description:
          "Support for sleep-related concerns.",

        isActive:
          true,
      },

      create: {
        slug:
          "sleep",

        name:
          "Sleep",

        description:
          "Support for sleep-related concerns.",

        isActive:
          true,
      },
    });


  // ======================================================
  // 3. CREATE / UPDATE PRACTITIONER PROFILE
  // ======================================================

  const lunaProfile =
    await prisma.practitionerProfile.upsert({
      where: {
        userId:
          lunaUser.id,
      },

      update: {
        slug:
          "luna-lovegood",

        practitionerType:
          "COUNSELLOR",

        professionalTitle:
          "Wellbeing Counsellor",

        shortBio:
          "Supporting people with anxiety, stress and sleep concerns.",

        about:
          "Luna provides supportive one-to-one wellbeing sessions focused on anxiety, stress management and sleep concerns.",

        experienceYears:
          5,

        languages: [
          "English",
          "Hindi",
        ],

        qualificationSummary:
          "Test practitioner profile for Anandam marketplace",

        sessionDurationMinutes:
          50,

        sessionPrice:
          1200,

        currency:
          "INR",

        acceptingNewClients:
          true,

        approvalStatus:
          "APPROVED",

        isVisible:
          true,

        approvedAt:
          new Date(),
      },

      create: {
        userId:
          lunaUser.id,

        slug:
          "luna-lovegood",

        practitionerType:
          "COUNSELLOR",

        professionalTitle:
          "Wellbeing Counsellor",

        shortBio:
          "Supporting people with anxiety, stress and sleep concerns.",

        about:
          "Luna provides supportive one-to-one wellbeing sessions focused on anxiety, stress management and sleep concerns.",

        experienceYears:
          5,

        languages: [
          "English",
          "Hindi",
        ],

        qualificationSummary:
          "Test practitioner profile for Anandam marketplace",

        sessionDurationMinutes:
          50,

        sessionPrice:
          1200,

        currency:
          "INR",

        acceptingNewClients:
          true,

        approvalStatus:
          "APPROVED",

        isVisible:
          true,

        approvedAt:
          new Date(),
      },
    });


  // ======================================================
  // 4. LINK SPECIALTIES TO LUNA
  // ======================================================

  const specialtyIds = [
    anxiety.id,
    stress.id,
    sleep.id,
  ];

  for (
    const specialtyId
    of specialtyIds
  ) {
    await prisma.practitionerSpecialty.upsert({
      where: {
        practitionerId_specialtyId: {
          practitionerId:
            lunaProfile.id,

          specialtyId,
        },
      },

      update: {},

      create: {
        practitionerId:
          lunaProfile.id,

        specialtyId,
      },
    });
  }


  // ======================================================
  // SUCCESS
  // ======================================================

  console.log(
    "=========================================="
  );

  console.log(
    "Luna test practitioner created successfully"
  );

  console.log(
    "=========================================="
  );

  console.log({
    userId:
      lunaUser.id,

    practitionerId:
      lunaProfile.id,

    email:
      lunaUser.email,

    password,

    slug:
      lunaProfile.slug,

    role:
      lunaUser.role,

    approvalStatus:
      lunaProfile.approvalStatus,

    isVisible:
      lunaProfile.isVisible,
  });
}


main()
  .catch((error) => {
    console.error(
      "Marketplace test seed failed:",
      error
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });