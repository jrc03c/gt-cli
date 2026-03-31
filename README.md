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
| `development` (default) | `https://localhost:3000` |
| `stage` | `https://guidedtrack-stage.herokuapp.com` |
| `production` | `https://www.guidedtrack.com` |

## Commands

### Project workflow

```bash
gt init                          # Create gt.config.json by scanning for program files
gt config                        # Print current project configuration
gt push                          # Upload all local program files to the server
gt push --only <name>            # Push a single program
gt push --build                  # Push and build
gt pull                          # Download all program sources from the server
gt pull --only <name>            # Pull a single program
gt create [names...]             # Create new programs on the server
gt build                         # Compile programs and report errors
gt compare [args...]             # Compare programs using gt-compare
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
gt request <path>                        # GET any API endpoint
gt request <path> -X POST -d '{"key":"val"}'  # POST with JSON body
gt request <path> -H "X-Custom:value"    # Add custom headers
```

## Configuration

`gt init` creates a `gt.config.json` in the current directory:

```json
{
  "programs": {
    "my-program": {
      "id": 12345,
      "key": "abc1234"
    }
  }
}
```

This file is gitignored. It maps local program file names to their server-side IDs and keys.

## Development

```bash
pnpm dev [command] [args]   # Run via tsx (no build step)
pnpm build                  # Bundle to dist/
pnpm test                   # Run tests
pnpm test:watch             # Watch mode
pnpm lint                   # ESLint
pnpm format                 # Prettier
```
