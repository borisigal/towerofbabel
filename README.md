# TowerOfBabel

A cultural interpretation tool for cross-cultural communication, helping users understand how messages may be perceived differently across cultures.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 9.0.0 or higher (comes with Node.js)

You can verify your installations by running:

```bash
node --version
npm --version
```

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd TowerOfBabel
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   This will install all required packages including Next.js, React, TypeScript, Tailwind CSS, and testing frameworks.

## Environment Setup

1. **Create your local environment file**

   ```bash
   cp .env.local.example .env.local
   ```

2. **Configure environment variables**

   Open `.env.local` and fill in the required values. Most variables are placeholders for future stories and can be left empty for now:
   - Database credentials (Story 1.3)
   - Supabase authentication (Story 1.4)
   - LLM provider API keys (Epic 2)
   - Lemon Squeezy payment keys (Epic 3)

## Running the Development Server

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Verify Installation

- **Homepage**: Visit http://localhost:3000 to see the welcome page
- **Health Check**: Visit http://localhost:3000/api/health to verify the API is working

Expected health check response:

```json
{
  "status": "ok",
  "timestamp": "2025-10-12T...",
  "database": "pending"
}
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

Test files are located in the `/tests` directory and follow the pattern `*.test.ts` or `*.spec.ts`.

## Code Quality

### Linting

Run ESLint to check for code quality issues:

```bash
npm run lint
```

### Formatting

Format all files with Prettier:

```bash
npm run format
```

Check formatting without making changes:

```bash
npm run format:check
```

## Project Structure

```
towerofbabel/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles with Tailwind
├── components/            # React components (organized in future stories)
│   ├── ui/               # UI primitives (shadcn/ui)
│   ├── features/         # Feature-specific components
│   └── layout/           # Layout components
├── lib/                   # Utility functions and business logic
│   ├── auth/             # Authentication utilities (Story 1.4)
│   ├── llm/              # LLM provider integration (Epic 2)
│   ├── services/         # Business logic services
│   └── types/            # Shared TypeScript types
├── prisma/                # Database schema and migrations (Story 1.3)
├── public/                # Static assets
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── .env.local.example     # Environment variable template
├── .eslintrc.json         # ESLint configuration
├── .prettierrc            # Prettier configuration
├── next.config.js         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Vitest test configuration
└── package.json           # Dependencies and scripts
```

## Technology Stack

- **Framework**: Next.js 14.1+ with App Router
- **Language**: TypeScript 5.3+ (strict mode)
- **Styling**: Tailwind CSS 3.4+
- **Testing**: Vitest 1.2+ with React Testing Library
- **Code Quality**: ESLint 8+ and Prettier 3+

## Available Scripts

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start development server         |
| `npm run build`        | Build for production             |
| `npm start`            | Start production server          |
| `npm run lint`         | Run ESLint                       |
| `npm run format`       | Format code with Prettier        |
| `npm run format:check` | Check formatting without changes |
| `npm test`             | Run all tests                    |
| `npm run test:watch`   | Run tests in watch mode          |

## Development Guidelines

### TypeScript

- Strict mode enabled (catches bugs at compile-time)
- Explicit return types required on functions
- No `any` types allowed (use `unknown` or proper types)

### Code Style

- Prettier handles formatting automatically
- ESLint enforces code quality rules
- Use descriptive variable names
- Comment complex logic explaining **why**, not **what**

### Testing

- Write tests for all business logic
- Mirror source file structure in `/tests` directory
- Use descriptive test names with `describe` and `it` blocks

### Components

- Server Components by default (no 'use client' directive)
- Only use Client Components when needed for:
  - Event handlers (onClick, onChange, etc.)
  - State management (useState, useReducer)
  - Browser APIs (localStorage, window, etc.)

## Critical Security Note

This project includes a custom ESLint rule to prevent a critical security issue:

**NEVER** use `user.app_metadata` for authorization checks (tier, usage limits, etc.). Always query the database for real-time user data. See `/lib/auth/README.md` (Story 1.4) for details.

## Next Steps

This is the foundation (Story 1.1). Upcoming stories will add:

- **Story 1.2**: Vercel deployment
- **Story 1.3**: PostgreSQL database with Prisma
- **Story 1.4**: Supabase authentication
- **Story 1.5**: LLM integration and cost protection
- **Epic 2**: Cultural interpretation features
- **Epic 3**: Payment processing with Lemon Squeezy

## License

[License information to be added]

## Contributing

[Contributing guidelines to be added]
