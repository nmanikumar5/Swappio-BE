# Contributing to Swappio Backend

Thank you for considering contributing to Swappio Backend! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing issues to avoid duplicates
2. Collect relevant information (OS, Node version, error messages)
3. Provide steps to reproduce

Bug reports should include:
- Clear, descriptive title
- Detailed description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots (if applicable)

### Suggesting Features

Feature requests should include:
- Clear, descriptive title
- Detailed description of the feature
- Use cases and benefits
- Possible implementation approach
- Examples from other projects (if applicable)

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

1. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/Swappio-BE.git
cd Swappio-BE
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development server:
```bash
npm run dev
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types/interfaces
- Avoid using `any` type
- Use strict mode

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Maximum line length: 100 characters
- Use meaningful variable/function names

### File Naming

- Use PascalCase for models: `User.ts`, `Listing.ts`
- Use camelCase for other files: `authController.ts`, `tokenService.ts`
- Use kebab-case for routes: `auth-routes.ts` (if needed)

### Comments

- Write JSDoc comments for public APIs
- Comment complex logic
- Keep comments up-to-date
- Avoid obvious comments

Example:
```typescript
/**
 * Generate JWT token for user
 * @param userId - User's database ID
 * @returns JWT token string
 */
static generateToken(userId: string): string {
  // implementation
}
```

### Project Structure

```
src/
├── models/          # Mongoose schemas
├── routes/          # Express routes
├── controllers/     # Route handlers
├── middleware/      # Custom middleware
├── services/        # Business logic
├── utils/           # Helper functions
├── config/          # Configuration
└── app.ts          # Main entry
```

### Error Handling

- Always use async/await with try-catch or asyncHandler
- Use custom error classes from `utils/errors.ts`
- Provide meaningful error messages
- Log errors appropriately

Example:
```typescript
export const someController = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  sendSuccess(res, 200, { user });
});
```

### Database Queries

- Use Mongoose methods
- Add appropriate indexes
- Handle errors properly
- Use projections to limit returned fields
- Implement pagination for list endpoints

Example:
```typescript
const users = await User.find(query)
  .select('-password')
  .sort('-createdAt')
  .skip(skip)
  .limit(limit);
```

### API Responses

Use consistent response format:

Success:
```typescript
sendSuccess(res, 200, { data }, 'Optional message');
```

Error:
```typescript
throw new ValidationError('Error message');
```

### Validation

- Use Zod for request validation
- Create schemas in controller files
- Validate before processing

Example:
```typescript
export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
  }),
});
```

## Testing

Currently, the project doesn't have tests. Contributions to add tests are welcome!

Proposed testing stack:
- Jest for unit tests
- Supertest for API tests
- MongoDB Memory Server for test database

## Git Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add password reset functionality
fix(listings): resolve pagination bug
docs(readme): update installation instructions
```

## Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Refactoring

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No console.log statements (use proper logging)
- [ ] TypeScript compiles without errors
- [ ] Tested locally

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
Describe testing performed

## Screenshots (if applicable)
Add screenshots

## Related Issues
Fixes #123
```

## Review Process

1. Submit pull request
2. Automated checks run
3. Code review by maintainers
4. Address feedback
5. Approval and merge

## Questions?

- Create an issue for questions
- Check existing documentation
- Review closed issues/PRs

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to Swappio Backend! 🎉
