// One-off/idempotent script to create the first admin account. Run with:
//   node scripts/seedAdmin.js <email> <password> [name]
// Safe to re-run — does nothing if that email already has an account.
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../src/models/User.js'

async function main() {
  const [, , email, password, name] = process.argv

  if (!email || !password) {
    console.error('Usage: node scripts/seedAdmin.js <email> <password> [name]')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)

  const normalizedEmail = email.toLowerCase().trim()
  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    console.log(`User ${normalizedEmail} already exists — not modifying it.`)
    await mongoose.disconnect()
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await User.create({ email: normalizedEmail, passwordHash, name, role: 'admin' })
  console.log(`Created admin user: ${normalizedEmail}`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
