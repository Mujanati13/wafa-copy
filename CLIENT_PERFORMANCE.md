# Client area performance

The menu, dashboard, module library and exam runner now share account-scoped reads, load routes and dialogs on demand, and avoid timer-driven question rendering and full progress serialization.

## Behavior and compatibility

- `SemesterProvider` owns the visible-tab 15-second access refresh. Profile changes update navigation without another fetch loop.
- Catalog reads share a five-minute cache, including a scoped persisted snapshot. Statistics use 30 seconds; module lists use 60 seconds. Authentication clears caches; account/access changes use separate keys. Verification invalidates progress reads without discarding unchanged catalog metadata.
- The dashboard loads modules independently of analytics and reads rank from statistics. Module tabs fetch only their selected list; statistics failures leave content available.
- Exam content and saved-answer requests start independently. Clock rendering stays inside the timer badges. Navigation groups and question indexes are built once per question set.
- Answer writes are serialized within a session and rejected after authentication changes. Failed autosaves offer an explicit retry without continuously resending unchanged failed batches; late save acknowledgements reconcile subsequent edits, including cleared answers. Finishing flushes drafts before removing recovery data; failed saves retain the draft. Full snapshots follow actual progress changes; elapsed-only checkpoints run every ten seconds. Study-time updates retain their existing 30-second interval.
- `GET /users/my-stats?summary=true` omits `data.answeredQuestions`; default responses are unchanged. `GET /exam-courses/module/:id?summary=true` omits internal linked-question/source arrays after computing counts.
- Catalog counts aggregate in MongoDB using the existing module-source precedence and logical-question identity. Successful content mutations/imports invalidate catalog caches. Invalidation versions prevent older in-flight reads from restoring stale client or server snapshots. No user-data migration is required.

## Local verification

Run from `wafa-frentend`:

```powershell
npm.cmd run test:client-performance
npm.cmd run build -- --configLoader runner --manifest
node scripts/check-client-bundle.mjs dist
```

The runner configuration loader avoids the sandbox's config-bundling directory restriction. The Vite configuration uses ESM-safe path resolution. The normal Vite build remains supported in deployment environments.

The bundle check totals the dashboard entry, layout and their static JavaScript dependencies, excluding unrelated dynamic routes. Passing the old main-bundle path as a second argument also enforces at least a 50% gzip reduction. The existing checked-out build measured 761,724 gzip bytes; the optimized dashboard dependency set measured approximately 324 KB, a 57.4% reduction. This is a build-payload comparison, not a browser latency measurement. The large Excel export chunk remains lazy and still produces Vite's size warning.

Run from `wafa-backend`:

```powershell
node --test tests/learner-summary.test.js tests/progress-statistics.test.js tests/progress-statistics-api.test.js tests/question-progress.test.js tests/answer-progress.test.js tests/course-question-counts.test.js tests/module-payload.test.js tests/profile-statistics.test.js tests/free-year-exam-access.test.js
npm.cmd run test:performance
```

The client suite includes delayed/failing analytics, free-module hydration, account/access isolation (including late free-access responses), stale requests, legacy course-category fallback, fresh progress denominators, return navigation, a 1,000-question timer check, blocked storage, and successful/failed submission saves. The recheck updated the outdated admin analytics concurrency test to the current four-read overview API contract; it now verifies parallel reads and the current response fields. Existing lint findings in the exam page/context remain; the changed production files introduce no new findings.

Recheck result: 103 client regression tests and 81 selected backend tests pass, including the refreshed admin concurrency check. The production build passes; no new lint findings were introduced and the diff whitespace check is clean. Existing exam/context lint findings remain. Live browser and database checks below remain environment-dependent.

## Rollout and remaining environment checks

Deploy backend compatibility changes before the frontend. Run `npm run db:indexes` in the intended deployment environment to create the already-declared question, annual-exam, QCM and user-statistics indexes alongside existing performance indexes. The script creates indexes without dropping existing ones; it was not run against a live database here.

On staging, inspect MongoDB query plans and compare existing slow-request logs for catalog, statistics and answer restoration. Check desktop and narrow mobile layouts with slow networking and CPU throttling, including subscription changes, API failures and leaving/reopening an exam. Confirm p95 menu/answer interactions below 200 ms. Live query plans, browser interaction timings and production rollout require that environment and are not claimed by the local checks. Rollback uses the previous application artifacts; the additive API options and index creation need no data rollback.
