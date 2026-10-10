# Lead Management System

A CRM-style Lead Management System for managing leads, assignments, follow-ups, notes, activity history, users, and notifications.

**Frontend:** React, Vite, Material UI (MUI), Redux Toolkit, RTK Query, React Router, React Hook Form, Zod, and Recharts
**Backend:** Node.js, Express.js, Prisma ORM, and PostgreSQL
**Authentication:** JWT access and refresh tokens
**Authorization:** Permission-driven Role-Based Access Control (RBAC)
**Roles:** Admin, Manager, and Executive

The application includes a responsive interface for desktop, tablet, and mobile devices, role-scoped dashboards, lead management workflows, and an in-app notification center.

---

## Project Structure

```text
lead-management-system/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── config/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── routes/
│   │   └── theme/
│   ├── .env.example
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

The structure above summarizes the principal project directories; individual files may vary as the project evolves.

---

## 1. Local Setup

### Prerequisites

* Node.js 18 or later
* npm
* Docker and Docker Compose for the provided local PostgreSQL setup, or access to an existing PostgreSQL instance
* Git, if cloning the repository

### Clone the Repository

```bash
git clone https://github.com/Shashank-Daga/Lead-Management-System.git
cd Lead-Management-System
```

If you have already cloned the repository, navigate to its root directory instead.

### Start PostgreSQL

From the project root:

```bash
docker compose up -d
```

This starts the PostgreSQL service configured in `docker-compose.yml`. Check that the service is running before proceeding.

If you use an existing PostgreSQL instance, make sure the database and credentials match your backend configuration.

### Configure the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create your local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, you can alternatively run:

```powershell
Copy-Item .env.example .env
```

Configure the values in `backend/.env`:

```env
DATABASE_URL="postgresql://lms_user:lms_password@localhost:5432/lms_db?schema=public"

JWT_ACCESS_SECRET="REPLACE_WITH_A_STRONG_RANDOM_SECRET"
JWT_REFRESH_SECRET="REPLACE_WITH_A_DIFFERENT_STRONG_RANDOM_SECRET"

JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

PORT=4000
CORS_ORIGIN="http://localhost:5173"
NODE_ENV="development"
```

The database connection string above is an example. Use the credentials and database name defined by your actual PostgreSQL setup.

Generate strong, independent JWT secrets using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run the command twice to generate separate values for the access and refresh secrets.

Install dependencies and prepare the database:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

If migrations have already been created and committed, use the existing migrations rather than creating an unnecessary new initial migration. For a fresh database, `npx prisma migrate dev` applies the pending development migrations.

The backend API runs at:

```text
http://localhost:4000
```

The backend provides a health endpoint at `/health`.

### Demo Accounts

After running the seed script, the following demo accounts are available:

| Email                | Role      |
| -------------------- | --------- |
| `admin@demo.com`     | Admin     |
| `manager@demo.com`   | Manager   |
| `executive@demo.com` | Executive |

**Demo password:** `ChangeMe123!`

The Executive account reports to the seeded Manager account.

These are development/demo credentials only. Never use the default demo password for real users or a production deployment. Change or remove demo credentials before making a deployment available to external users.

The seed script initializes permissions, roles, and three demo users.

### Configure the Frontend

Open a separate terminal and navigate to the frontend directory:

```bash
cd frontend
```

Create the local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

The default frontend environment configuration is:

```env
VITE_API_BASE_URL="/api"
```

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The frontend is available at:

```text
http://localhost:5173
```

The Vite development server proxies `/api` requests to the backend at `http://localhost:4000`, as configured in `vite.config.js`.

This proxy configuration allows local development without requiring a separate cross-origin browser request.

---

## 2. Production Deployment

The application can be deployed using a managed PostgreSQL database, a Node.js hosting platform for the backend, and a static hosting platform for the frontend.

### Step 1: Provision PostgreSQL

Provision a PostgreSQL database using a managed provider or your own infrastructure.

Obtain the connection string and configure it as `DATABASE_URL` in the backend deployment environment.

### Step 2: Configure Backend Environment Variables

Set the following values in the backend hosting provider's environment settings:

* `DATABASE_URL`
* `JWT_ACCESS_SECRET`
* `JWT_REFRESH_SECRET`
* `JWT_ACCESS_EXPIRES_IN`
* `JWT_REFRESH_EXPIRES_IN`
* `PORT`, if required by the hosting platform
* `CORS_ORIGIN`
* `NODE_ENV=production`

