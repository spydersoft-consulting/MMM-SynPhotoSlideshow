# GitHub Workflows

## pr-checks.yml

Automated checks that run on every pull request to the `main` branch.

### What it does:

1. **Linting** - Runs `npm run lint` to check code style and formatting
2. **Unit Tests** - Runs `npm test` to execute all Jest unit tests
3. **Coverage** - Generates test coverage report (Node.js 20.x only)
4. **Multi-version Testing** - Tests against Node.js 18.x, 20.x, and 22.x

### Requirements:

- All tests must pass
- Linting must pass
- Runs on Ubuntu latest

### Optional:

- **Codecov Integration** - If `CODECOV_TOKEN` secret is configured, uploads coverage reports to Codecov
  - To enable: Add `CODECOV_TOKEN` to repository secrets
  - Coverage upload failures won't fail the CI (fail_ci_if_error: false)

### Matrix Testing:

The workflow tests against multiple Node.js versions to ensure compatibility:

- Node.js 18.x (LTS)
- Node.js 20.x (LTS)
- Node.js 22.x (Current)

Coverage reports are only generated for Node.js 20.x to avoid duplication.
