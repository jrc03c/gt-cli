# gt-cli

A TypeScript CLI for the [GuidedTrack](https://guidedtrack.com) web API.

## Install

Requires Node.js >= 20 and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm build
pnpm link --global  # makes `gt` available globally
```

## Authentication

Auth is resolved in this order:

1. **Environment variables**: `GT_EMAIL` and `GT_PASSWORD`
2. **Config file**: `email` and `password` fields in `gt.config.json`
3. **Interactive prompt**: falls back to prompting if neither is set

## Environment

Set `GT_ENV` to target different GuidedTrack environments:

| Value | Host |
|-------|------|
| `development` | `https://localhost:3000` |
| `stage` | `https://guidedtrack-stage.herokuapp.com` |
| `production` (default) | `https://www.guidedtrack.com` |

## Commands

### Project workflow

```bash
gt init                          # Create gt.config.json by scanning for program files
gt config                        # Print current project configuration
gt push                          # Upload local programs and build
gt push --only <key>             # Push a single program
gt push --no-build               # Push without building
gt pull                          # Download all program sources from the server
gt pull --only <key>             # Pull a single program
gt create [names...]             # Create new programs (updates gt.config.json)
gt build                         # Compile programs and report errors
gt build --only <key>            # Build a single program
```

### Program management

```bash
gt program list                  # List all programs
gt program find <query>          # Search programs by name
gt program get <name>            # Fetch program metadata (JSON)
gt program source <name>         # Fetch program source code
gt program build <name>          # Build a specific program
gt program delete <name>         # Delete a program (with confirmation)
gt program delete <name> -y      # Delete without confirmation
```

### Program data

```bash
gt program data <name>           # Download program data as CSV (stdout)
gt program csv <name>            # Alias for `program data`
gt program data <name> -o f.csv  # Save to file
```

### Browser shortcuts

```bash
gt program view <name>           # Open program edit page
gt program preview <name>        # Open program preview
gt program run <name>            # Open program run page
```

### Generic API access

```bash
gt request <path>                             # GET any API endpoint
gt request <path> -X POST -d '{"key":"val"}'  # POST with JSON body
gt request <path> -H "X-Custom:value"         # Add custom headers
```

## Configuration

`gt init` creates a `gt.config.json` in the current directory:

```json
{
  "email": "you@example.com",
  "password": "your-password",
  "programs": {
    "abc1234": {
      "file": "my-program.gt",
      "id": 12345
    }
  }
}
```

This file is gitignored. Programs are keyed by their 7-character program key, and each entry maps to a local `.gt` file and its server-side numeric ID.

The `email` and `password` fields are optional — they provide an alternative to environment variables for authentication (see [Authentication](#authentication) above).

### Separate push and pull files

If you use a build step to transform your `.gt` files before pushing, you can specify separate source and dist paths:

```json
{
  "programs": {
    "abc1234": {
      "file": { "src": "src/program.gt", "dist": "dist/program.gt" },
      "id": 12345
    }
  }
}
```

With this configuration, `gt pull` writes to `src/program.gt` and `gt push` reads from `dist/program.gt`.

## Development

```bash
pnpm dev [command] [args]   # Run via tsx (no build step)
pnpm build                  # Bundle to dist/
pnpm test                   # Run tests
pnpm test:watch             # Watch mode
pnpm lint                   # ESLint
pnpm format                 # Prettier
```
