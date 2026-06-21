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
- If all stories are XS or S → recommend **"build"** mode.
- If any story is M or larger → recommend **"build-meticulous"** mode and
  split larger stories down to S or XS before implementation.
