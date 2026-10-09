// Use real password hashing and signatures with mocked database and cookie boundaries.
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
    ADMIN_PASSWORD: "test-password",
    SESSION_SECRET: "test-secret-not-for-production-123456789",
  };
  const admin = load(
    "src/lib/admin-env.ts",
    { "node:crypto": require("node:crypto") },
    { process: { env } },
  );
  let token, options, query;
  const auth = load(
    "src/lib/auth.ts",
    {
      "./admin-env": admin,
      bcryptjs: require("bcryptjs"),
      jose,
      "next/headers": {
        cookies: async () => ({
          get: () => (token ? { value: token } : undefined),
          set: (_name, value, opts) => {
            token = value;
            options = opts;
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
    options: () => options,
    query: () => query,
  };
}
test("environment credentials use exact names and allow short values without accepting empty configuration", () => {
  const f = fixture();
  assert.equal(f.admin.verifyEnvironmentAdmin("Owner", "test-password"), true);
  assert.equal(f.admin.verifyEnvironmentAdmin("owner", "test-password"), false);
  assert.equal(
    f.admin.verifyEnvironmentAdmin(" Owner ", "test-password"),
    false,
  );
  f.env.ADMIN_USERNAME = "x";
  f.env.ADMIN_PASSWORD = "y";
  assert.equal(f.admin.verifyEnvironmentAdmin("x", "y"), true);
  delete f.env.ADMIN_PASSWORD;
  assert.equal(f.admin.isAdminConfigured(), false);
});
test("login cookie is a session cookie while preserving secure verification", async () => {
  const f = fixture();
  await f.auth.setSessionCookie({
    userId: f.admin.ENV_ADMIN_ID,
    username: "Owner",
    role: "admin",
  });
  assert.equal(f.options().maxAge, undefined);
  assert.equal(f.options().expires, undefined);
  assert.equal(f.options().httpOnly, true);
  assert.equal(f.options().sameSite, "lax");
  assert.equal((await f.auth.getSession()).role, "admin");
  f.env.ADMIN_PASSWORD = "changed";
  f.env.ADMIN_USERNAME = "Changed";
  assert.equal((await f.auth.getSession()).role, "admin");
  await f.auth.clearSessionCookie();
  assert.equal(await f.auth.getSession(), null);
});
test("database administrator sessions work, but normal users cannot access admin pages or APIs", async () => {
  const f = fixture();
  await f.auth.setSessionCookie({
    userId: "123456789012345678901234",
    username: "AdminFromDB",
    role: "admin",
  });
  assert.equal((await f.auth.requireApiSession("admin")).role, "admin");
  assert.equal(await f.auth.requireApiSession("user"), null);
  await assert.rejects(f.auth.requirePageSession("user"), /redirect:\/admin/);
  await f.auth.setSessionCookie({
    userId: "123456789012345678901234",
    username: "Student",
    role: "user",
  });
  assert.equal(await f.auth.requireApiSession("admin"), null);
  await assert.rejects(
    f.auth.requirePageSession("admin"),
    /redirect:\/dashboard/,
  );
  await f.auth.clearSessionCookie();
  await assert.rejects(
    f.auth.requirePageSession("admin"),
    /redirect:\/admin\/login/,
  );
  await assert.rejects(f.auth.requirePageSession("user"), /redirect:\/login/);
});
test("expired, tampered and malformed session identities remain rejected", async () => {
  const f = fixture();
  const sign = (sub, role, expiry) =>
    new jose.SignJWT({ username: "Student", role })
      .setSubject(sub)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(expiry)
      .sign(new TextEncoder().encode(f.env.SESSION_SECRET));
  for (const [sub, role, expiry] of [
    ["123456789012345678901234", "user", 1],
    ["invalid", "admin", "7d"],
    ["123456789012345678901234", "superadmin", "7d"],
  ]) {
    f.setToken(await sign(sub, role, expiry));
    assert.equal(await f.auth.getSession(), null);
  }
  const token = await sign("123456789012345678901234", "user", "7d");
  f.setToken("x" + token.slice(1));
  assert.equal(await f.auth.getSession(), null);
});
test("database login looks up exact username and the role of the chosen portal", async () => {
  const f = fixture();
  await f.auth.findUserForLogin(" Owner ", "admin");
  assert.equal(f.query().username, " Owner ");
  assert.equal(f.query().role, "admin");
  await f.auth.findUserForLogin("Student");
  assert.equal(f.query().role, "user");
});
function routes({ sessionRole = "admin", dbUser = null } = {}) {
  const f = fixture();
  let created, loggedIn, lookup;
  const schema = load("src/lib/validators.ts", {
    zod: require("zod"),
    "./constants": { LEARNING_LANGUAGE: "greek" },
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
      handleRouteError: (error) => ({ status: 422, error: error.message }),
    },
    "@/lib/auth": {
      requireApiSession: async (role) =>
        role === sessionRole ? { userId: "environment-admin" } : null,
      hashPassword: f.auth.hashPassword,
      verifyPassword: f.auth.verifyPassword,
      findUserForLogin: async (username, role) => {
        lookup = { username, role };
        return dbUser?.role === role ? dbUser : null;
      },
      setSessionCookie: async (session) => {
        loggedIn = session;
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
  const users = load("src/app/api/admin/users/route.ts", mocks),
    login = load("src/app/api/auth/login/route.ts", mocks);
  return {
    f,
    users,
    schema,
    create: (body) => users.POST({ json: async () => body }),
    login: (body) => login.POST({ json: async () => body }),
    created: () => created,
    loggedIn: () => loggedIn,
    lookup: () => lookup,
  };
}
test("both environment and database administrators can log in only through the admin portal", async () => {
  const r = routes();
  assert.equal(
    (
      await r.login({
        username: "Owner",
        password: "test-password",
        expectedRole: "admin",
      })
    ).data.redirectTo,
    "/admin",
  );
  assert.equal(
    (await r.login({ username: "Owner", password: "test-password" })).status,
    401,
  );
  const passwordHash = await require("bcryptjs").hash("db-test", 4);
  const db = routes({
    dbUser: {
      _id: "123456789012345678901234",
      username: "DatabaseAdmin",
      role: "admin",
      passwordHash,
    },
  });
  delete db.f.env.ADMIN_PASSWORD;
  assert.equal(
    (
      await db.login({
        username: "DatabaseAdmin",
        password: "db-test",
        expectedRole: "admin",
      })
    ).data.redirectTo,
    "/admin",
  );
  assert.equal(db.loggedIn().role, "admin");
  assert.equal(
    (
      await db.login({
        username: "DatabaseAdmin",
        password: "wrong",
        expectedRole: "admin",
      })
    ).status,
    401,
  );
  assert.equal(
    (await db.login({ username: "DatabaseAdmin", password: "db-test" })).status,
    401,
  );
});
test("only an administrator can create users or admins; username is unmodified and env name is not reserved", async () => {
  const body = { username: "Owner", password: "p", role: "admin" };
  assert.equal(
    (await routes({ sessionRole: "user" }).create(body)).status,
    401,
  );
  const r = routes();
  const result = await r.create(body);
  assert.equal(result.status, 200);
  assert.equal(r.created().username, "Owner");
  assert.equal(r.created().role, "admin");
  assert.equal(
    await require("bcryptjs").compare("p", r.created().passwordHash),
    true,
  );
  assert.equal(result.data.user.passwordHash, undefined);
  assert.equal(r.users.GET, undefined);
  await r.create({ username: " Mixed Case ", password: "s" });
  assert.equal(r.created().username, " Mixed Case ");
  assert.equal(r.created().role, "user");
  assert.equal((await r.create({ ...body, role: "superadmin" })).status, 422);
});
test("length restrictions are removed while missing credentials remain invalid", () => {
  const { schema } = routes();
  for (const length of [1, 200]) {
    const data = { username: "x".repeat(length), password: "p".repeat(length) };
    assert.equal(schema.createUserSchema.safeParse(data).success, true);
    assert.equal(schema.credentialsSchema.safeParse(data).success, true);
  }
  assert.equal(
    schema.createUserSchema.safeParse({ username: "", password: "" }).success,
    false,
  );
});
