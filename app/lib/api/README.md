# API Client Documentation

## Usage

The API client provides a simple interface to communicate with the backend.

### Authentication

```typescript
import { api } from '@/app/lib/api';

// Register a new user
const { token, user } = await api.auth.register({
  email: 'user@example.com',
  name: 'John Doe',
  password: 'password123'
});

// Login
const { token, user } = await api.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

// Logout
api.auth.logout();

// Check if authenticated
const isAuth = api.auth.isAuthenticated();

// Get current user
const user = api.auth.getCurrentUser();
```

### Projects

```typescript
import { api } from '@/app/lib/api';

// Get all projects
const projects = await api.projects.getAll();

// Get project by ID (with all details)
const project = await api.projects.getById('project-id');

// Create a new project
const newProject = await api.projects.create({
  name: 'Norrbackaskolan HT25',
  description: 'Höstterminens schema'
});

// Update a project
const updated = await api.projects.update('project-id', {
  name: 'Updated Name'
});

// Delete a project
await api.projects.delete('project-id');

// Add a program to a project
const program = await api.projects.addProgram('project-id', {
  programCode: 'TE',
  programName: 'Teknikprogrammet',
  orientationCode: 'TEKTEK',
  orientationName: 'Teknik'
});

// Add a class to a project
const classObj = await api.projects.addClass('project-id', {
  classCode: 'TE26',
  programId: 'program-id',
  startYear: 2026
});

// Update curriculum for a class
const curriculum = await api.projects.updateCurriculum('class-id', {
  courses: [
    {
      courseCode: 'MATMAT01a',
      courseName: 'Matematik 1a',
      points: 100,
      category: 'FOUNDATIONAL_SUBJECTS',
      year: 1
    }
  ]
});
```

### Error Handling

```typescript
import { api, ApiError } from '@/app/lib/api';

try {
  const projects = await api.projects.getAll();
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error (${error.status}):`, error.message);
    
    if (error.status === 401) {
      // Unauthorized - redirect to login
    }
  }
}
```

### Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## TypeScript Types

All API methods are fully typed. Import types as needed:

```typescript
import type { 
  Project, 
  ProjectWithDetails,
  CourseAssignment,
  User 
} from '@/app/lib/api';
```
