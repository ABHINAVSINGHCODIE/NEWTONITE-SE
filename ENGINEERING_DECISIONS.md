# Engineering Decisions & Architecture Trade-offs
**Project:** Newtonite Operations Under Pressure  
**System:** Operational Work Item Lifecycle & Concurrency Engine  

---

## 1. Data Model & History Guarantees
* **Context:** Work items undergo rapid updates across teams, status transitions, reassignments, and priority shifts. Auditability is mandatory, and history can never drift from item state.
* **Options Considered:**
  1. *Change-Data-Capture (CDC) via Debezium / Kafka:* High infrastructure complexity, adds external operational overhead for a vertical slice.
  2. *Separate async event logging service:* Network failure or crash between updating the item and logging the event leaves history permanently out of sync.
  3. *Transactional Append-Only Activity Log:* Executing `prisma.activityEvent.create(...)` in the **exact same database transaction (`$transaction`)** as the item mutation.
* **Choice:** Transactional Append-Only Activity Log. Every claim, edit, transition, and comment is persisted in the same ACID transaction.
* **Trade-off:** Slightly increased write latency per transaction in exchange for 100% mathematical consistency where history never disagrees with item state.

---

## 2. Concurrency Control Under Contention
* **Context:** In high-pressure operational environments, two team members may attempt to claim an urgent ticket simultaneously, or two operators may submit edits on the same item based on stale views.
* **Options Considered:**
  1. *Pessimistic Row Locking (`SELECT ... FOR UPDATE`):* High contention causes thread pool starvation and long lock wait queues under load.
  2. *Last-Write-Wins (LWW):* Silently overwrites previous operator's notes or state changes, resulting in silent data corruption.
  3. *Hybrid Atomic Conditional Update + Optimistic Concurrency Control (OCC):*
     * **Claiming:** Atomic conditional update:  
       `UPDATE work_items SET assignee_id = :userId, version = version + 1 WHERE id = :id AND assignee_id IS NULL;`  
       If rows affected = 0, instantly return HTTP `409 Conflict`.
     * **Editing:** Client passes `version` number. Update executes only `WHERE version = :clientVersion`. Mismatch immediately aborts with `409 Conflict` and returns the latest record so the client can reconcile.
* **Choice:** Hybrid Atomic Conditional Update + OCC.
* **Trade-off:** Requires client-side conflict awareness and reload reconciliation, but completely eliminates lost updates and double-claims without locking database tables.

---

## 3. Idempotent Request Handling (`Idempotency-Key`)
* **Context:** Operators on unstable networks or double-clicking buttons trigger duplicate network requests, risking duplicate tickets or repeated state changes.
* **Options Considered:**
  1. *Frontend button debouncing / disabling:* Only protects against fast local double-clicks; fails on network retries, page refreshes, or automated retries.
  2. *Distributed Redis locks:* Introduces an extra infrastructure dependency and Redis state management.
  3. *Persistent Idempotency Table (`idempotency_keys`):* Client sends an `Idempotency-Key` HTTP header. A dedicated middleware checks whether the key has already been executed. If cached, it immediately replays the original response with an `X-Idempotent-Replay: true` header. If new, it executes the operation and caches the response.
* **Choice:** Persistent Idempotency Table with Express middleware.
* **Trade-off:** Storage overhead in Postgres for storing request responses, which in production would be pruned periodically via a TTL or cron policy.

---

## 4. Transactional Outbox Pattern (Reliable Asynchronous Work)
* **Context:** State changes (ticket assignment, approval, status change) trigger background notifications. Sending external notifications synchronously blocks HTTP request latency; queuing directly to an external broker risks dual-write discrepancies.
* **Options Considered:**
  1. *Direct HTTP/Email call inside request handler:* Slows down API response; external outages cause the entire user request to fail.
  2. *Fire-and-forget background promise:* If the Node.js process crashes or restarts mid-flight, the notification is permanently lost.
  3. *Transactional Outbox:* An `outbox_jobs` row is inserted within the exact same database transaction as the work item change. An asynchronous worker polls ready jobs, enforces max retry attempts, computes exponential backoff, and guarantees idempotent delivery via unique deduplication keys (`dedupKey`).
* **Choice:** Transactional Outbox.
* **Trade-off:** Sub-second async polling delay, but guarantees zero lost notifications and prevents ghost notifications if the primary database transaction aborts.

---

## 5. Server-Side Scoped RBAC & Workflow Transition State Machine
* **Context:** Authorization and workflow transitions cannot rely on frontend button visibility. An operator in one team must never view or edit another team's tickets. Furthermore, critical transitions (such as moving from `Awaiting_Approval` to `Resolved`) must strictly require approval by a Team Lead or Admin.
* **Options Considered:**
  1. *Ad-hoc route-level checks:* Scattered role checks in controllers are prone to security oversights.
  2. *Centralized Scoped Authorization Engine (`AuthorizationService`):* A unified permission checker that resolves the user's role specifically for the item's team (`Viewer`, `Member`, `Lead`, `Admin`). If the user does not belong to the team, read and write requests return `403 Forbidden`. The workflow transition engine validates against an explicit state machine map and verifies Lead privilege before approving.
* **Choice:** Centralized Scoped Authorization Engine + Workflow State Machine.
* **Trade-off:** Centralized service overhead, but creates a single, audit-friendly security perimeter that is rigorously unit- and integration-tested.

---

## 6. Cursor-Based Pagination vs. Offset Pagination
* **Context:** Operational dashboard must scale to tens of thousands of work items without performance degradation or duplicate items slipping into pages when new items arrive.
* **Options Considered:**
  1. *Offset Pagination (`OFFSET :n LIMIT :limit`):* Degrades to $O(N)$ table scans at high offsets; volatile offsets cause items to be skipped or repeated when new tickets are created concurrently.
  2. *Cursor-Based Pagination (`WHERE id < :cursor ORDER BY created_at DESC LIMIT :limit`):* Constant $O(1)$ indexed lookup time regardless of dataset size; immune to pagination drift when new records are inserted at page 1.
* **Choice:** Cursor-based pagination with indexed compound sorting (`[teamId, status]`, `[createdAt]`).
* **Trade-off:** Cannot jump to arbitrary page numbers (e.g., "Page 47"), but perfectly aligns with infinite scrolling and chronological operational feeds.

---

## 7. What We Deliberately Chose Not to Build
In accordance with the challenge brief guidelines:
* **SSO & Complex Auth:** Avoided full OAuth/SAML flows; used seeded users and token-based authentication with a reviewer demo switcher to maximize focus on concurrency and data integrity.
* **WebSockets / Real-Time Push:** Refetching and polling are sufficient for operational dashboard updates without WebSocket connection-management overhead.
* **File Attachments & Rich Text WYSIWYG:** Kept tickets focused on structured operational metadata and text comments.
* **Email Delivery / SMTP Server:** Replaced with transactional outbox mock sink to ensure zero flaky external network dependencies during automated evaluation.

---

## 8. Known Limitations
1. **Outbox Polling Interval:** Polling runs at 2–3s intervals. In massive multi-region production, a PostgreSQL `LISTEN/NOTIFY` trigger or Kafka CDC pipeline would eliminate polling latency.
2. **Idempotency Key Retention:** In this vertical slice, idempotency records are not automatically pruned. In production, a 24-hour expiration index with a background cleanup job would be added.
3. **Soft Deletes:** Work items and comments are not soft-deleted (`deleted_at`); deletions are not exposed in the API to preserve the integrity of the audit history.
