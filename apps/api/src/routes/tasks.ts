import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "../db/index.js";
import type { CreateTaskInput, UpdateTaskInput } from "@taskflow/shared";

export async function taskRoutes(app: FastifyInstance) {
  // List tasks
  app.get("/api/tasks", async (request, reply) => {
    const { status, priority } = request.query as {
      status?: string;
      priority?: string;
    };

    let query = db.select().from(schema.tasks).$dynamic();

    if (status) {
      query = query.where(
        eq(schema.tasks.status, status as "todo" | "in_progress" | "done")
      );
    }
    if (priority) {
      query = query.where(
        eq(
          schema.tasks.priority,
          priority as "low" | "medium" | "high" | "critical"
        )
      );
    }

    const tasks = await query;
    return tasks;
  });

  // Get task
  app.get("/api/tasks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, id));
    if (!task) {
      return reply.status(404).send({ error: "Task not found" });
    }
    return task;
  });

  // Create task
  app.post("/api/tasks", async (request, reply) => {
    const input = request.body as CreateTaskInput;
    const id = nanoid();
    const now = new Date();

    const [task] = await db
      .insert(schema.tasks)
      .values({
        id,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "todo",
        priority: input.priority ?? "medium",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return reply.status(201).send(task);
  });

  // Update task
  app.patch("/api/tasks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = request.body as UpdateTaskInput;

    const [task] = await db
      .update(schema.tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, id))
      .returning();

    if (!task) {
      return reply.status(404).send({ error: "Task not found" });
    }
    return task;
  });

  // Delete task
  app.delete("/api/tasks/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [task] = await db
      .delete(schema.tasks)
      .where(eq(schema.tasks.id, id))
      .returning();

    if (!task) {
      return reply.status(404).send({ error: "Task not found" });
    }
    return reply.status(204).send();
  });
}
