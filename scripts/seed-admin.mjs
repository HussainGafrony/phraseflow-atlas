import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const { MONGODB_URI, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

if (!MONGODB_URI || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("Set MONGODB_URI, ADMIN_USERNAME, and ADMIN_PASSWORD before running this script.");
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true }
  },
  { timestamps: true }
);

const User = mongoose.models.User ?? mongoose.model("User", userSchema);

await mongoose.connect(MONGODB_URI);

const username = ADMIN_USERNAME.toLowerCase().trim();
const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

await User.updateOne(
  { username },
  {
    $set: {
      username,
      passwordHash,
      role: "admin"
    }
  },
  { upsert: true }
);

await mongoose.disconnect();
console.log(`Admin account ready: ${username}`);
