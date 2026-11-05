// Seeds cost-category target ranges for FC Financial Monitor.
//
// CM1 (65-70%) and CM2 (15-30%) are given directly in the business rules
// and never need seeding — they're always available as a built-in
// fallback (see financialTargetDefaults.js / target_resolver.py).
//
// The six cost-category ranges below come directly from the "Ideal FC
// Criteria" reference sheet of an actual attached sample file
// (3excl.xlsx) — the real target ranges the spec originally described as
// "attached alongside the sample data," not a guess. They're internally
// consistent with the CM1/CM2 ranges above (manpower + packaging midpoints
// sum to ~32%, keeping CM1 near 68%; the remaining four categories'
// midpoints sum to ~45%, keeping CM2 near 23%).
//
// Usage:
//   node scripts/seedFinancialTargets.js
import 'dotenv/config'
import mongoose from 'mongoose'
import FinancialTarget from '../src/models/FinancialTarget.js'

const REFERENCE_TARGETS = [
  { metric: 'manpower_cost', minimum: 25, maximum: 27 },
  { metric: 'packaging_cost', minimum: 5, maximum: 7 },
  { metric: 'power_and_fuel', minimum: 10, maximum: 12 },
  { metric: 'fc_rent', minimum: 15, maximum: 18 },
  { metric: 'equipment_rentals', minimum: 5, maximum: 8 },
  { metric: 'overheads', minimum: 10, maximum: 12 },
]

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)

  for (const target of REFERENCE_TARGETS) {
    const existing = await FinancialTarget.findOne({ metric: target.metric })
    if (existing) {
      console.log(`${target.metric}: already configured (source=${existing.source}) — leaving as-is.`)
      continue
    }
    await FinancialTarget.create({ ...target, source: 'reference-file' })
    console.log(`${target.metric}: seeded ${target.minimum}-${target.maximum}% (from Ideal FC Criteria reference sheet).`)
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
