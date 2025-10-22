# Contributing Guidelines

Thank you for your interest in contributing to the Shopify Voice-First AI Receptionist! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and professional
- Provide constructive feedback
- Focus on ideas, not individuals
- Welcome diverse perspectives

## Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-company/shopify-voice-receptionist.git
cd shopify-voice-receptionist

# Install dependencies
npm install --legacy-peer-deps

# Create feature branch
git checkout -b feature/your-feature

# Set up environment
cp .env.example .env.local
# Fill in your configuration
```

## Code Quality Standards

### TypeScript

- **Strict Mode**: All files must pass TypeScript strict mode (`noImplicitAny`, `strictNullChecks`, etc.)
- **Type Annotations**: Explicit type annotations on function parameters and return types
- **No `any`**: Avoid using `any` type; use proper types or generics
- **Interfaces**: Use interfaces for object shapes, types for unions/tuples

Example:
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // implementation
}
```

### ESLint Rules

All code must pass ESLint with zero warnings:

```bash
npm run lint
```

Key rules enforced:
- `no-console` (warn for debug, allow error/warn)
- `prefer-const` (const > let > var)
- `no-var` (use const/let)
- `eqeqeq` (=== instead of ==)
- `no-implicit-coercion` (explicit type conversions)
- React best practices (no prop-types, react-in-jsx-scope off)

### Code Formatting

Format code with Prettier:

```bash
npm run format
```

Configuration:
- Line length: 100 characters
- Quotes: Single quotes
- Tabs: 2 spaces
- Trailing commas: ES5
- Semicolons: Always

## File Organization

### Components

```typescript
// src/components/MyComponent.tsx
import React from 'react';
import styles from './MyComponent.module.css';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div className={styles.container}>
      <h1>{title}</h1>
      <button onClick={onAction}>Action</button>
    </div>
  );
};

export default MyComponent;
```

### API Routes

```typescript
// src/app/api/resource/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api';
import { handleError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    // Implementation
    return createSuccessResponse(data);
  } catch (error) {
    const appError = handleError(error);
    return createErrorResponse(appError);
  }
}
```

### Utility Functions

```typescript
// src/lib/utils/helpers.ts
/**
 * Formats a phone number to E.164 format
 * @param phoneNumber - Raw phone number
 * @returns Formatted phone number
 * @throws ValidationError if format is invalid
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Implementation
  return formattedNumber;
}
```

## Error Handling

### Use Custom Error Classes

```typescript
import { ValidationError, NotFoundError } from '@/lib/utils/errors';

// Bad
throw new Error('User not found');

// Good
throw new NotFoundError('User not found');
```

### Error Context

```typescript
import { logError } from '@/lib/utils/errors';

try {
  await someAsyncOperation();
} catch (error) {
  logError(error, {
    userId: user.id,
    receptionistId: receptionist.id,
    action: 'create_call',
  });
}
```

## Input Validation

Use Zod schemas for all input validation:

```typescript
import { z } from 'zod';
import { ValidationError } from '@/lib/utils/errors';

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'staff', 'viewer']),
});

export async function createUser(data: unknown) {
  const validatedData = createUserSchema.safeParse(data);

  if (!validatedData.success) {
    throw new ValidationError('Invalid user data', validatedData.error.flatten());
  }

  // Use validatedData.data with full type safety
}
```

## Testing Guidelines

### Test File Location
- Place test files next to source files
- Use `.test.ts` or `.test.tsx` extension

### Test Structure
```typescript
describe('MyComponent', () => {
  it('should render with title', () => {
    // Arrange
    const props = { title: 'Test' };

    // Act
    const component = render(<MyComponent {...props} />);

    // Assert
    expect(component).toHaveTextContent('Test');
  });
});
```

## Git Workflow

### Branch Naming

```
feature/feature-name        # New features
fix/bug-description         # Bug fixes
chore/maintenance-task      # Maintenance
docs/documentation-update   # Documentation
refactor/refactoring-task   # Refactoring
```

### Commit Messages

Follow conventional commits:

```
type(scope): subject

body

footer
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

Examples:
```
feat(receptionist): add voice configuration UI
fix(api): handle null responses from Vapi API
docs(setup): add environment variable guide
refactor(lib): improve error handling utility
```

### Pull Request Process

1. **Branch Management**
   - Create feature branch from `main`
   - Keep branch up-to-date with main
   - Rebase before merging

2. **Code Quality Checks**
   ```bash
   npm run lint
   npm run format:check
   npm run type-check
   ```

3. **Pull Request Requirements**
   - Descriptive title and description
   - Reference related issues
   - Include screenshots for UI changes
   - All CI checks passing

4. **Review Process**
   - Request review from team members
   - Respond to feedback constructively
   - Mark conversations as resolved after addressing
   - Squash commits before merge

## Performance Considerations

### React Best Practices

```typescript
// Memoize expensive components
export const ExpensiveComponent = React.memo(({ data }: Props) => {
  return <div>{data}</div>;
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return complexCalculation(data);
}, [data]);

// Use useCallback for stable function references
const handleClick = useCallback(() => {
  onAction();
}, [onAction]);
```

### API Routes

```typescript
// Implement caching headers
export async function GET(request: NextRequest) {
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', 'public, max-age=300');
  return response;
}
```

## Security Best Practices

### API Routes

```typescript
// Always validate environment variables
import { env } from '@/lib/env';

// Always validate input
import { createReceptionistRequestSchema } from '@/lib/validations';

// Use HTTPS only headers
export const config = {
  matcher: ['/((?!_next|public).*)'],
};
```

### Client-Side

- Never store sensitive data in localStorage
- Always use httpOnly cookies for auth tokens
- Validate data from external APIs before using
- Sanitize user input before displaying

## Documentation

### Code Comments

```typescript
// Use JSDoc for public functions
/**
 * Creates a new receptionist for the shop
 * @param shopId - The Shopify shop ID
 * @param config - Receptionist configuration
 * @returns Created receptionist object
 * @throws ValidationError if config is invalid
 * @throws AuthorizationError if user lacks permissions
 */
export async function createReceptionist(
  shopId: string,
  config: CreateReceptionistRequest
): Promise<ReceptionistProfile> {
  // implementation
}
```

### README Updates

Update README.md when:
- Adding new features
- Changing project structure
- Adding new dependencies
- Updating API endpoints

## Release Process

### Version Bumping

Follow semantic versioning:
- `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)
- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes

### Release Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Run full test suite
- [ ] Create release branch
- [ ] Tag release in git
- [ ] Deploy to staging
- [ ] Verify in production

## Questions?

- Check existing documentation
- Review similar code patterns
- Ask in team communication channels
- Create an issue for clarification

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project acknowledgments
