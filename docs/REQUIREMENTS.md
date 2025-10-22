# Shopify Voice-First AI Receptionist - Requirements

This document outlines the technical and business requirements for the Shopify Voice-First AI Receptionist application.

## Functional Requirements

### FR1: Voice Receptionist Management
- Users can create voice receptionist profiles
- Users can configure receptionist prompts and personalities
- Users can set business hours and call routing rules
- Users can manage multiple receptionists
- Receptionists can be activated/deactivated

### FR2: Call Handling
- Incoming calls are routed to the configured voice AI
- Call transcripts are recorded and stored
- Call summaries are generated automatically
- Users can review call logs and transcripts
- Users can search and filter calls by date/status

### FR3: Integration with Vapi AI
- Seamless integration with Vapi API
- Real-time call status updates
- Webhook support for call events
- Support for custom voices
- Support for custom system prompts

### FR4: Shopify Integration
- Embedded app experience within Shopify Admin
- OAuth 2.0 authentication
- Access to Shopify shop data
- Webhook support for shop events

### FR5: Data Persistence
- User data stored securely in Supabase
- Call logs and transcripts stored for audit trail
- Configuration backed up and versioned

### FR6: Error Handling and Monitoring
- Comprehensive error logging
- Sentry integration for exception tracking
- Error notifications to support team
- Graceful error recovery

## Non-Functional Requirements

### NFR1: Performance
- Page load time < 3 seconds
- API response time < 500ms (p95)
- Support 100+ concurrent users
- Handle 1000+ calls per hour

### NFR2: Security
- All data encrypted in transit (HTTPS/TLS)
- Database encryption at rest
- No sensitive data in logs
- Regular security audits
- OWASP compliance
- SQL injection prevention
- XSS prevention
- CSRF protection

### NFR3: Reliability
- 99.5% uptime SLA
- Automatic error recovery
- Database backups (daily)
- Disaster recovery plan

### NFR4: Scalability
- Horizontal scaling support
- Database connection pooling
- Caching strategy implemented
- CDN for static assets

### NFR5: Code Quality
- TypeScript strict mode enabled
- 0 ESLint warnings
- Code coverage > 80% (target)
- Automated code review

### NFR6: Maintainability
- Clear code organization
- Comprehensive documentation
- Consistent naming conventions
- Reusable components

## Technical Requirements

### TR1: Framework & Language
- ✅ Next.js 14 with App Router (NOT Remix)
- ✅ TypeScript with strict mode enabled
- ✅ React 19.1.0 with strict mode

### TR2: UI & UX
- ✅ Shopify Polaris components for all UI
- ✅ Responsive design (mobile-first)
- ✅ Dark mode support (optional)
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ App Bridge integration for embedded experience

### TR3: State Management
- Context API for app state
- Server components where possible
- Client components only when necessary

### TR4: API Integration
- ✅ @shopify/shopify-api for Shopify Admin API
- ✅ @vapi-ai/server-sdk for Vapi AI
- ✅ @supabase/supabase-js for database
- ✅ @sentry/nextjs for error tracking

### TR5: Validation
- ✅ Zod for runtime validation
- ✅ Client-side validation
- ✅ Server-side validation
- ✅ Type-safe form handling

### TR6: Code Quality Tools
- ✅ ESLint with Next.js config
- ✅ Prettier for code formatting
- ✅ TypeScript compiler checks
- ✅ Unused variable detection

### TR7: Environment Management
- ✅ Environment variables with Zod validation
- ✅ .env.example with all required variables
- ✅ Different configs for dev/staging/prod

### TR8: Error Handling
- ✅ Custom error classes (AppError, ValidationError, etc.)
- ✅ Centralized error logging
- ✅ Sentry integration
- ✅ Graceful error fallbacks
- ✅ User-friendly error messages

### TR9: Logging & Monitoring
- ✅ Structured logging
- ✅ Sentry exception tracking
- ✅ Performance monitoring (optional)
- ✅ Request/response logging

### TR10: Database
- ✅ Supabase PostgreSQL
- ✅ Row-level security
- ✅ Automatic backups
- ✅ Connection pooling

