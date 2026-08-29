import { createHash } from "node:crypto";
import { z } from "zod";

export const fanoutRequestSchema = z.object({
  courseId: z.string().min(1),
  courseTitle: z.string().min(1),
  deadline: z.string().datetime({ offset: true }),
  notifyWithinHours: z.number().int().positive().max(720),
  subscribers: z.array(
    z.object({
      learnerId: z.string().min(1),
      email: z.string().email(),
      completed: z.boolean(),
    }),
  ).min(1),
});

export type FanoutRequest = z.infer<typeof fanoutRequestSchema>;

export type DeliveryMessage = {
  kind: "course.deadline.reminder";
  courseId: string;
  courseTitle: string;
  learnerId: string;
  email: string;
  deadline: string;
};

export function planDeadlineDeliveries(request: FanoutRequest, now: Date): DeliveryMessage[] {
  const deadline = new Date(request.deadline);
  const hoursRemaining = (deadline.getTime() - now.getTime()) / 3_600_000;
  if (hoursRemaining < 0 || hoursRemaining > request.notifyWithinHours) return [];

  return request.subscribers
    .filter((subscriber) => !subscriber.completed)
    .map((subscriber) => ({
      kind: "course.deadline.reminder",
      courseId: request.courseId,
      courseTitle: request.courseTitle,
      learnerId: subscriber.learnerId,
      email: subscriber.email,
      deadline: request.deadline,
    }));
}

export function deliveryKey(message: DeliveryMessage): string {
  return createHash("sha256")
    .update(`${message.kind}:${message.courseId}:${message.learnerId}:${message.deadline}`)
    .digest("hex");
}
