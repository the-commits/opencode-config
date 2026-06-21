---
description: Start an agile feature planning session
agent: plan
---

Load the feature-planning skill and begin an interactive feature planning
session. The feature idea is: $ARGUMENTS

If no feature idea was provided, ask the user what feature they want to plan.
Follow the complete workflow from the skill: understand the goal, write user
stories, define acceptance criteria, split stories, estimate, and produce
a definition of done.

After estimation, recommend the appropriate implementation mode:
- XS stories → recommend **"build-lite"** mode (fast, lightweight model).
- S stories → recommend **"build"** mode (full-capability model).
- M or larger → recommend **"build-meticulous"** mode and
  split larger stories down to S or XS before implementation.

For S and M+ stories, recommend following TDD (red-green-refactor):
write failing tests first, then implement, then refactor. XS stories
handled by build-lite do not require TDD.
