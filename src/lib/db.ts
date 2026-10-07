import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongooseCache ?? {
  conn: null,
  promise: null
};

if (!globalThis.mongooseCache) {
  globalThis.mongooseCache = cached;
}

export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing. Add it to .env.local or Vercel env vars.");
  }

  cached.promise ??= mongoose.connect(uri, {
    bufferCommands: false,
    dbName: getDatabaseName(uri)
  });

  cached.conn = await cached.promise;
  return cached.conn;
}

function getDatabaseName(uri: string) {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\//, "").trim();
    return dbName || "phraseflow-atlas";
  } catch {
    return "phraseflow-atlas";
  }
}
