import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { infrai, InfraiError } from "./infrai_queue.js";
import {
  deliveryKey,
  fanoutRequestSchema,
  planDeadlineDeliveries,
  type DeliveryMessage,
} from "./notification_workflow.js";

function reply(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: NodeJS.ReadableStream): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function runWorker(): Promise<void> {
  const batch = await infrai.queue.consume<DeliveryMessage>(20, 60);
  const reports = [];
  for (const message of batch.messages) {
    const report = {
      courseId: message.payload.courseId,
      learnerId: message.payload.learnerId,
      channel: "email",
      status: "delivered",
      deadline: message.payload.deadline,
    } as const;
    console.log(JSON.stringify(report));
    reports.push(report);
    await infrai.queue.ack(message.message_id);
  }
  console.log(JSON.stringify({ processed: reports.length }));
}

async function startService(): Promise<void> {
  const port = Number(process.env.PORT ?? 3000);
  const server = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/notifications/fanout") {
      reply(response, 404, { error: "Route not found" });
      return;
    }
    try {
      const input = fanoutRequestSchema.parse(await readJson(request));
      const deliveries = planDeadlineDeliveries(input, new Date());
      await Promise.all(
        deliveries.map((delivery) => infrai.queue.publish(delivery, deliveryKey(delivery))),
      );
      reply(response, 202, {
        courseId: input.courseId,
        queued: deliveries.length,
        learnerIds: deliveries.map((delivery) => delivery.learnerId),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        reply(response, 400, { error: "Invalid request body", issues: error.issues });
        return;
      }
      if (error instanceof InfraiError) {
        const status = error.status >= 400 && error.status < 500 ? error.status : 502;
        reply(response, status, { error: error.code, detail: error.detail });
        return;
      }
      reply(response, 500, { error: "Request could not be processed" });
    }
  });
  server.listen(port, () => console.log(`Course notification service listening on ${port}`));
}

if (process.argv.includes("--worker")) {
  await runWorker();
} else {
  await startService();
}
