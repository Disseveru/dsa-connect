```markdown
# dsa-connect Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `dsa-connect` TypeScript codebase. You'll learn about file naming, import/export styles, commit message conventions, and how to write and organize tests. This guide is ideal for contributors looking to maintain consistency and quality in the project.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userService.ts`, `dataProcessor.ts`

### Import Style
- Use **alias imports** to reference modules.
  - Example:
    ```typescript
    import { fetchData as getData } from './dataFetcher';
    ```

### Export Style
- Use **named exports** for functions, classes, and constants.
  - Example:
    ```typescript
    // In userService.ts
    export function createUser() { ... }
    export const USER_ROLE = 'admin';
    ```

### Commit Messages
- Follow the **Conventional Commits** format.
- Prefixes used: `feat`, `chore`
- Example:
  ```
  feat: add user authentication module
  chore: update dependencies
  ```

## Workflows

_No automated workflows detected in this repository._

## Testing Patterns

- Test files follow the `*.test.*` naming pattern.
  - Example: `userService.test.ts`
- The specific testing framework is not detected, but tests are likely colocated with source files or in a dedicated test directory.
- Example test file structure:
  ```typescript
  // userService.test.ts
  import { createUser } from './userService';

  describe('createUser', () => {
    it('should create a user with default role', () => {
      const user = createUser('Alice');
      expect(user.role).toBe('user');
    });
  });
  ```

## Commands
| Command      | Purpose                                      |
|--------------|----------------------------------------------|
| /test        | Run all test files matching `*.test.*`       |
| /lint        | Lint the codebase for style consistency      |
| /commit      | Create a commit using conventional format    |
```