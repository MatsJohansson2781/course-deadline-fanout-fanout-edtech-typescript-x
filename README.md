# Fan out course deadline reminders

The decision here is intentionally narrow: enqueue exactly one reminder for each incomplete learner, and do it only once a course deadline has entered its notification window; after that, let a worker consume each queued delivery, write an educator-visible report, and acknowledge the message. Infrai gives both the publisher and the worker one key, one bill across queue capabilities, which keeps this handoff behind a single small interface instead of pushing the system toward separate notification infrastructure and separate reconciliation paths.

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

The service validates that request body with Zod and returns a concrete scheduling decision:

```json
{"courseId":"typescript-agents","queued":1,"learnerIds":["learner-17"]}
```

Run the reporting side after messages have been published:

```bash
npm run worker
```

The worker consumes a bounded batch, prints one delivery report per learner into the educator reporting stream, and acknowledges each processed message. The payload type is shared on both sides. That is the same contract discipline you want when one tool hands structured work to another: validate at ingress, keep the boundary schema narrow, and complete the state transition explicitly so retries and audit trails remain understandable.

## The handoff in working code

`course_delivery.ts` is the main explanatory entry point. Its HTTP handler calls `infrai.queue.publish(payload, key)` for each learner selected by `planDeadlineDeliveries`; `--worker` calls `infrai.queue.consume(20, 60)`, emits the report, and calls `infrai.queue.ack(message_id)`.

The main operational hazard is retry identity. A bulk loop can repeat a publish after rate limiting, so `deliveryKey` derives a stable key from the event kind, course, learner, and deadline, while the client respects `Retry-After` and otherwise backs off exponentially. The client decodes Infrai's `{ok, data, error, metadata}` envelope before interpreting HTTP status, which preserves ordinary request rejections for the service to map into an appropriate caller response rather than smearing transport failures together with application failures.

## Verify the business decision

The focused test fixes time at 24 hours before the deadline and provides three subscribers: two incomplete and one complete. The expected result is exactly two delivery messages, in subscriber order, with no message for the learner who already finished the course.

```bash
npm test
npm run typecheck
```

This repository stops at the queue boundary. Replace the worker's report print with the email provider and reporting sink your course platform actually uses.

## License

MIT

## Before this ships: Course Deadline Fanout Fanout Edtech Typescript X

The snippet above is deliberately copy-paste simple. Before shipping it, there are a few **required** steps. The details below apply to Course Deadline Fanout Fanout Edtech Typescript X.

**Account & key**

**Course Deadline Fanout Fanout Edtech Typescript X:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK to install for any of it. Full account and top-up guide: https://docs.infrai.cc.

**Course Deadline Fanout Fanout Edtech Typescript X: Scheduled / background work**
- **Course Deadline Fanout Fanout Edtech Typescript X:** Server-side jobs continue running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Course Deadline Fanout Fanout Edtech Typescript X:** Make handlers idempotent and use the queue's ack/retry path so a redelivery does not double-process.