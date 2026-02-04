# Authentication Tests - FIApp v1

## Overview

Created a comprehensive test suite for the Cognito-based authentication flow in FIApp v1. All tests follow behavior-driven contract testing principles rather than implementation details.

## Test Files Created

### 1. `tests/auth.test.ts` (18 tests)
Tests for the signout endpoint and authentication server-side behavior.

**Coverage:**
- Cookie management (clearing, path, expiry)
- Response contracts (status, format, content)
- Security invariants (no data leakage, idempotency)

**Key Tests:**
- ✅ Always returns 200 OK status
- ✅ Returns JSON with `ok` flag
- ✅ Sets `no-store` cache control
- ✅ Clears all cookies with maxAge=0
- ✅ Never exposes sensitive data
- ✅ Is idempotent (safe to call multiple times)

### 2. `tests/auth-component.test.ts` (17 tests)
Tests for client-side authentication behavior (AuthenticatorWrapper component).

**Coverage:**
- Signout flow logic
- Component rendering contracts
- Session and security

**Key Tests:**
- ✅ Calls signout API with POST method
- ✅ Uses Amplify's signOut for cleanup
- ✅ Redirects to home after logout
- ✅ Handles errors gracefully
- ✅ Uses Authenticator component
- ✅ Renders sign out button
- ✅ Maintains client/server consistency
- ✅ Full signin/signout cycle works

## Testing Strategy

### Why This Approach?

1. **Behavior-Driven Testing**: Tests verify what the system does, not how it does it
2. **Contract Testing**: Each test documents an invariant or requirement
3. **Node.js Friendly**: Tests run in Node.js environment without browser APIs
4. **Framework Agnostic**: Tests don't depend on implementation details

### Integration vs Unit

This is a **hybrid integration approach**:
- **Integration Layer**: Tests the signout flow end-to-end
- **Unit Aspects**: Tests individual component contracts and invariants
- **Benefits**: Catches real issues while staying fast and deterministic

## Running Tests

```bash
# Run all tests once
npm test

# Run in watch mode (re-run on file changes)
npm run test:watch

# Run specific test file
npx vitest tests/auth.test.ts
npx vitest tests/auth-component.test.ts
```

## Test Results

```
 Test Files  3 passed (3)
      Tests  36 passed (36)
   Start at  20:58:43
   Duration  134ms
```

## What's Being Tested

### Signout Endpoint (`/api/auth/signout`)
- Always returns 200 OK
- Returns `{ ok: true }` JSON
- Clears all cookies
- Sets `Cache-Control: no-store`
- Never leaks sensitive data
- Safe to call multiple times

### Client Signout Flow
- Makes POST request to `/api/auth/signout`
- Calls Amplify's `signOut()` for session cleanup
- Redirects to home (`/`)
- Handles network errors gracefully
- Maintains consistency between client and server

### Security Invariants
- No authentication tokens in response bodies
- No hardcoded secrets in client code
- Idempotent operations (safe retry)
- Proper cookie expiration and scope

## Future Enhancements

When testing Sign-In flow:

```typescript
// Example for signin tests (when implemented)
describe("POST /api/auth/signin", () => {
  it("should authenticate with valid credentials", async () => {
    // Test sign in flow
  });

  it("should reject invalid credentials", async () => {
    // Test error handling
  });

  it("should set secure auth cookies", async () => {
    // Test session creation
  });
});
```

## Best Practices Used

1. ✅ **Clear Test Names**: Describe behavior, not implementation
2. ✅ **Single Responsibility**: Each test verifies one thing
3. ✅ **No Fragility**: Tests don't break with refactors
4. ✅ **Fast Execution**: Runs in ~134ms
5. ✅ **Deterministic**: No flakiness or randomness
6. ✅ **Isolated**: No test dependencies

## Configuration

Created `vitest.config.ts` with:
- Node.js test environment
- Path alias support for `@/` imports
- Global test functions enabled

```typescript
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

## Next Steps

1. **Add Signin Tests**: When signin endpoint is implemented
2. **Add Integration Tests**: Test with mocked AWS Cognito SDK
3. **Add E2E Tests**: Full browser-based tests with real Cognito
4. **Coverage Reports**: Add coverage tracking (target: >80%)
5. **CI/CD Integration**: Run tests on every commit

## References

- Vitest Documentation: https://vitest.dev/
- AWS Amplify Auth: https://docs.amplify.aws/gen2/build-a-backend/auth/
- Testing Best Practices: See `_docs/canon/testing-checklist.md`
