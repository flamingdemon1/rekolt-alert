import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/** Imports the built worker exactly as Sites will execute it. */
async function request(path = "/", init = {}, envOverrides = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
      ...init,
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
      ...envOverrides,
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

/**
 * Small in-memory D1 test double. It exercises the real auth services and SQL
 * call sequence without weakening the production SQLite implementation.
 */
function createFakeShopDatabase() {
  const users = new Map();
  const sessions = new Map();

  function prepare(sql) {
    const query = sql.replace(/\s+/g, " ").trim();
    let parameters = [];

    const statement = {
      bind(...values) {
        parameters = values;
        return statement;
      },
      async first() {
        if (
          query.includes("FROM shop_users") &&
          query.includes("WHERE username_normalized")
        ) {
          return users.get(parameters[0]) ?? null;
        }

        if (query.includes("FROM shop_sessions AS sessions")) {
          const session = sessions.get(parameters[0]);
          const user = session ? users.get(session.usernameNormalized) : null;
          if (!session || !user || session.expiresAt <= parameters[1]) {
            return null;
          }
          return {
            id: user.id,
            username: user.username,
            expiresAt: session.expiresAt,
          };
        }

        throw new Error(`Unhandled fake D1 read: ${query}`);
      },
      async run() {
        if (query.startsWith("CREATE ")) {
          return { success: true };
        }

        if (query.startsWith("INSERT INTO shop_users")) {
          const [
            id,
            username,
            usernameNormalized,
            passwordHash,
            passwordSalt,
            passwordIterations,
          ] = parameters;
          if (users.has(usernameNormalized)) {
            throw new Error("UNIQUE constraint failed");
          }
          users.set(usernameNormalized, {
            id,
            username,
            usernameNormalized,
            passwordHash,
            passwordSalt,
            passwordIterations,
          });
          return { success: true };
        }

        if (
          query.startsWith("DELETE FROM shop_sessions") &&
          query.includes("expires_at")
        ) {
          sessions.forEach((session, tokenHash) => {
            if (session.expiresAt <= parameters[0]) sessions.delete(tokenHash);
          });
          return { success: true };
        }

        if (query.startsWith("INSERT INTO shop_sessions")) {
          const [tokenHash, userId, expiresAt] = parameters;
          const user = [...users.values()].find(
            (candidate) => candidate.id === userId,
          );
          if (!user) throw new Error("FOREIGN KEY constraint failed");
          sessions.set(tokenHash, {
            usernameNormalized: user.usernameNormalized,
            expiresAt,
          });
          return { success: true };
        }

        if (query.startsWith("DELETE FROM shop_sessions")) {
          sessions.delete(parameters[0]);
          return { success: true };
        }

        throw new Error(`Unhandled fake D1 write: ${query}`);
      },
    };

    return statement;
  }

  return {
    users,
    sessions,
    prepare,
    async batch(statements) {
      return Promise.all(statements.map((statement) => statement.run()));
    },
  };
}

test("server-renders the finished Kreol homepage", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(
    html,
    /<title>Rekolt Alert — Protez sak rekolt Moris \| Rekolt Alert<\/title>/i,
  );
  assert.match(html, /Gard nou rekolt/);
  assert.match(html, /an sekirite\./);
  assert.match(html, /Kouma li marse/);
  assert.match(html, /Dokter Plant/);
  assert.match(html, /Alert par distrik/);
  assert.match(html, /Kreol Morisien/);
  assert.match(html, /Tap pou servi ou pozision exak/);
  assert.match(html, /Aktiv mo pozision/);
  assert.match(html, /href="\/check-plant"/);
  assert.doesNotMatch(html, />Scroll</);
  assert.doesNotMatch(html, /href="#alert"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("keeps alerts on home and moves other sections to separate routes", async () => {
  const [
    home,
    content,
    districtData,
    packageJson,
    weatherHook,
    weatherWidget,
    weatherService,
    alertSection,
    globalStyles,
    routeFiles,
    dataRoute,
  ] = await Promise.all([
    readFile(
      new URL("../app/components/RekoltAlertHome.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/data/site-content.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/data/mauritius-districts.json", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(
      new URL("../app/hooks/useLiveWeather.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/components/WeatherWidget.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/backend/weather/weather.service.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/components/AlertSection.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    Promise.all(
      [
        "kouma-li-marse",
        "resours",
        "lor-nou",
      ].map((route) =>
        readFile(new URL(`../app/${route}/page.tsx`, import.meta.url), "utf8"),
      ),
    ),
    readFile(
      new URL("../app/banne-done/page.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(home, /<Header/);
  assert.match(home, /<HeroSection/);
  assert.match(home, /<AlertSection/);
  assert.doesNotMatch(home, /<HowItWorksSection/);
  assert.doesNotMatch(home, /<ResourcesSection/);
  assert.equal(routeFiles.length, 3);
  routeFiles.forEach((routeFile) => assert.match(routeFile, /<SegmentPage/));
  assert.match(dataRoute, /<DistrictDataPage/);

  const shopPage = await readFile(
    new URL("../app/magazin/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(shopPage, /requireCurrentShopUser/);
  assert.match(shopPage, /ShopCataloguePage/);

  const districts = JSON.parse(districtData);
  assert.equal(districts.features.length, 9);
  assert.equal(
    new Set(districts.features.map((feature) => feature.properties.name)).size,
    9,
  );

  assert.match(content, /Rivière du Rempart/);
  assert.match(content, /Plaines Wilhems/);
  assert.match(packageJson, /"d3-geo"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(weatherHook, /watchPosition/);
  assert.match(weatherHook, /clearWatch/);
  assert.match(weatherHook, /enableHighAccuracy: true/);
  assert.match(weatherHook, /maximumAge: 0/);
  assert.match(weatherHook, /MAX_LOCAL_ACCURACY_METERS = 1_500/);
  assert.match(weatherHook, /status: "inaccurate"/);
  assert.match(weatherHook, /navigator\.permissions/);
  assert.match(weatherHook, /https:\/\/ipapi\.co\/json\//);
  assert.match(weatherHook, /return \{ weather, requestLocation, requestApproximateLocation \}/);
  const permissionEffectStart = weatherHook.lastIndexOf("  useEffect(()");
  const permissionEffectEnd = weatherHook.indexOf(
    "\n\n  return { weather",
    permissionEffectStart,
  );
  assert.doesNotMatch(
    weatherHook.slice(permissionEffectStart, permissionEffectEnd),
    /requestApproximateLocation/,
  );
  assert.match(weatherWidget, /weatherApproximateAction/);
  assert.match(weatherWidget, /onClick=\{requestApproximateLocation\}/);
  assert.doesNotMatch(weatherHook, /setTimeout\(requestLocation,\s*0\)/);
  assert.match(weatherService, /reverse-geocode-client/);
  assert.match(weatherService, /precipitation/);
  assert.match(alertSection, /onPointerMove=\{tiltCard\}/);
  assert.match(
    globalStyles,
    /\.map-stage\s*\{[^}]*margin:\s*-2px auto 12px;[^}]*overflow:\s*hidden;/s,
  );
});

test("weather endpoint uses supplied coordinates and returns an assessment", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.startsWith("https://api.open-meteo.com/")) {
      return Response.json({
        current: {
          temperature_2m: 29.4,
          relative_humidity_2m: 88,
          precipitation: 0,
          weather_code: 2,
          wind_speed_10m: 13.2,
        },
      });
    }

    if (url.startsWith("https://api.bigdatacloud.net/")) {
      return Response.json({
        locality: "Moka",
        principalSubdivision: "Moka District",
      });
    }

    return originalFetch(input);
  };

  try {
    const response = await request(
      "/api/weather?latitude=-20.2302&longitude=57.4989",
      { headers: { accept: "application/json" } },
    );
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.temperature, 29);
    assert.equal(result.humidity, 88);
    assert.equal(result.precipitation, 0);
    assert.equal(result.assessment, "warning-fungal");
    assert.match(result.location, /Moka/);

    const invalidResponse = await request("/api/weather", {
      headers: { accept: "application/json" },
    });
    assert.equal(invalidResponse.status, 400);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("map districts open a focused Data page with a 3D morph", async () => {
  const response = await request("/banne-done?district=flacq");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /data-district-data-page="flacq"/);
  assert.match(html, />Flak</);
  assert.match(html, /Pizon rouz lor tomat/);
  assert.match(html, /Piron lor piman/);
  assert.doesNotMatch(html, /data-district-data-page="pamplemousses"/);

  const [
    home,
    map,
    dataPage,
    silhouette,
    dataService,
    globalStyles,
  ] = await Promise.all([
    readFile(
      new URL("../app/components/RekoltAlertHome.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/components/DistrictMap.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/components/pages/DistrictDataPage.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/components/DistrictSilhouette.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/backend/pages/data.service.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(home, /document\.startViewTransition/);
  assert.match(home, /\/banne-done\?district=/);
  assert.match(map, /Open district data/);
  assert.match(map, /district-morph-shape/);
  assert.match(dataPage, /district-focus-card/);
  assert.match(dataPage, /<DistrictSilhouette/);
  assert.match(dataPage, /district-issue-list/);
  assert.match(silhouette, /mauritius-districts\.json/);
  assert.match(silhouette, /district-focus-shape/);
  assert.match(dataService, /getDistrictDataPage/);
  assert.match(globalStyles, /view-transition-name:\s*district-shape/);
  assert.match(globalStyles, /@keyframes district-shape-land-in/);
  assert.doesNotMatch(globalStyles, /view-transition-name:\s*district-portal/);
});

test("plant-check backend validates an image and returns useful screening", async () => {
  const form = new FormData();
  form.set(
    "image",
    new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "leaf.jpg", {
      type: "image/jpeg",
    }),
  );
  form.set("crop", "tomato");
  form.append("symptoms", "spots");

  const response = await request("/api/plant-check", {
    method: "POST",
    body: form,
    headers: {},
  });
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.crop, "tomato");
  assert.equal(result.risk, "moderate");
  assert.match(result.finding.mfe, /tach/i);
  assert.match(result.disclaimer.en, /preliminary screening/i);
});

test("Dokter Plant answers a private conversational plant report", async () => {
  const pageResponse = await request("/check-plant");
  const pageHtml = await pageResponse.text();
  assert.equal(pageResponse.status, 200);
  assert.match(pageHtml, /Dokter Plant/);

  const form = new FormData();
  form.set("prompt", "My tomato leaves have black spots.");
  form.append(
    "attachments",
    new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "tomato.jpg", {
      type: "image/jpeg",
    }),
  );

  const response = await request("/api/plant-chat", {
    method: "POST",
    body: form,
    headers: {},
  });
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.risk, "moderate");
  assert.match(result.message.en, /Leaf spots/i);
  assert.match(result.privacy.en, /not stored in a database/i);

  const interfaceSource = await readFile(
    new URL("../app/components/pages/CheckPlantPage.tsx", import.meta.url),
    "utf8",
  );
  assert.match(interfaceSource, /SpeechSynthesisUtterance/);
  assert.match(interfaceSource, /webkitSpeechRecognition/);
  assert.match(interfaceSource, /multiple/);
});

test("shop registration hashes credentials and protects all 46 products", async () => {
  const loginPageResponse = await request("/magazin/login");
  const loginPageHtml = await loginPageResponse.text();
  assert.equal(loginPageResponse.status, 200);
  assert.match(loginPageHtml, /\/shop\/vegetable-seedlings\.webp/);
  assert.doesNotMatch(loginPageHtml, /\/_vinext\/image/);

  const database = createFakeShopDatabase();
  const password = "Kan-Sik!2026";
  const registerResponse = await request(
    "/api/shop-auth/register",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({ username: "Planter.mu", password }),
    },
    { DB: database },
  );

  assert.equal(registerResponse.status, 201);
  const setCookie = registerResponse.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /rekolt_shop_session=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);

  const storedUser = database.users.get("planter.mu");
  assert.ok(storedUser);
  assert.notEqual(storedUser.passwordHash, password);
  assert.equal(storedUser.passwordIterations, 210_000);
  assert.ok(storedUser.passwordSalt);
  assert.equal(Object.hasOwn(storedUser, "password"), false);

  const cookie = setCookie.split(";")[0];
  const shopResponse = await request(
    "/magazin",
    { headers: { accept: "text/html", cookie } },
    { DB: database },
  );
  const shopHtml = await shopResponse.text();

  assert.equal(shopResponse.status, 200);
  assert.match(shopHtml, /data-shop-catalog/);
  assert.match(shopHtml, /Planter\.mu/);
  assert.match(shopHtml, />46</);
  assert.match(shopHtml, /Pomme de terre/);
  assert.match(shopHtml, /Chaux/);
  assert.match(
    shopHtml,
    /Plant bann tuberkil direk dan bann siyon ki finn bien prepare/,
  );
  assert.match(shopHtml, />Azout</);
  assert.doesNotMatch(shopHtml, /\/_vinext\/image/);

  const [
    shopInterface,
    cartInterface,
    checkoutInterface,
    cartHook,
    kreolTranslations,
  ] =
    await Promise.all([
      readFile(
        new URL(
          "../app/components/pages/ShopCataloguePage.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../app/components/shop/ShopCartDrawer.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../app/components/shop/ShopCheckout.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/hooks/useShopCart.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../app/data/shop-kreol-translations.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);
  assert.match(shopInterface, /<ShopCartDrawer/);
  assert.match(shopInterface, /<ShopCheckout/);
  assert.match(cartHook, /rekolt-shop-cart:/);
  assert.match(checkoutInterface, /delivery === "pickup" && method !== "cash"/);
  assert.match(checkoutInterface, /Do not enter a real card number/);
  assert.match(cartInterface, /REKOLT10/);
  assert.match(cartInterface, /MORIS50/);
  assert.match(kreolTranslations, /CROP_024/);
  assert.match(kreolTranslations, /CHEM_022/);

  const rejectedLogin = await request(
    "/api/shop-auth/login",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({
        username: "Planter.mu",
        password: "Wrong-password",
      }),
    },
    { DB: database },
  );
  assert.equal(rejectedLogin.status, 401);

  const logoutResponse = await request(
    "/api/shop-auth/logout",
    {
      method: "POST",
      headers: { cookie, origin: "http://localhost" },
    },
    { DB: database },
  );
  assert.equal(logoutResponse.status, 200);
  assert.equal(database.sessions.size, 0);

  const protectedResponse = await request(
    "/magazin",
    { headers: { accept: "text/html", cookie } },
    { DB: database },
  );
  assert.ok([302, 307].includes(protectedResponse.status));
  assert.match(
    protectedResponse.headers.get("location") ?? "",
    /\/magazin\/login/,
  );
});
