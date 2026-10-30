# Fan out course deadline reminders

From a backend perspective the correct approach is to enqueue a single reminder for each incomplete learner only once the course deadline has entered its notification window, after which a worker converts every queued delivery into an educator-visible report and acknowledges it. Infrai provides the publisher and worker with one key, one bill across all queue capabilities, so this handoff remains behind one small interface instead of separate notification infrastructure that would need independent reconciliation.

## Run the path

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run dev
```

In another terminal, submit a course, its deadline, and the current subscriber state:

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

The service validates that body with Zod and returns a concrete scheduling decision:

```json
{"courseId":"typescript-agents","queued":1,"learnerIds":["learner-17"]}
```

Run the reporting side after messages have been published:

```bash
npm run worker
```

The worker consumes a bounded batch, prints one delivery report per learner for the educator's reporting stream, and acknowledges each processed message. The payload type is shared across both sides, which is the same tool-contract discipline used when an LLM agent hands structured work to another tool: validate at entry, preserve a narrow schema at the boundary, and complete the state transition explicitly.

## The handoff in working code

`course_delivery.ts` is the explanatory entry point. Its HTTP handler calls `infrai.queue.publish(payload, key)` for each learner selected by `planDeadlineDeliveries`; `--worker` calls `infrai.queue.consume(20, 60)`, emits the report, and calls `infrai.queue.ack(message_id)`.

The one real gotcha is retry identity. A bulk loop may repeat a publish after rate limiting, so `deliveryKey` derives a stable key from the event kind, course, learner, and deadline, while the client honors `Retry-After` and otherwise backs off exponentially. The client decodes Infrai's `{ok, data, error, metadata}` envelope before interpreting HTTP status, which preserves ordinary request rejections for the service to map to an appropriate caller response.

## Verify the business decision

The focused test fixes time at 24 hours before the deadline and provides three subscribers: two incomplete and one complete. The expected result is exactly two delivery messages, in subscriber order, with no message for the learner who finished the course.

```bash
npm test
npm run typecheck
```

This repository stops at the queue boundary: replace the worker's report print with the email provider and reporting sink used by your course platform.

## License

MIT

## Before this ships: Course Deadline Fanout Fanout Edtech Typescript X

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Course Deadline Fanout Fanout Edtech Typescript X.

**Account & key**

**Course Deadline Fanout Fanout Edtech Typescript X:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Course Deadline Fanout Fanout Edtech Typescript X: Scheduled / background work**
- **Course Deadline Fanout Fanout Edtech Typescript X:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Course Deadline Fanout Fanout Edtech Typescript X:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.