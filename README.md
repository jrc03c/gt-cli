# Intro

This tool makes it easy to communicate with the GuidedTrack API from the command line and/or Node.

# Installation

```bash
npm install -g https://github.com/jrc03c/gt-cli
```

Or:

```bash
git clone https://github.com/jrc03c/gt-cli
cd gt-cli
npm link
```

# Usage

## Node

```js
const gt = require("gt-cli")

gt.program.find("My program").then(program => {
  // ...
})
```

See the full Node API below.

## Command line

```bash
gt program find "My program" >> program.gt
```

See the full command line API below.

# API

## Node

[coming soon...]

## Command line

[coming soon...]
