import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AssessmentPage from "@/app/assessment/page";
import { assessmentQuestions } from "@/lib/assessment/questions";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("Assessment page", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows first question and progress, next disabled until answered", () => {
    render(<AssessmentPage />);

    expect(screen.getByText(/Question\s*1\s*\/\s*35/)).toBeInTheDocument();
    expect(screen.getByText(assessmentQuestions[0].text)).toBeInTheDocument();

    const nextButton = screen.getByRole("button", { name: "Next" });
    expect(nextButton).toBeDisabled();

    // Auto-advances once answered.
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(screen.getByText(/Question\s*2\s*\/\s*35/)).toBeInTheDocument();
    expect(screen.getByText(assessmentQuestions[1].text)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("advances with next and supports back with preserved answer", () => {
    render(<AssessmentPage />);

    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    // Auto-advanced to question 2.
    expect(screen.getByText(/Question\s*2\s*\/\s*35/)).toBeInTheDocument();
    expect(screen.getByText(assessmentQuestions[1].text)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText(/Question\s*1\s*\/\s*35/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
  });

  it("submits answers and redirects to /results", async () => {
    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ assessmentId: "a1" }),
    });

    render(<AssessmentPage />);

    for (let i = 0; i < assessmentQuestions.length; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    }

    const submitButton = screen.getByRole("button", { name: "Submit" });
    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/assessment", expect.any(Object));
      expect(replaceMock).toHaveBeenCalledWith("/results");
    });
  });

  it("shows inline error on submit failure and preserves answers", async () => {
    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    render(<AssessmentPage />);

    for (let i = 0; i < assessmentQuestions.length; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    }

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
    });

    expect(screen.getByText(/Question\s*35\s*\/\s*35/)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /auth on unauthorized", async () => {
    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });

    render(<AssessmentPage />);

    for (let i = 0; i < assessmentQuestions.length; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    }

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/auth");
    });
  });
});