## API Requirements

### API Standards
- REST API design
- JSON request/response format
- Consistent error responses
- Pagination support
- Rate limiting headers
- CORS properly configured

### API Response Format

Success Response (200, 201, etc.):
```json
{
  "success": true,
  "data": { /* resource */ },
  "timestamp": "2024-10-20T00:00:00.000Z"
}
```

Error Response (400, 401, 500, etc.):
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "statusCode": 400,
    "details": { /* optional */ }
  },
  "timestamp": "2024-10-20T00:00:00.000Z"
}
```

### Required Endpoints

#### Health Check
- `GET /api/health` - System health status

#### Receptionists
- `GET /api/receptionists` - List all receptionists (paginated)
- `POST /api/receptionists` - Create new receptionist
- `GET /api/receptionists/:id` - Get receptionist details
- `PUT /api/receptionists/:id` - Update receptionist
- `DELETE /api/receptionists/:id` - Delete receptionist
- `POST /api/receptionists/:id/activate` - Activate receptionist
- `POST /api/receptionists/:id/deactivate` - Deactivate receptionist

#### Calls
- `GET /api/calls` - List recent calls (paginated)
- `GET /api/calls/:id` - Get call details
- `GET /api/calls/:id/transcript` - Get call transcript
- `GET /api/calls/receptionist/:receptionistId` - List calls for receptionist

#### Webhooks
- `POST /api/webhooks/shopify` - Shopify webhook endpoint
- `POST /api/webhooks/vapi` - Vapi webhook endpoint

## Database Schema Requirements

### Required Tables
- `shops` - Shop information
- `users` - User accounts
- `receptionists` - Receptionist configurations
- `call_logs` - Call history
- `audit_logs` - Action audit trail

### Schema Standards
- All tables have `id` (UUID, primary key)
- All tables have `created_at` and `updated_at` timestamps
- Foreign keys properly defined
- Indexes on frequently queried fields
- Row-level security enabled

## Security Requirements

### Authentication
- ✅ Shopify OAuth 2.0
- ✅ Session management
- ✅ Token refresh strategy
- ✅ Secure cookie handling

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Resource-level permissions
- ✅ Shop isolation

### Data Protection
- ✅ Encryption in transit (HTTPS)
- ✅ Encryption at rest (database)
- ✅ Sensitive data masking in logs
- ✅ No credentials in code/logs

### Headers
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: SAMEORIGIN`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Content-Security-Policy` (configurable)

## Testing Requirements

### Unit Tests
- Functions and utilities
- Component rendering
- Hook behavior

### Integration Tests
- API endpoint functionality
- Database interactions
- External service integration

### E2E Tests
- User workflows
- Critical paths
- Error scenarios

## Documentation Requirements

### Required Documentation
- ✅ README.md with setup instructions
- ✅ CONTRIBUTING.md with development guidelines
- ✅ REQUIREMENTS.md (this file)
- ✅ API documentation
- ✅ Database schema documentation
- ✅ Deployment guide
- ✅ Troubleshooting guide

### Code Documentation
- ✅ JSDoc comments on public functions
- ✅ Inline comments for complex logic
- ✅ Type definitions documented
- ✅ README in each major directory

## Deployment Requirements

### Development Environment
- Node.js 18+
- npm 9+
- Local database (optional)

### Staging/Production Environment
- Node.js 18+ (LTS)
- npm 9+ or yarn/pnpm
- PostgreSQL database
- Redis for caching (optional)
- CDN for static assets
- HTTPS/TLS certificates
- Monitoring and logging infrastructure

## Shopify App Review Checklist

- ✅ App name and description
- ✅ App icon (192x192 PNG)
- ✅ Privacy policy URL
- ✅ Terms of service (optional)
- ✅ Support email/link
- ✅ Error handling and logging
- ✅ No broken links
- ✅ Proper scopes (minimal required)
- ✅ No console errors
- ✅ Performance acceptable
- ✅ Security best practices
- ✅ GDPR compliance

## Version and Changelog

- **Version**: 1.0.0 (Initial Release)
- **Last Updated**: October 20, 2025
- **Status**: In Development
