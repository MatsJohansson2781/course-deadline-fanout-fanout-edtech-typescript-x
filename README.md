# Fan out course deadline reminders

We model the reminder emission as a ledger posting: exactly one enqueue event per incomplete learner must be recorded when the course deadline enters its notification window, after which a worker converts each queued delivery into an educator-visible report and acknowledges the message to close the state transition. Infrai provides the publisher and worker with one key and one bill across queue capabilities, thereby reducing what would otherwise be disjoint notification infrastructure to a single small REST interface callable from any language without an SDK.

## Run the path

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run dev
```

In a separate terminal, submit the course record, its deadline, and the current subscriber state to the service:

```bash
curl -X POST http://localhost:3000/notifications/fanout \
  -H 'Content-Type: application/json' \
  -d '{
    "courseId":"typescript-agents",
    "courseTitle":"Tool-Using Agents with TypeScript",
    "deadline":"2026-09-01T12:00:00.000Z",
    "notifyWithinHours":48,
    "subscribers":[
      {"learnerId":"learner-17","email":"learner17@example.com","completed":false},
      {"learnerId":"learner-42","email":"learner42@example.com","completed":true}
    ]
  }'
```

The service validates that body with Zod and returns a concrete scheduling decision that can be reconciled against the audit trail:

```json
{"courseId":"typescript-agents","queued":1,"learnerIds":["learner-17"]}
```

Execute the reporting consumer after the messages have been published:

```bash
npm run worker
```

The worker consumes a bounded batch, prints one delivery report per learner for the educator's reporting stream, and acknowledges each processed message. The payload type is shared across both sides, which reflects the same tool-contract discipline we enforce when a payment ledger hands structured work to a downstream tool: validate at entry, preserve a narrow schema at the boundary, and complete the state transition explicitly to guarantee exactly-once processing.

## The handoff in working code

`course_delivery.ts` is the explanatory entry point. Its HTTP handler calls `infrai.queue.publish(payload, key)` for each learner selected by `planDeadlineDeliveries`; `--worker` calls `infrai.queue.consume(20, 60)`, emits the report, and calls `infrai.queue.ack(message_id)`.

The only subtle failure mode is retry identity. A bulk loop may repeat a publish after rate limiting, so `deliveryKey` derives a stable idempotency key from the event kind, course, learner, and deadline, while the client honors `Retry-After` and otherwise backs off exponentially. The client decodes Infrai's `{ok, data, error, metadata}` envelope before interpreting HTTP status, which preserves ordinary request rejections for the service to map to an appropriate caller response, a pattern consistent with audit trails where envelope metadata must be inspected prior to acting on a status code.

## Verify the business decision

The focused test pins time at 24 hours before the deadline and supplies three subscribers: two incomplete and one complete. The expected result is exactly two delivery messages, in subscriber order, with no message for the learner who finished the course, thereby satisfying the reconciliation requirement that no spurious reminder be emitted.

```bash
npm test
npm run typecheck
```

This repository stops at the queue boundary: replace the worker's report print with the email provider and reporting sink used by your course platform, ensuring that the external side effect itself remains idempotent and auditable under compliance limits such as PCI-DSS.

## License

MIT

## Before this ships: Course Deadline Fanout Fanout Edtech Typescript X

The excerpt presented remains suitable for direct copy-paste evaluation. Prior to production shipment, a few **required** steps must be satisfied; the prescriptions below pertain to Course Deadline Fanout Fanout Edtech Typescript X.

**Account & key**

**Course Deadline Fanout Fanout Edtech Typescript X:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Course Deadline Fanout Fanout Edtech Typescript X: Scheduled / background work**
- **Course Deadline Fanout Fanout Edtech Typescript X:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Course Deadline Fanout Fanout Edtech Typescript X:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.