Generate strong, independent JWT secrets for production. Do not reuse secrets from local development.

The application validates required environment variables and enforces production JWT secret requirements. Review `backend/src/config/validateEnv.js` for the actual validation rules.

Never commit real credentials or production environment files to Git.

### Step 3: Apply Database Migrations

From the backend directory, install the locked dependencies and generate the Prisma client:

```bash
npm ci
npx prisma generate
npm run prisma:deploy
```

`npm run prisma:deploy` executes Prisma's production migration deployment command against the configured database.

Do not use `prisma migrate dev` against a production database.

Back up important data and verify the migration plan before applying schema changes to a live system.

Run the demo seed script in production only if demo accounts and seeded permissions are intentionally required. For real production users, use a controlled provisioning process and secure initial credentials.

### Step 4: Deploy the Backend

Deploy the backend to a Node.js hosting platform.

The production start command is:

```bash
npm start
```

Make sure the hosting environment supports the Node.js version, Prisma client, and database connectivity required by the application.

Configure `CORS_ORIGIN` to match the actual frontend origin. The backend's CORS configuration must allow only the intended origins.

### Step 5: Configure and Build the Frontend

Configure `VITE_API_BASE_URL` before building the frontend.

If the deployed frontend is served behind a reverse proxy that forwards `/api` requests to the backend, the relative `/api` value can be retained.

Otherwise, configure it to point to the appropriate deployed API base URL.

Build the frontend:

```bash
cd frontend
npm ci
npm run build
```

Vite generates the production build in:

```text
frontend/dist/
```

Deploy this static directory to your chosen hosting provider.

**Important:** Vite environment variables are embedded in the client build. Do not put passwords, private API keys, JWT secrets, or other confidential values in `VITE_*` variables.

### Step 6: Verify the Deployment

After deployment, verify:

* The frontend loads successfully.
* The backend health endpoint responds.
* Database connectivity and migrations are correct.
* Login and authentication work.
* Role and permission restrictions are enforced.
* Lead CRUD, assignments, notes, and follow-ups work.
* Notifications load and can be marked as read.
* Direct navigation and browser refresh work on supported routes.
* CORS allows the intended frontend origin and rejects unauthorized origins.
* No secrets are exposed in client-side bundles or public repositories.

A successful build alone does not establish that the deployed application is fully production-ready.

---

## 3. Authentication and RBAC

Authorization is **permission-driven rather than based solely on role names**.

### Roles and Permissions

The system uses three baseline roles:

* **Admin:** Administrative access, including user management and authorized lead operations.
* **Manager:** Access to permitted lead and team-management operations within the manager's authorized scope.
* **Executive:** Access to permitted lead operations within the executive's authorized scope.

The actual capabilities of each role are defined by its associated permissions and the backend's data-scope rules.

### Permission Model

The database uses permission records and role-permission associations:

* `Permission` stores granular permission identifiers such as `lead.create` and `lead.assign`.
* `Role` represents a role.
* `RolePermission` associates roles with their permitted actions.

The default permission wiring used by the seed script is defined in:

```text
backend/src/config/permissions.js
```

Authorization middleware is implemented in:

```text
backend/src/middleware/authorize.js
```

Lead visibility and access scope are handled by the relevant lead-scope service, including:

```text
backend/src/services/leadScope.service.js
```

### Server-Side Enforcement

**Frontend permission checks are not a security boundary.**

The frontend's `usePermission()` hook controls which actions are displayed to the user. The backend independently verifies authorization before allowing protected operations.

A request made directly to the API without the required permission must be rejected by the server.

The backend also enforces lead-access scope and relevant user-hierarchy restrictions. Hiding a button in the frontend does not replace these checks.

The permission-based design can support additional roles through database configuration where the relevant permissions and business rules already support them. New role requirements may still require code changes if they introduce new business behavior or data-scope rules.

---

## 4. Backend Testing

From the backend directory:

```bash
cd backend
npm ci
npx prisma generate
npm test
```

The backend test command runs Node.js's built-in test runner against the test files.

The existing test suite covers areas including:

