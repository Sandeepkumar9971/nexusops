import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../../models/User.js'
import { asyncHandler } from '../../middleware/asyncHandler.js'

const TOKEN_EXPIRY = '7d'
const MIN_PASSWORD_LENGTH = 8

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

function serializeUser(user) {
  return { id: user._id.toString(), email: user.email, name: user.name, role: user.role }
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400)
    throw new Error('Email and password are required.')
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() })
  // Same generic message whether the email doesn't exist or the password is
  // wrong — never let a login form reveal which accounts exist.
  const invalidCredentials = () => {
    res.status(401)
    throw new Error('Invalid email or password.')
  }

  if (!user) return invalidCredentials()

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) return invalidCredentials()

  const token = signToken(user)
  res.json({ token, user: serializeUser(user) })
})

export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user })
})

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    res.status(400)
    throw new Error('Current and new password are required.')
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    res.status(400)
    throw new Error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  }

  const user = await User.findById(req.user.id)
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!isValid) {
    // 400, not 401 — the session itself is perfectly valid (requireAuth
    // already passed); it's the submitted field that's wrong. The frontend
    // treats any 401 as "session expired, log out", which would otherwise
    // incorrectly sign the user out just for mistyping their old password.
    res.status(400)
    throw new Error('Current password is incorrect.')
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10)
  await user.save()
  res.json({ success: true })
})
