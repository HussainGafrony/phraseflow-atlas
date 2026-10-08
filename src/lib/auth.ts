/**
 * جلسات الدخول: تشفير كلمات المرور بـ bcrypt، توقيع JWT داخل cookie آمن، وفصل صلاحيات الأدمن عن المستخدم في الصفحات والـ API.
 */
import { adminCredentialVersion, isCurrentAdminSession } from "./admin-env";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE } from "./constants";
import { dbConnect } from "./db";
import { User } from "@/models/User";

export type SessionRole = "user" | "admin";

export type AppSession = {
  userId: string;
  username: string;
  role: SessionRole;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }

  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSessionToken(session: AppSession) {
  return new SignJWT({
    username: session.username,
    role: session.role,
    ...(session.role === "admin"
      ? { adminVersion: adminCredentialVersion() }
      : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

export async function setSessionCookie(session: AppSession) {
  const token = await createSessionToken(session);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export async function getSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    if (
      !payload.sub ||
      typeof payload.username !== "string" ||
      !["user", "admin"].includes(String(payload.role))
    )
      return null;
    if (payload.role === "admin" && !isCurrentAdminSession(payload))
      return null;
    if (payload.role === "user" && !/^[a-f0-9]{24}$/i.test(payload.sub))
      return null;

    return {
      userId: payload.sub,
      username: String(payload.username),
      role: payload.role as SessionRole,
    };
  } catch {
    return null;
  }
}

export async function requireApiSession(role?: SessionRole) {
  const session = await getSession();
  if (!session || (role && session.role !== role)) {
    return null;
  }

  return session;
}

export async function requirePageSession(role?: SessionRole) {
  const session = await getSession();
  if (!session) {
    redirect(role === "admin" ? "/admin/login" : "/login");
  }

  if (role && session.role !== role) {
    redirect(session.role === "admin" ? "/admin" : "/dashboard");
  }

  return session;
}

export async function findUserForLogin(username: string) {
  await dbConnect();
  return User.findOne({
    username: username.toLowerCase().trim(),
    role: "user",
  });
}