| Test suite                                    | Coverage                                                                                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `httpAuth.test.js`                            | Login, token validation, token expiry/forgery, refresh-token type enforcement, and RBAC boundaries                                                                            |
| `httpLeadSecurity.test.js`                    | Lead access scope, IDOR protection, lead CRUD, status and priority operations, history, notes, follow-ups, assignment, filtering, pagination, sorting, and status transitions |
| `httpUserHierarchy.test.js`                   | Manager/Executive hierarchy rules, assignment notifications, manager deactivation behavior, and user access restrictions                                                      |
| `httpScopeViews.test.js`                      | Role-scoped dashboards, CSV export scope, and notification privacy                                                                                                            |
| `serviceFixes.test.js` and smaller test files | Service-level behavior and regression coverage                                                                                                                                |
| `securityIntegration.test.js`                 | Additional security integration checks that require a generated Prisma client and a live PostgreSQL database                                                                  |

Consult the individual test files for their exact coverage and setup requirements.

### Database Test Limitations

Some HTTP test suites use the test helper:

```text
backend/tests/helpers/memoryDb.js
```

These tests exercise the Express application, service logic, and authorization behavior using the configured in-memory test database.

They do not fully validate PostgreSQL query behavior, database constraints, indexes, or migration correctness.

A test suite requiring a live PostgreSQL database may be skipped when its prerequisites are unavailable. A skipped test is not a passing test.

Before release, run the relevant integration checks against a properly configured PostgreSQL database and verify that all required tests actually execute.

---

## 5. Frontend Testing

From the frontend directory:

```bash
cd frontend
npm ci
npm test
```

The frontend test command uses Vitest.

The existing regression coverage includes:

* `EditFollowUpDialog.test.jsx`: verifies that follow-up data is refreshed correctly when the dialog is reopened for a different follow-up, avoiding stale due dates, notes, or statuses.

Run the available test suite and investigate any failures rather than assuming that a successful production build means all UI behavior has been tested.

### Manual UI and Responsive Verification

The interface has been redesigned for responsive desktop, tablet, and mobile usage.

Important areas to verify include:

* Login and authentication
* Dashboard KPIs and charts
* Leads list, filters, pagination, and mobile cards
* Lead details and editing
* Follow-ups, notes, and activity history
* User management
* Notifications
* Navigation, dialogs, loading states, and error states

Suggested viewport sizes:

| Device class  |   Viewport width |
| ------------- | ---------------: |
| Small phone   |            375px |
| Phone         |            390px |
| Large phone   |            430px |
| Tablet        |            768px |
| Small laptop  |           1024px |
| Desktop       |           1366px |
| Large desktop | 1440px and above |

Check for horizontal overflow, clipped content, inaccessible controls, and broken navigation.

Automated browser-level end-to-end tests are not yet implemented.

---

## 6. Implemented Features

### Authentication and Authorization

* JWT access and refresh tokens
* Token-type enforcement
* Permission-driven RBAC
* Server-side permission checks
* Role-scoped access to protected operations
* Startup environment validation

### Lead Management

* Lead creation, viewing, editing, and soft deletion
* Lead assignment and reassignment
* Assignment history with resolved names
* Status lifecycle and transition validation
* Priority management
* Search, filtering, sorting, and pagination
* CSV export with error handling
* Lead details and associated activity views

### Follow-ups, Notes, and History

* Follow-up creation, editing, and deletion
* Due-date tracking and overdue indicators
* Lead notes with edit and delete operations
* Activity and audit history
* Assignment and status-related history

### Dashboard and Reporting

* Role-scoped dashboards for Admin, Manager, and Executive
* Open, new, resolved, and overdue lead metrics
* Dashboard charts and activity summaries
* Data scoped according to the user's authorization

### User Management

* Administrative user management
* Admin, Manager, and Executive roles
* Executive-to-Manager assignment
* User editing and manager selection
* Manager deactivation handling and associated business rules

### Notifications

* In-app notification center
* Unread notification badge
* Mark-as-read behavior
* Polling at 30-second intervals
* Click-to-navigate to the relevant lead or filtered lead list

### UI/UX and Performance

* Responsive application layout and navigation
* Responsive dashboard, lead list, lead details, and user-management screens
* Mobile lead and user cards
* Improved loading, empty, and error states
* Login UI improvements
* Accessibility and responsive QA improvements
* Route-level lazy loading to split page code into separate JavaScript chunks

---

## 7. Deferred Features

The following are not currently represented as completed features:

* Bulk lead operations
* Real-time notifications using WebSockets
* Configurable report definitions beyond the existing dashboard KPIs
* Automated browser-level end-to-end tests
* Full integration testing of all relevant flows against a real PostgreSQL deployment
* Refresh-token revocation and rotation for stronger authentication security

