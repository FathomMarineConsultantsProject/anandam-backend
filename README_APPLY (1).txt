ANANDAM - MARITIME HUMAN PERFORMANCE 60-QUESTION UPDATE

FINAL TEST STRUCTURE
- Section 1 PJS: 20 random questions
- Section 2 PLA: 20 random questions
- Section 3 SHF: 20 random questions
- Total per attempt: 60 questions

NEW QUESTION MAPPING
- COG -> PJS (first existing Maritime section)
- ATT -> PLA (second existing Maritime section)
- Existing SHF stays in SHF (third section)

QUESTION POOL SIZES
- PJS: 50 existing + 800 COG = 850
- PLA: 50 existing + 800 ATT = 850
- SHF: 50 existing = 50
- Total Maritime bank = 1750

SOURCE FORMAT HANDLING
The current Maritime assessment engine is A/B/C/D multiple-choice.

COG:
- 650 source rows already contained A/B/C/D options and their supplied answer-key letters.
- 150 source rows were open-response / concise-answer items.
- Those 150 were normalized into A/B/C/D while preserving the supplied source answer as the only keyed correct answer.

ATT:
- 500 source rows already contained A/B/C/D options and supplied answer-key letters.
- 300 source rows were numeric/count/position open-response items.
- Those 300 were normalized into A/B/C/D numeric choices while preserving the supplied answer.

No source question text was rewritten.

RANDOMIZATION
Your existing psychometric.service.ts already:
1. Reads section.questionsPerAttempt
2. Groups active questions by domain
3. Randomly samples across domains
4. Fills remaining slots randomly

Therefore psychometric.service.ts does NOT need replacement.

RESULT SCORING
Core attempt/section scoring is already dynamic:
- Correct = 1
- Section maxScore = number of assigned section questions
- Overall maxScore = total assigned questions

The included psychometricAnalytics.service.ts only adapts the OLD 6/18 descriptive lookup
to the new 20/60 structure. It still exposes the REAL scores such as:
- 13 / 20
- 17 / 20
- 42 / 60

FILES TO REPLACE
1. prisma/data/maritimeQuestionBank.json
2. prisma/seedPsychometrics.ts
3. src/services/psychometricAnalytics.service.ts

The included personalPsychometricQuestionBank.json is unchanged from Batch 2 and is only
included so this package stays compatible with your latest seed file.

NO PRISMA SCHEMA MIGRATION.
NO FRONTEND CHANGE REQUIRED.

RUN AFTER COPYING
npx prisma generate
npx tsx prisma/seedPsychometrics.ts
node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit

EXPECTED MARITIME BANK AFTER SEED
- PJS active pool: 850
- PLA active pool: 850
- SHF active pool: 50
- Total Maritime questions in JSON: 1750
- New attempt question count: 60

IMPORTANT TEST
Create a NEW Maritime attempt after seeding.
An already-created in-progress attempt keeps the questions that were assigned when that
attempt was originally created.

EXPECTED NEW ATTEMPT
- PJS: 20
- PLA: 20
- SHF: 20
- Overall: 60
