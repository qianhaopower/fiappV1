import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/assessment/route";
import { assessmentQuestions } from "@/lib/assessment/questions";

const putItemMock = vi.fn();
const updateItemMock = vi.fn();

vi.mock("@/utils/dynamoClient", () => ({
  createDynamoClient: () => ({
    putItem: putItemMock,
    updateItem: updateItemMock,
  }),
}));

const getCurrentUserMock = vi.fn();
vi.mock("aws-amplify/auth/server", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/utils/amplifyServerUtils", () => ({
  runWithAmplifyServerContext: ({ operation }: { operation: (ctx: unknown) => Promise<unknown> }) =>
    operation({}),
}));

vi.mock("crypto", () => ({
  default: {
    randomUUID: () => "assessment-123",
  },
}));

function makeAnswers() {
  const answers: Record<string, boolean> = {};
  for (const question of assessmentQuestions) {
    answers[question.id] = true;
  }
  return answers;
}

describe("POST /api/assessment", () => {
  beforeEach(() => {
    putItemMock.mockReset();
    updateItemMock.mockReset();
    getCurrentUserMock.mockReset();
  });

  it("handles happy path with assessment + answers + profile update", async () => {
    getCurrentUserMock.mockResolvedValue({ userId: "u1", username: "user" });

    const req = new Request("http://localhost/api/assessment", {
      method: "POST",
      body: JSON.stringify({ answers: makeAnswers() }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("assessmentId", "assessment-123");
    expect(json).toHaveProperty("focusPillar");
    expect(json).toHaveProperty("scoresByPillar");

    expect(putItemMock).toHaveBeenCalledTimes(36);
    expect(updateItemMock).toHaveBeenCalledTimes(1);

    const firstCall = putItemMock.mock.calls[0][0];
    expect(firstCall.SK).toBe("ASSESS#assessment-123");
  });

  it("returns 400 for missing answers", async () => {
    getCurrentUserMock.mockResolvedValue({ userId: "u1", username: "user" });

    const req = new Request("http://localhost/api/assessment", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown question id or non-boolean", async () => {
    getCurrentUserMock.mockResolvedValue({ userId: "u1", username: "user" });

    const answers = makeAnswers();
    answers.UNKNOWN = true;

    const req = new Request("http://localhost/api/assessment", {
      method: "POST",
      body: JSON.stringify({ answers }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const badAnswers = makeAnswers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (badAnswers as any)[assessmentQuestions[0].id] = "yes";

    const req2 = new Request("http://localhost/api/assessment", {
      method: "POST",
      body: JSON.stringify({ answers: badAnswers }),
    });

    const res2 = await POST(req2);
    expect(res2.status).toBe(400);
  });

  it("returns 401 when unauthorized", async () => {
    getCurrentUserMock.mockRejectedValue(new Error("Unauthorized"));

    const req = new Request("http://localhost/api/assessment", {
      method: "POST",
      body: JSON.stringify({ answers: makeAnswers() }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 on dynamo failures (TODO: return 500 later)", async () => {
    // TODO: refine handler to return 500 for internal errors.
    getCurrentUserMock.mockResolvedValue({ userId: "u1", username: "user" });
    putItemMock.mockRejectedValue(new Error("Dynamo failure"));

    const req = new Request("http://localhost/api/assessment", {
      method: "POST",
      body: JSON.stringify({ answers: makeAnswers() }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
