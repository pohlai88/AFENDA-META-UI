# Internal Types (_private/)

This directory contains types and utilities for **internal use only**.

**Not exported via `package.json` exports field.**

## Contents

- Ambient type shims for untyped dependencies
- Framework-internal helpers

## Guidelines

- **DO NOT** import from `_private/` in external packages
- **DO** import from main package exports
- If you need something from `_private/`, contact the UI team
