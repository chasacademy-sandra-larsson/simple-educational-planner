# Educational Planner - Backend Server

Express backend with Drizzle ORM and PostgreSQL for the educational planning application.

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Set Up PostgreSQL Database

Make sure you have PostgreSQL installed and running. Create a database:

```bash
createdb educational_planner
```

### 3. Configure Environment Variables

Copy `env.example` to `.env` and update the values:

```bash
cp env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/educational_planner
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### 4. Generate and Run Migrations

```bash
# Generate migration files from schema
npm run db:generate

# Run migrations
npm run db:migrate
```

### 5. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login

### Projects

All project endpoints require authentication (Bearer token).

- `GET /api/projects` - Get all projects for the logged-in user
- `GET /api/projects/:id` - Get a single project with all data
- `POST /api/projects` - Create a new project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project
- `POST /api/projects/:id/programs` - Add a program to a project
- `POST /api/projects/:id/classes` - Add a class to a project
- `PUT /api/projects/classes/:classId/curriculum` - Update curriculum for a class

## Database Schema

### Tables

- **users** - User accounts
- **projects** - User projects (schools/planning scenarios)
- **project_programs** - Programs in a project (e.g., Teknikprogrammet)
- **project_classes** - Classes in a project (e.g., TE26, EK25)
- **class_curricula** - Course assignments for each class

## Drizzle Commands

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema directly to DB (development only)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Example API Usage

### Register
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"John Doe","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Create Project
```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Norrbackaskolan HT25","description":"Höstterminens schema"}'
```

## Development

The server uses:
- **Express** - Web framework
- **Drizzle ORM** - Type-safe ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **TypeScript** - Type safety
