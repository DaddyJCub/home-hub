# HomeHub → JCubHub Apps parity plan

**Goal:** bring HomeHub up to par with the other JCubHub apps — server-hosted data
that syncs across a household's users, tight integration with Central Management (CM),
a native iOS presence, Authentik SSO, and the shared theme.

**Headline finding:** most of the hard infrastructure already exists. HomeHub is not a
localStorage toy — it has a real server, relational schema, and a working sync layer.
And CM has **already scaffolded the HomeHub side** of its module platform. The work is
*onboarding HomeHub into the existing "JCubHub Apps" platform as `homehub_module`*,
following the pattern Books already proved — not a rewrite.

---

## What HomeHub already has (verified in code)

| Capability | Status | Where |
|---|---|---|
| Express + better-sqlite3 server | ✅ | `server.js` |
| Relational schema + migrations | ✅ | `users, households, household_members, sessions, user_preferences, household_data, kv_store, app_settings, user_feedback, password_reset_tokens` |
| **Server-hosted data that syncs per user + per household** | ✅ | `useKV` in `src/shims/spark-hooks.ts` → `GET/PUT /api/data/:scope/:key`, with offline queue, online/offline flush, and legacy-local→server migration |
| Secure auth | ✅ | bcrypt + signed **httpOnly** session cookie (`hh_session`, SameSite=Lax, secure in prod), session expiry + cleanup |
| Multi-user households (collaboration model) | ✅ | `households` + `household_members` + `switch-household` |
| Sentinel bug reporting → CM | ✅ | `sendToCM()` on the `X-JCubHub-Report-Contract: 1.0.0` contract |
| Ollama AI proxy | ✅ | `/api/ollama/*` (allowlisted, auth-gated) |
| PWA | ✅ | manifest + `MANUAL_QA_UI_PWA.md` |
| `/api/health` + `/api/version` | ✅ | added in the consistency pass |

> The legacy `window.spark.kv` shim (`src/shims/spark-shim.ts`) is localStorage-only,
> but **no application code uses it** for data — the app is wired to the synced `useKV`
> via the `@github/spark/hooks` Vite alias. It can be deleted later.

So "server-hosted data that syncs with users of the app" is **already true today** for a
household's members. The gaps are about the *ecosystem*, not the data layer.

---

## The platform HomeHub needs to join: "JCubHub Apps"

CM is the hub of a broker-based app platform. The moving parts (all already built for
Books):

1. **Central identity broker** (CM) — `backend/app/integrations/identity/`
   (`broker.py`, `tokens.py`, `capability_policy.py`) + `routers/identity.py`. Exchanges
   the Authentik forward-auth session for short-lived **HS256 Bearer access/refresh
   tokens** (issuer `jcubhub-apps-identity`) carrying `capabilities` + `modules` claims.
2. **Module registry** — each app is a `ModuleDef` (id, route prefix, contract id +
   version, `api_base`, capabilities, enabled flag). Frontend registry maps
   `module_id → React component` (`frontend/src/shell/moduleComponents.tsx`).
3. **Native module UI** (CM frontend) — a faithful **native React port** of the app's
   screens (no iframe), styled with CM's `platform/designTokens`, talking through a
   `client.ts` built on `createModuleClient(moduleId, "/api/native/<app>", "<contract>")`
   which injects the broker Bearer token + `X-JCubHub-Contract` header.
