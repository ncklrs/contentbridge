# Contributing to ContentBridge

Thank you for your interest in contributing to ContentBridge! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/contentbridge.git
   cd contentbridge
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Build all packages:
   ```bash
   pnpm build
   ```
5. Run tests:
   ```bash
   pnpm test
   ```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/changes

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run tests and build:
   ```bash
   pnpm build
   pnpm test
   pnpm typecheck
   ```

4. Commit your changes:
   ```bash
   git commit -m "feat: add your feature description"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `refactor:` - Code refactoring
   - `test:` - Tests
   - `chore:` - Maintenance

5. Push to your fork and create a Pull Request

## Project Structure

```
contentbridge/
├── packages/
│   ├── core/           # Core types and interfaces
│   ├── sanity/         # Sanity adapter
│   ├── contentful/     # Contentful adapter
│   ├── payload/        # Payload adapter
│   ├── strapi/         # Strapi adapter
│   └── cli/            # CLI tools
├── examples/           # Example projects
└── docs/               # Documentation
```

## Adding a New Adapter

1. Create a new package in `packages/`:
   ```bash
   mkdir packages/your-cms
   ```

2. Use an existing adapter as a template (e.g., `packages/sanity`)

3. Implement the required interfaces:
   - Extend `BaseAdapter` from `@contentbridge/core`
   - Implement all abstract methods
   - Create a query compiler for your CMS
   - Create a rich text converter (if applicable)

4. Add comprehensive tests

5. Add documentation in `docs/adapters/your-cms.md`

## Testing

- Run all tests: `pnpm test`
- Run tests for a specific package: `pnpm --filter @contentbridge/core test`
- Run tests in watch mode: `pnpm test:watch`

## Code Style

- We use TypeScript with strict type checking
- Format code with Prettier (automatically via git hooks)
- Lint with ESLint
- Write JSDoc comments for public APIs

## Questions?

Feel free to open an issue for questions or join our discussions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
