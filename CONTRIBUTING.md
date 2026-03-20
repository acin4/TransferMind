# Contributing Guide

This document explains how we collaborate on this repository and which Git workflow we follow.

## Branch Strategy

We use three kinds of branches:

- `main` for stable, tested, production-ready code
- `dev` for integration of completed development work
- `feature/...` branches for individual tasks

Example:

```text
main
└── dev
    ├── feature/frontend-login
    ├── feature/frontend-dashboard
    ├── feature/backend-auth
    └── feature/backend-users-api
```

## Team Rules

- Do not work directly on `main`
- Prefer not to work directly on `dev`
- Create a new branch for each task
- Always branch from the latest `dev`
- Merge finished work into `dev`
- Merge `dev` into `main` only after testing
- Pull often from `dev` to reduce merge conflicts

## Workflow

### 1. Update `dev`

Before starting a task:

```bash
git checkout dev
git pull origin dev
```

### 2. Create a feature branch

Backend example:

```bash
git checkout -b feature/backend-auth
```

Frontend example:

```bash
git checkout -b feature/frontend-login
```

Each branch should contain one focused task.

### 3. Commit your work

```bash
git add .
git commit -m "Add JWT authentication endpoints"
```

First push:

```bash
git push -u origin feature/backend-auth
```

After that:

```bash
git push
```

### 4. Sync with `dev`

If `dev` changed while you were working:

```bash
git checkout dev
git pull origin dev
git checkout feature/backend-auth
git merge dev
```

### 5. Merge into `dev`

Preferred method: open a Pull Request on GitHub.

- base branch: `dev`
- compare branch: your feature branch

Local merge example:

```bash
git checkout dev
git pull origin dev
git merge feature/backend-auth
git push origin dev
```

### 6. Delete the feature branch

Locally:

```bash
git branch -d feature/backend-auth
```

Remotely:

```bash
git push origin --delete feature/backend-auth
```

### 7. Merge `dev` into `main`

Only when the project is stable and tested:

```bash
git checkout main
git pull origin main
git merge dev
git push origin main
```

## Naming Conventions

### Branch names

```text
feature/backend-auth
feature/backend-products-api
feature/frontend-login-page
feature/frontend-cart-ui
fix/backend-token-validation
fix/frontend-form-bug
chore/project-setup
docs/readme-update
```

### Commit messages

Good examples:

```text
Add login API endpoint
Create user model and validation
Connect frontend login form to API
Fix token expiration check
Update README with setup steps
```

Avoid vague messages such as:

```text
update
changes
fix stuff
work
```

## Backend / Frontend Collaboration

Even though one person mainly works on the backend and the other on the frontend, daily work should still happen in separate feature branches.

Recommended approach:

- backend tasks go into backend feature branches
- frontend tasks go into frontend feature branches
- both are merged into `dev`
- `main` stays clean and stable

## Shared Files

If both people need to edit shared files such as API contracts, routes, environment configuration, shared types, or frontend API service files:

- communicate first
- pull the latest `dev` often
- merge `dev` into your branch frequently

## GitHub Recommendations

- protect `main`
- optionally protect `dev`
- prefer Pull Requests before merge
- do not allow direct pushes to `main`

## Quick Commands

```bash
# start new work
git checkout dev
git pull origin dev
git checkout -b feature/my-task

# save work
git add .
git commit -m "Describe changes"
git push -u origin feature/my-task

# sync branch with latest dev
git checkout dev
git pull origin dev
git checkout feature/my-task
git merge dev

# merge finished work into dev
git checkout dev
git pull origin dev
git merge feature/my-task
git push origin dev

# delete branch after merge
git branch -d feature/my-task
git push origin --delete feature/my-task
```

## Final Recommendation

For this 2-person team, the best workflow is:

- `main` for the final stable version
- `dev` for integrated development work
- separate feature branches for each task
- merge feature branches into `dev`
- merge `dev` into `main` only when ready

This keeps the project organized, reduces conflicts, and makes collaboration easier.
