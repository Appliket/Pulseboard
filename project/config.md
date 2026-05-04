---
type: project-config
title: Project Configuration
updated: 2026-05-04
---

# Project Configuration

## Repositories

- name: local-project
  github:
  path: .
  areas: [docs, infrastructure]

## Areas

- docs
- info
- frontend
- backend
- mobile
- api
- database
- design
- infrastructure
- tests

## Categories

- key: feature
  description: New user-facing or workflow capability.
  examples:
    - Add Google login to onboarding.
- key: bug
  description: Broken or incorrect behavior.
  examples:
    - Fix checkout error when payment fails.
- key: chore
  description: Maintenance, tooling, cleanup, or operational work.
  examples:
    - Add project check script to CI.
- key: docs
  description: Documentation, project knowledge, or specification work.
  examples:
    - Document API authentication flow.

## Priorities

- key: p0
  description: Urgent blocker or severe user impact.
  examples:
    - Users cannot log in.
- key: p1
  description: Important near-term work.
  examples:
    - Add export flow required by next customer delivery.
- key: p2
  description: Useful planned work without immediate delivery pressure.
  examples:
    - Improve empty states on settings pages.
- key: p3
  description: Low urgency cleanup or exploratory work.
  examples:
    - Rename internal helper for clarity.

## GitHub-Derived Suggestions

No tentative GitHub suggestions have been generated.

## Inference Sources

- current-request
- existing-task-history
- configured-repository-code
- configured-repository-docs
- project-info
- raw-sources
- decisions
- risks
- checks
- graph
- github-suggestions-tentative
