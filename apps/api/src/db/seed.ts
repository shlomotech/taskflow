import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { nanoid } from "nanoid";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log("Seeding database...");

  // Users
  const [alice, bob] = await db
    .insert(schema.users)
    .values([
      {
        id: nanoid(),
        email: "alice@taskflow.dev",
        // placeholder hash — real passwords set via auth registration
        passwordHash: "$2b$10$placeholderHashForAlice000000000000000000000000000000",
        name: "Alice Chen",
      },
      {
        id: nanoid(),
        email: "bob@taskflow.dev",
        passwordHash: "$2b$10$placeholderHashForBobSmith00000000000000000000000000000",
        name: "Bob Smith",
      },
    ])
    .returning();

  // Board
  const [board] = await db
    .insert(schema.boards)
    .values({
      id: nanoid(),
      name: "TaskFlow Development",
      description: "Main development board for the TaskFlow project.",
      ownerId: alice.id,
    })
    .returning();

  // Labels
  const [bugLabel, featureLabel, docsLabel] = await db
    .insert(schema.labels)
    .values([
      { id: nanoid(), name: "bug", color: "#ef4444", boardId: board.id },
      { id: nanoid(), name: "feature", color: "#3b82f6", boardId: board.id },
      { id: nanoid(), name: "docs", color: "#10b981", boardId: board.id },
    ])
    .returning();

  // Issues
  const [issue1, issue2, issue3] = await db
    .insert(schema.issues)
    .values([
      {
        id: nanoid(),
        title: "Set up CI/CD pipeline",
        description:
          "Configure GitHub Actions for automated testing and deployment.",
        status: "todo",
        priority: "high",
        boardId: board.id,
        assigneeId: alice.id,
        labelIds: [featureLabel.id],
      },
      {
        id: nanoid(),
        title: "Fix login redirect bug",
        description:
          "After login, users are not redirected to the dashboard correctly.",
        status: "in_progress",
        priority: "critical",
        boardId: board.id,
        assigneeId: bob.id,
        labelIds: [bugLabel.id],
      },
      {
        id: nanoid(),
        title: "Write API documentation",
        description: "Document all REST endpoints using OpenAPI / Swagger.",
        status: "todo",
        priority: "medium",
        boardId: board.id,
        assigneeId: null,
        labelIds: [docsLabel.id],
      },
    ])
    .returning();

  // Assignments
  await db.insert(schema.assignments).values([
    { id: nanoid(), issueId: issue1.id, userId: alice.id },
    { id: nanoid(), issueId: issue2.id, userId: bob.id },
  ]);

  // Comments
  await db.insert(schema.comments).values([
    {
      id: nanoid(),
      body: "I'll start on this once the DB layer is merged.",
      issueId: issue1.id,
      authorId: alice.id,
    },
    {
      id: nanoid(),
      body: "Reproduced on Firefox and Chrome. Digging into the auth redirect logic now.",
      issueId: issue2.id,
      authorId: bob.id,
    },
    {
      id: nanoid(),
      body: "Looks like a missing returnTo param in the OAuth callback.",
      issueId: issue2.id,
      authorId: alice.id,
    },
  ]);

  // GitHub PR Links
  await db.insert(schema.githubPrLinks).values({
    id: nanoid(),
    issueId: issue2.id,
    prUrl: "https://github.com/shlomotech/taskflow/pull/1",
    prNumber: 1,
    repo: "shlomotech/taskflow",
  });

  console.log("Seed complete.");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
