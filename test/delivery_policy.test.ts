import assert from "node:assert/strict";
import test from "node:test";
import { planDeadlineDeliveries, type FanoutRequest } from "../src/notification_workflow.js";

test("queues only incomplete learners when the course deadline enters the reminder window", () => {
  const request: FanoutRequest = {
    courseId: "typescript-agents",
    courseTitle: "Tool-Using Agents with TypeScript",
    deadline: "2026-09-01T12:00:00.000Z",
    notifyWithinHours: 48,
    subscribers: [
      { learnerId: "learner-17", email: "learner17@example.com", completed: false },
      { learnerId: "learner-42", email: "learner42@example.com", completed: true },
      { learnerId: "learner-88", email: "learner88@example.com", completed: false },
    ],
  };

  const deliveries = planDeadlineDeliveries(request, new Date("2026-08-31T12:00:00.000Z"));

  assert.deepEqual(deliveries.map((message) => message.learnerId), ["learner-17", "learner-88"]);
  assert.ok(deliveries.every((message) => message.kind === "course.deadline.reminder"));
});