These items can be considered for future development according to project requirements.

---

## 8. Known Security Limitations

### Stateless Refresh Tokens

**Refresh tokens are stateless JWTs and do not have a server-side revocation mechanism.**

The refresh flow verifies the refresh token and checks whether the user is still active before issuing a new access token. However, there is no server-side record of issued refresh tokens that allows an individual token to be revoked.

Consequently, a leaked refresh token may remain usable until its expiry, provided the token remains valid and the refresh endpoint's user checks permit it.

The default refresh-token lifetime is:

```env
JWT_REFRESH_EXPIRES_IN="7d"
```

Account deactivation checks can prevent refresh attempts once the backend detects that the user is inactive. They do not provide a general token-revocation mechanism.

Password-reset or logout-everywhere functionality, if introduced, must not be assumed to invalidate previously issued refresh tokens unless explicit revocation support is implemented.

### Recommended Improvement

For stronger authentication security, implement a server-side refresh-token store. A typical design uses a random token identifier or token hash stored in the database, with token rotation and revocation checks on every refresh.

This would support explicit invalidation of tokens, logout-everywhere behavior, and stronger handling of compromised refresh credentials.

Until such functionality is implemented and tested, **the refresh-token mechanism should not be described as fully production-hardened**.

### Additional Production Considerations

Before a public or business-critical deployment:

* Use HTTPS for all application traffic.
* Use strong, unique production secrets.
* Keep `.env` files and credentials out of Git.
* Configure CORS for the intended frontend origins only.
* Use least-privilege database credentials.
* Apply database migrations through the deployment process.
* Review authentication rate limits and monitoring requirements.
* Avoid using demo accounts or default demo passwords in production.
* Test authorization and data-scope boundaries against the deployed configuration.
* Maintain backups and a recovery plan for production data.

---

## 9. Environment Files and Repository Hygiene

The repository provides environment templates:

```text
backend/.env.example
frontend/.env.example
```

Create local `.env` files from these templates and supply the appropriate local or deployment-specific values.

Real environment files, credentials, generated build output, logs, and dependency directories should not be committed to the repository.

Typical exclusions include:

```gitignore
node_modules/
.env
.env.*
!.env.example
dist/
build/
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*
.DS_Store
Thumbs.db
```

Merge these patterns with the existing `.gitignore` rules rather than removing other necessary project-specific exclusions.

The frontend production build is generated in `frontend/dist/`. The backend production process uses the configured Node.js runtime and generated Prisma client.

For reproducible installations, use `npm ci` when a valid `package-lock.json` is available. Do not commit `node_modules`; dependencies should be installed for the target platform.

---

## 10. Production Readiness Checklist

Before submitting or deploying the project, verify the following.

### Configuration and Security

* [ ] Real `.env` files are excluded from Git and public archives.
* [ ] `.env.example` files contain only safe placeholders and documented defaults.
* [ ] Production JWT secrets are strong and distinct.
* [ ] Production `DATABASE_URL` points to the intended database.
* [ ] `CORS_ORIGIN` matches the deployed frontend origin.
* [ ] The frontend API base URL is correct for the deployment topology.
* [ ] Demo credentials are not used for real accounts.
* [ ] Known refresh-token limitations are documented.

### Database and Backend

* [ ] Prisma client generation succeeds on the target environment.
* [ ] Database migrations apply successfully.
* [ ] Backend tests have been run and their results reviewed.
* [ ] Required integration tests have not been silently skipped.
* [ ] Authentication, authorization, and lead-scope restrictions are verified.
* [ ] Health endpoint and server startup have been checked.

### Frontend

* [ ] `npm ci` completes successfully.
* [ ] `npm test` completes successfully.
* [ ] `npm run build` completes successfully.
* [ ] Route-level lazy loading works when navigating between pages.
* [ ] Direct route navigation and browser refresh work.
* [ ] Desktop and mobile layouts have been manually checked.
* [ ] No blocking console errors remain.

### Repository and Submission

* [ ] All intended source changes are reviewed.
* [ ] No real secrets are committed.
* [ ] README setup and deployment instructions match the current code.
* [ ] `node_modules` and generated build output are excluded from Git.
* [ ] The final ZIP contains the files required by the intended recipient.
* [ ] Final test results and any remaining limitations are documented.

---

## License and Project Use

Add the applicable license information here if the project is distributed under an open-source or other explicit license. Do not imply a license has been granted unless one has actually been selected and included in the repository.
