# Graph to SQL migrator

Interactive demo that migrates a **Neo4j-style property graph** to a **relational SQLite database**, entirely in the browser (SQLite compiled to WebAssembly with [sql.js](https://github.com/sql-js/sql.js)). It follows the same steps as a real database migration:

1. **Source graph**: nodes (labels + properties) and relationships (type + properties), editable as JSON.
2. **Schema inference**: tables, column types, nullability and foreign keys are derived from the data.
3. **SQL generation**: `CREATE TABLE` + `INSERT` script, shown and copyable.
4. **Migration**: the script runs in an in-memory SQLite database.
5. **Verification**: row counts, preserved property values and foreign key integrity are compared against the source graph.
6. **Querying**: explore the tables and run read-only SQL next to the equivalent Cypher.

Live demo: https://krin2.github.io/graph-to-sql-migrator/ (after the first deployment)

## Mapping rules

| Graph                                           | Relational                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Nodes with label `Person`                       | table `person` with `id INTEGER PRIMARY KEY`                                               |
| Additional labels (`Person:Director`)           | `extra_labels` column (only when some node has more than one label)                        |
| Relationship type `ACTED_IN`                    | table `acted_in` with `id`, `from_id`, `to_id`                                             |
| Property                                        | one column; type inferred from the values (`INTEGER`, `REAL`, `BOOLEAN`, otherwise `TEXT`) |
| Property missing or `null` on some nodes        | nullable column                                                                            |
| Relationship whose ends all belong to one table | `REFERENCES` foreign key                                                                   |
| Relationship connecting several tables          | no foreign key + a warning                                                                 |

Limitations (deliberate, to keep the demo focused): a node is stored in the table of its **first** label, property values must be scalars (no arrays or nested objects) and node ids are integers.

## Project structure

```
src/
  domain/      graph types and validation of untrusted JSON (parseGraph)
  migration/   schema inference, SQL generation, migration, verification, read-only queries
  layout/      deterministic force-directed layout (d3-force)
  components/  React UI, one component per step
  hooks/       useMigrationDemo: state of the demo (graph text, SQLite, migration result)
  data/        sample movie graph and sample Cypher/SQL query pairs
```

The migration logic (`src/migration`) has no React dependency and is covered by unit tests that run against a real SQLite database.

## Safety notes

- Identifiers are normalized to `snake_case` and always double-quoted; values are escaped as SQL literals, so hostile labels or property values cannot break out of the script (covered by a test).
- After the migration the database is set to `PRAGMA query_only = ON`, so even a `WITH ... DELETE` statement fails inside SQLite. The query box additionally accepts a single `SELECT`/`WITH` statement.
- Everything runs locally; the graph never leaves the browser.

## Scripts

```bash
npm install
npm run dev        # development server
npm test           # unit and component tests (Vitest + Testing Library)
npm run lint       # ESLint
npm run format     # Prettier
npm run build      # type-check and production build into dist/
```

## Deployment

`.github/workflows/deploy.yml` runs lint, format check, tests and build on every push, and publishes `dist/` to GitHub Pages from `master`. In the repository settings, set **Pages > Source** to **GitHub Actions**. The Vite `base` (`/graph-to-sql-migrator/`) must match the repository name.

## Tech

React 19 · TypeScript (strict) · Tailwind CSS 4 · Vite · Vitest · sql.js (SQLite/WASM) · d3-force
