import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, minlength: 6, select: false },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    provider: { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
    emailVerified: { type: Boolean, default: false },

    // password reset
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    // OTP verification
    otpCode: { type: String, select: false },
    otpExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function matchPassword(entered) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model('User', userSchema);
