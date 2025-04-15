# Cursed Web

Frontend web application for the Cursed Stack Kettleman project, built with React, Vite, and Mantine UI.

## Features

- Built with React and TypeScript
- Vite for fast development and building
- Mantine UI for beautiful, accessible components
- Docker support for development and production
- Integration with Cursed Server API

## Development

### Prerequisites

- [Proto](https://moonrepo.dev/proto) with Bun and Moon installed
- Node.js 18+ (for some development tools)
- Docker (for containerized builds)

### Getting Started

1. Install dependencies:
   ```bash
   moon run :install
   ```

2. Start the development server:
   ```bash
   moon run cursed-web:dev
   ```

The application will be available at http://localhost:4150

### Available Commands

- `moon run cursed-web:dev` - Start the development server
- `moon run cursed-web:build` - Build the production bundle
- `moon run cursed-web:docker-build` - Build the Docker image
- `moon run cursed-web:lint` - Run ESLint
- `moon run cursed-web:test` - Run tests

### Environment Variables

Create a `.env` file in the cursed-web directory with the following variables:

```env
VITE_API_URL=http://localhost:4151
```

### Project Structure

```
cursed-web/
├── src/
│   ├── components/    # React components
│   ├── pages/        # Page components
│   ├── hooks/        # Custom React hooks
│   ├── utils/        # Utility functions
│   ├── types/        # TypeScript type definitions
│   ├── styles/       # Global styles
│   └── App.tsx       # Root component
├── public/           # Static assets
├── tests/            # Test files
└── moon.yml         # Moon configuration
```

## Building for Production

1. Build the production bundle:
   ```bash
   moon run cursed-web:build
   ```

2. Build the Docker image:
   ```bash
   moon run cursed-web:docker-build
   ```

## Development Guidelines

### Code Style

- Follow the ESLint configuration
- Use TypeScript for type safety
- Follow React best practices and hooks guidelines
- Use Mantine UI components when possible

### Component Structure

```typescript
// Example component structure
import { FC } from 'react';
import { Box } from '@mantine/core';

interface MyComponentProps {
  // Props interface
}

export const MyComponent: FC<MyComponentProps> = ({ /* props */ }) => {
  return (
    <Box>
      {/* Component content */}
    </Box>
  );
};
```

### State Management

- Use React Context for global state
- Use React Query for API state management
- Keep component state minimal and focused

## Testing

Run the test suite:

```bash
moon run cursed-web:test
```

## Troubleshooting

### Common Issues

1. **Development Server Issues**
   - Clear the Vite cache
   - Check if port 4150 is available
   - Verify all dependencies are installed

2. **Build Issues**
   - Ensure all environment variables are set
   - Check for TypeScript errors
   - Verify import paths

3. **API Connection Issues**
   - Verify the API server is running
   - Check CORS configuration
   - Validate API URL in environment variables

## Contributing

Please refer to the main project's README for contribution guidelines.

## License

This project is licensed under the terms found in the LICENSE file at the root of the repository.
