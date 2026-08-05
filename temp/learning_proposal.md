# Learning Proposal: Nixpacks & Python Dependency Guardrails

Based on the recent resolution of deployment build and runtime errors on Railway, I propose adding a deployment guardrail to the project rules in [.agents/AGENTS.md](file:///Users/bernardo/projects/sherpa/.agents/AGENTS.md) under the **Railway Guardrails** section.

## Proposed Rule Changes

We will append the following guidelines to `## 2. Branching & Deployment Safety` -> `### Railway Guardrails (CRITICAL)` in [.agents/AGENTS.md](file:///Users/bernardo/projects/sherpa/.agents/AGENTS.md):

```diff
   - ALWAYS use **Nixpacks** for Railway deployments.
   - Sherpa uses three distinct Railway services (sherpa, worker, web). NEVER attempt to unify these.
   - Docker Usage: Dockerfile and docker-compose.yml are strictly for **Local Development**.
+  - **Nixpacks Python & Postgres Custom Installs**:
+    * If overriding `[phases.install]` in `nixpacks.toml` to support lockfiles, you MUST manually initialize and activate the virtual environment: `python -m venv --copies /opt/venv && . /opt/venv/bin/activate` before any pip commands.
+    * If using libraries that depend on PostgreSQL client bindings (like `psycopg` used by LangGraph), you MUST install `libpq-dev` using `aptPkgs` in `nixpacks.toml` (setup phase) so libraries are available system-wide in dynamic linker search paths at runtime.
+    * ALWAYS ensure that `psycopg-binary` is explicitly captured in `requirements.lock` (not just `requirements.txt`) before deploying to staging/production, otherwise `pip install` on Linux will skip the package.
```

## Rationale
1. **Nixpacks Virtual Environment Overrides**: Nixpacks expects python applications to use the virtual environment at `/opt/venv`. If we define a custom install phase command without creating and activating `/opt/venv`, the system-level python lacks `pip` or ignores compiled site-packages, resulting in `pip: command not found` (exit code 127).
2. **Dynamic Linker Paths (libpq-dev)**: Python database adapters such as `psycopg` require PostgreSQL client libraries. Using Nixpacks system package installer (`aptPkgs`) installs `libpq-dev` in standard Debian/Ubuntu directories, which are automatically visible to the system's dynamic linker at runtime without requiring complex environment path overrides.
3. **Lockfile Synchronization**: Freezing dependencies on local development machines (e.g., macOS) can sometimes drop binary packages like `psycopg-binary` if they are not active in the local python setup. Ensuring they are locked in `requirements.lock` guarantees the target Linux container installs the binary wheel.