4. **Native API surface** (on the app's own backend) — Bearer-only, capability-gated
   `/api/native/*` routes bound to a versioned OpenAPI contract, validated by a
   `native-auth` middleware that shares the broker's signing key.
5. **iOS** — CM's Capacitor app loads the Authentik-gated CM site in a WebView; every
   enabled module ships inside it automatically. **No separate iOS app per module.**

### CM has already stubbed HomeHub in

- `capability_policy.py`: capability `homehub.read` ("apps.homehub", *"Read retained
  homehub features"*) and a registered module:
  `module_id="homehub_module"`, `route_prefix="/m/homehub"`, `title="HomeHub"`,
  `contract_id="homehub"`, `baseline_version="0.1.0"`.
- `config/keys.py` + `services/bootstrap.py`: `MODULE_HOMEHUB_ENABLED` (default
  `false`), `MODULE_HOMEHUB_CONTRACT_VERSION` (`0.1.0`), `MODULE_HOMEHUB_API_BASE` (empty).
- `shell/moduleComponents.tsx`: `// print_module, homehub_module are added as their
  native UIs land.`

In other words: **CM is waiting for HomeHub to implement its side.** Enabling it is a
config flip once the pieces below exist.

---

## Gap analysis (HomeHub vs. the other apps)

| Area | Today | Target | Size |
|---|---|---|---|
| Data sync across a household | ✅ works | keep | — |
| **Authentik SSO** | ❌ local bcrypt only | broker Bearer for native + Authentik forward-auth for standalone web | M |
| **Native `/api/native/homehub` surface** | ❌ none | Bearer + capability-gated, contract-bound | M |
| **`homehub` OpenAPI contract** | ❌ none | `homehub/0.1.0` | S |
| **CM native module UI** | ❌ none | `HomeHubModule.tsx` + `client.ts` | L |
| **Native iOS presence** | ❌ (PWA only) | rides CM's Capacitor app once module enabled | S (falls out of the above) |
| **Theme** | ❌ warm orange / Karla+Bitter | indigo/zinc + Inter (standalone); CM tokens (module) | S |
| Database engine | SQLite (better-sqlite3) | **keep** — Books ships on SQLite; the platform is API-brokered, not shared-DB | — |

Note on the DB question: the platform deliberately connects apps **through the broker +
contracts, not a shared database**. Books runs on SQLite and is fully integrated, so
HomeHub does **not** need Postgres. Moving to Postgres would only matter if you wanted CM
to query HomeHub's tables directly, which the architecture intentionally avoids.

---

## Plan (phased, each phase independently shippable & non-breaking)

### Phase 0 — Decisions (short, do first)
- **Retained feature set for v0.1.0.** The capability is scoped to *"retained homehub
  features."* Pick the native surface: recommend **chores + shopping list + upcoming
  meals + calendar (read)** for v0.1.0, add write actions in v0.2.0.
- **Auth strategy.** Recommend **dual-auth**: keep the existing bcrypt/session for the
  standalone web app, and add broker-Bearer validation for the native surface (exactly
  what Books does). Full Authentik-forward-auth for the standalone web can follow.
- **Shared secret.** HomeHub and CM must share `IDENTITY_TOKEN_SIGNING_SECRET` (or both
  derive from the same `ENCRYPTION_KEY`). Provision this in HomeHub's env.

### Phase 1 — HomeHub native API surface (HomeHub backend) — *additive, ships alone*
- Port `backend/middleware/native-auth.js` from Books: verify HS256 broker token
  (issuer `jcubhub-apps-identity`), enforce `homehub.read` / `homehub.write`, expose
  `req.native = { userId, username, email, caps }`.
- Add `backend/routes/native-homehub.js`: capability-gated read endpoints for the
  retained features, scoped to the caller's household, returning `X-JCubHub-Contract:
  homehub/0.1.0`. Back these with the **existing** `household_data` / `kv_store`.
- Author `contracts/homehub.openapi.yaml` (`homehub/0.1.0`).
- Env: `IDENTITY_TOKEN_SIGNING_SECRET` (or `ENCRYPTION_KEY`).
- *Non-breaking:* new routes only; the standalone app is untouched.

### Phase 2 — CM native module UI (CM frontend) — *behind `enabled=false` until ready*
- Build `frontend/src/modules/homehub/HomeHubModule.tsx` + `client.ts`
  (`createModuleClient("homehub_module", "/api/native/homehub", "homehub/0.1.0")`),
  a faithful native port of the retained screens, styled with `platform/designTokens`.
- Register `homehub_module: HomeHubModule` in `moduleComponents.tsx`.
- Configure CM: `MODULE_HOMEHUB_API_BASE` = HomeHub origin, `MODULE_HOMEHUB_ENABLED=true`,
  contract version `0.1.0`.

### Phase 3 — Authentik / identity
- Put the standalone HomeHub web app behind Authentik forward-auth at the proxy (mirror
  CM's model), OR keep local auth for standalone and rely on the broker for native.
- Map Authentik groups → HomeHub RBAC → capabilities (CM's `capabilities_for()` already
  does RBAC→caps translation; align HomeHub's roles to it).

### Phase 4 — iOS (mostly free)
- Once `homehub_module` is enabled, it renders **inside CM's existing Capacitor iOS app**
  — no separate build. Optional: add HomeHub push via CM's device-provision flow.

### Phase 5 — Theme alignment (standalone web)
- Replace the warm-orange oklch palette + Karla/Bitter with the ecosystem **indigo/zinc +
  Inter** tokens (source of truth: jcubhub-home `globals.css` / CM `platform/designTokens`).
  The native module already inherits CM tokens, so this only affects the standalone PWA.

### Phase 6 — QA & cutover
- Contract test HomeHub's native surface against `homehub/0.1.0`.
- Capability-enforcement + household-scoping tests (deny-by-default).
- Sync/integration test across two household users.
- Flip `MODULE_HOMEHUB_ENABLED=true`; QA in the CM iOS app.

---

## Suggested sequencing

1. **Phase 0 + Phase 1** first — they're self-contained on the HomeHub side and unblock
   everything (CM can already mint tokens for `homehub.read`).
2. **Phase 2** in parallel once the contract (Phase 1) is drafted.
3. **Phase 5 (theme)** any time — independent, cosmetic, low-risk.
4. **Phase 3/4** once 1–2 are green.

## Reference files (the Books blueprint)

- Native backend: `jcubhub-books/backend/middleware/native-auth.js`,
  `jcubhub-books/backend/routes/native-books.js` (`CONTRACT = 'books/1.0.0'`).
- CM module: `jcubhub-central-management/frontend/src/modules/books/BooksModule.tsx` +
  `client.ts`; registry `frontend/src/shell/moduleComponents.tsx`.
- Broker/identity: `jcubhub-central-management/backend/app/integrations/identity/`
  (`broker.py`, `tokens.py`, `capability_policy.py`), `routers/identity.py`.
- HomeHub-side stubs already present in CM: `capability_policy.py` (`homehub_module`),
  `config/keys.py`, `services/bootstrap.py`.
