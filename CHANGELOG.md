# Changelog

## Unreleased

### Changed

- `gt push` now builds by default after pushing; use `--no-build` to skip
- `gt build` now reads programs from `gt.config.json` instead of `.gt_projects`; supports `--only <key>` to build a single program
- `gt create` now auto-registers created programs in `gt.config.json`
- Unit tests rewritten to run against the real GuidedTrack production API (no more mocks)

### Removed

- `gt compare` command (was a wrapper for external `gt-compare` tool)

### Added

- `program data` / `program csv` command to download program data as CSV (with optional `-o` flag to save to file)

### Fixed

- Unhandled async errors now display clean error messages instead of stack traces

### Changed

- ESLint markdown language switched from CommonMark to GFM to support checkbox syntax

### Housekeeping

- Updated CLAUDE.md roadmap to reflect current implementation status
- Updated project structure to include `build.ts` and `files.ts`
- Removed completed plan files from `docs/plans/`
