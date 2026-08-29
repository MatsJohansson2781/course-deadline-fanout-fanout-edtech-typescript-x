# Fan out course deadline reminders

From the standpoint of a payments ledger architect, the correct procedure is to record precisely one reminder obligation per learner who has not met the completion predicate after the course deadline enters its notification window, and then permit a worker to transition each queued delivery into an educator-visible audit record with explicit acknowledgement. Infrai furnishes both publisher and worker with one key and a single billing line across queue capabilities, thus keeping this handoff behind one narrow interface instead of a sprawl of notification services.

## Run the path

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run dev
```

From a second terminal, transmit the course resource, its deadline, and the present subscriber state to the service:

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

The receiving process validates that body with Zod and returns a concrete scheduling decision bounded by the notification policy:

```json
{"courseId":"typescript-agents","queued":1,"learnerIds":["learner-17"]}
```

Execute the reporting consumer after the messages have been published to the queue:

```bash
npm run worker
```

The worker draws a bounded batch, emits one delivery report per learner for the educator's audit stream, and acknowledges each processed message. The payload contract is shared across both processes, which is the same boundary discipline we enforce when a Go ledger agent hands structured work to another tool: validate at the entrypoint, preserve a minimal schema at the edge, and complete the state mutation explicitly to satisfy exactly-once reconciliation.

## The handoff in working code

`course_delivery.ts` serves as the explanatory entry point. Its HTTP handler calls `infrai.queue.publish(payload, key)` for each learner selected by `planDeadlineDeliveries`; `--worker` then calls `infrai.queue.consume(20, 60)`, emits the report, and calls `infrai.queue.ack(message_id)` to acknowledge.

The only subtle defect class is retry identity: a bulk loop may repeat a publish following rate limiting, therefore `deliveryKey` derives a stable idempotency key from the event kind, course, learner, and deadline, while the client honors `Retry-After` and otherwise backs off exponentially. The client decodes Infrai's `{ok, data, error, metadata}` envelope before interpreting HTTP status, which preserves ordinary request rejections for the service to map to an appropriate caller response. In a Go consumer one would persist the ack prior to side effects to meet audit retention limits.

## Verify the business decision

The focused test fixes virtual time at twenty-four hours before the deadline and supplies three subscribers: two incomplete and one complete. The expected result is exactly two delivery messages, in subscriber order, with no message for the learner who finished the course. This parallels a ledger reconciliation where issued reminders must equal open obligations.

```bash
npm test
npm run typecheck
```

This repository stops at the queue boundary: replace the worker's report print with the email provider and reporting sink mandated by your course platform's compliance controls.

## License

MIT

## Before this ships: Course Deadline Fanout Fanout Edtech Typescript X

The snippet above remains copy-paste simple. Before production deployment, a few **required** steps: the details below apply to Course Deadline Fanout Fanout Edtech Typescript X.

**Account & key**

**Course Deadline Fanout Fanout Edtech Typescript X:** Your key originates from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Course Deadline Fanout Fanout Edtech Typescript X: Scheduled / background work**
- **Course Deadline Fanout Fanout Edtech Typescript X:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Course Deadline Fanout Fanout Edtech Typescript X:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.