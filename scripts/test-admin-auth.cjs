// اختبارات دخول الأدمن والجلسات والصلاحيات؛ التوقيع والتشفير حقيقيان وقاعدة البيانات محاكاة.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jose = require("jose");
function load(path, mocks, globals = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      require: (name) => {
        assert.ok(name in mocks, name);
        return mocks[name];
      },
      TextEncoder,
      Date,
      Error,
      console,
      ...globals,
    },
  );
  return exports;
}
function fixture() {
  const env = {
    ADMIN_USERNAME: "Owner",
    ADMIN_PASSWORD: "test-password-only",
    SESSION_SECRET: "test-secret-not-for-production-123456789",
  };
  const admin = load(
    "src/lib/admin-env.ts",
    { "node:crypto": require("node:crypto") },
    { process: { env } },
  );
  let token;
  let query;
  const auth = load(
    "src/lib/auth.ts",
    {
      "./admin-env": admin,
      bcryptjs: require("bcryptjs"),
      jose,
      "next/headers": {
        cookies: async () => ({
          get: () => (token ? { value: token } : undefined),
          set: (_name, value) => {
            token = value;
          },
          delete: () => {
            token = undefined;
          },
        }),
      },
      "next/navigation": {
        redirect: (path) => {
          throw new Error("redirect:" + path);
        },
      },
      "./constants": { AUTH_COOKIE: "session" },
      "./db": { dbConnect: async () => {} },
      "@/models/User": {
        User: {
          findOne: async (filter) => {
            query = filter;
            return null;
          },
        },
      },
    },
    { process: { env } },
  );
  return {
    env,
    admin,
    auth,
    setToken: (value) => {
      token = value;
    },
    query: () => query,
  };
}
test("admin credentials come only from env, normalize name and reject missing/short configuration", () => {
  const f = fixture();
  assert.equal(
    f.admin.verifyEnvironmentAdmin(" OWNER ", "test-password-only"),
    true,
  );
  assert.equal(f.admin.verifyEnvironmentAdmin("owner", "wrong"), false);
  assert.equal(
    f.admin.verifyEnvironmentAdmin("someone", "test-password-only"),
    false,
  );
  f.env.ADMIN_PASSWORD = "short";
  assert.equal(f.admin.isAdminConfigured(), false);
  delete f.env.ADMIN_USERNAME;
  assert.equal(f.admin.verifyEnvironmentAdmin("owner", "short"), false);
});
test("signed admin session works, changing env password revokes it; legacy admin token is rejected", async () => {
  const f = fixture();
  const session = {
    userId: f.admin.ENV_ADMIN_ID,
    username: "owner",
    role: "admin",
  };
  await f.auth.setSessionCookie(session);
  assert.equal((await f.auth.getSession()).role, "admin");
  f.env.ADMIN_PASSWORD = "new-test-password";
  assert.equal(await f.auth.getSession(), null);
  const legacy = await new jose.SignJWT({ username: "owner", role: "admin" })
    .setSubject("123456789012345678901234")
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(f.env.SESSION_SECRET));
  f.setToken(legacy);
  assert.equal(await f.auth.getSession(), null);
});
test("user sessions cannot access admin; anonymous and wrong-role pages redirect safely", async () => {
  const f = fixture();
  await assert.rejects(
    f.auth.requirePageSession("admin"),
    /redirect:\/admin\/login/,
  );
  await assert.rejects(f.auth.requirePageSession("user"), /redirect:\/login/);
  await f.auth.setSessionCookie({
    userId: "123456789012345678901234",
    username: "student",
    role: "user",
  });
  assert.equal(await f.auth.requireApiSession("admin"), null);
  await assert.rejects(
    f.auth.requirePageSession("admin"),
    /redirect:\/dashboard/,
  );
  await f.auth.setSessionCookie({
    userId: f.admin.ENV_ADMIN_ID,
    username: "owner",
    role: "admin",
  });
  assert.equal(await f.auth.requireApiSession("user"), null);
  await assert.rejects(f.auth.requirePageSession("user"), /redirect:\/admin/);
  await f.auth.clearSessionCookie();
  assert.equal(await f.auth.getSession(), null);
});
test("tampered, expired, and malformed identity sessions are rejected", async () => {
  const f = fixture();
  const sign = async (sub, role, expiry) =>
    new jose.SignJWT({ username: "student", role })
      .setSubject(sub)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(expiry)
      .sign(new TextEncoder().encode(f.env.SESSION_SECRET));
  f.setToken(await sign("123456789012345678901234", "user", 1));
  assert.equal(await f.auth.getSession(), null);
  f.setToken(await sign("invalid", "user", "7d"));
  assert.equal(await f.auth.getSession(), null);
  f.setToken(await sign("123456789012345678901234", "superadmin", "7d"));
  assert.equal(await f.auth.getSession(), null);
  const token = await sign("123456789012345678901234", "user", "7d");
  f.setToken("x" + token.slice(1));
  assert.equal(await f.auth.getSession(), null);
});
test("ordinary login query excludes legacy database administrators", async () => {
  const f = fixture();
  await f.auth.findUserForLogin(" Owner ");
  assert.equal(f.query().role, "user");
  assert.equal(f.query().username, "owner");
});
function routeFixture(role = "admin") {
  const f = fixture();
  let created;
  let loggedIn;
  let lookup = 0;
  const schema = load("src/lib/validators.ts", {
    zod: require("zod"),
    "./constants": { SUPPORTED_LANGUAGES: [{ value: "english" }] },
  });
  const mocks = {
    "@/lib/admin-env": f.admin,
    "next/server": {
      NextResponse: { json: (data) => ({ status: 200, data }) },
    },
    "@/lib/validators": schema,
    "@/lib/db": { dbConnect: async () => {} },
    "@/lib/rate-limit": { checkRateLimit: async () => ({ allowed: true }) },
    "@/lib/request": { getClientIp: () => "test" },
    "@/lib/http": {
      jsonError: (error, status) => ({ status, error }),
      handleRouteError: (error) => ({ status: 400, error: error.message }),
    },
    "@/lib/auth": {
      requireApiSession: async (expected) =>
        role === expected ? { userId: "environment-admin" } : null,
      hashPassword: f.auth.hashPassword,
      verifyPassword: f.auth.verifyPassword,
      findUserForLogin: async () => {
        lookup++;
        return null;
      },
      setSessionCookie: async (value) => {
        loggedIn = value;
      },
    },
    "@/models/User": {
      User: {
        findOne: async () => null,
        create: async (value) => {
          created = value;
          return {
            ...value,
            _id: "123456789012345678901234",
            createdAt: new Date(),
          };
        },
      },
    },
  };
  const users = load("src/app/api/admin/users/route.ts", mocks);
  const login = load("src/app/api/auth/login/route.ts", mocks);
  const request = (body) => ({ json: async () => body });
  return {
    f,
    users,
    create: (body) => users.POST(request(body)),
    login: (body) => login.POST(request(body)),
    created: () => created,
    loggedIn: () => loggedIn,
    lookup: () => lookup,
  };
}
test("login endpoint separates env admin from user login and rejects wrong passwords", async () => {
  const r = routeFixture();
  assert.equal(
    (
      await r.login({
        username: "owner",
        password: "test-password-only",
        expectedRole: "admin",
      })
    ).data.redirectTo,
    "/admin",
  );
  assert.equal(r.loggedIn().userId, "environment-admin");
  assert.equal(r.lookup(), 0);
  assert.equal(
    (
      await r.login({
        username: "owner",
        password: "wrong-password",
        expectedRole: "admin",
      })
    ).status,
    401,
  );
  assert.equal(
    (await r.login({ username: "owner", password: "test-password-only" }))
      .status,
    401,
  );
  delete r.f.env.ADMIN_PASSWORD;
  assert.equal(
    (
      await r.login({
        username: "owner",
        password: "test-password-only",
        expectedRole: "admin",
      })
    ).status,
    503,
  );
});
test("account creation requires admin, hashes password and cannot create another admin", async () => {
  const body = {
    username: "Student",
    password: "student-test-password",
    role: "admin",
  };
  assert.equal((await routeFixture("user").create(body)).status, 401);
  const r = routeFixture();
  const result = await r.create(body);
  assert.equal(result.status, 200);
  assert.equal(r.created().role, "user");
  assert.equal(r.created().username, "student");
  assert.notEqual(r.created().passwordHash, body.password);
  assert.equal(
    await require("bcryptjs").compare(body.password, r.created().passwordHash),
    true,
  );
  assert.equal(result.data.user.passwordHash, undefined);
  assert.equal(r.users.GET, undefined);
  assert.equal((await r.create({ ...body, username: "OWNER" })).status, 409);
});
test("removed admin capabilities have no remaining HTTP routes", () => {
  for (const name of [
    "audio",
    "landing",
    "options",
    "providers",
    "providers/test",
    "setup",
    "unlock-code",
  ])
    assert.equal(
      fs.existsSync(`src/app/api/admin/${name}/route.ts`),
      false,
      name,
    );
  assert.equal(fs.existsSync("src/app/admin/setup/page.tsx"), false);
});
