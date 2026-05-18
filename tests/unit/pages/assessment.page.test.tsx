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
    fireEvent.click(screen.getByRole("button", { name: /Start assessment/ }));

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
    fireEvent.click(screen.getByRole("button", { name: /Start assessment/ }));

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
    fireEvent.click(screen.getByRole("button", { name: /Start assessment/ }));

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
    fireEvent.click(screen.getByRole("button", { name: /Start assessment/ }));

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

  // #415 — Restart action must require explicit confirmation so users can't
  // accidentally wipe in-progress answers near the end of a 35-question flow.
  describe("Restart confirmation (#415)", () => {
    it("opens a confirmation dialog and does NOT reset answers immediately", () => {
      render(<AssessmentPage />);
      fireEvent.click(screen.getByRole("button", { name: /Start assessment/ }));

      // Answer 2 questions so Restart is enabled (it's disabled at 0 answers).
      fireEvent.click(screen.getByRole("button", { name: "Yes" }));
      fireEvent.click(screen.getByRole("button", { name: "Yes" }));

      // We're now on question 3.
      expect(screen.getByText(/Question\s*3\s*\/\s*35/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Restart" }));

      // Dialog is visible. Answers untouched — still on question 3.
      expect(
        screen.getByRole("heading", { name: /Start the assessment again\?/ })
      ).toBeInTheDocument();
      expect(screen.getByText(/clears your 2 answers/)).toBeInTheDocument();
      expect(screen.getByText(/Question\s*3\s*\/\s*35/)).toBeInTheDocument();
    });

    it("Cancel closes the dialog and preserves answers + current question", () => {
      render(<AssessmentPage />);
      fireEvent.click(screen.getByRole("button", { name: /Start assessment/ }));

      fireEvent.click(screen.getByRole("button", { name: "Yes" }));
      fireEvent.click(screen.getByRole("button", { name: "Yes" }));
      fireEvent.click(screen.getByRole("button", { name: "Restart" }));

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      // Dialog dismissed; user still on question 3 with both answers intact.
      expect(
        screen.queryByRole("heading", { name: /Start the assessment again\?/ })
      ).not.toBeInTheDocument();
      expect(screen.getByText(/Question\s*3\s*\/\s*35/)).toBeInTheDocument();

      // Walking back confirms answers weren't dropped.
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
    });

    it("Start again wipes answers and returns to question 1", () => {
      render(<AssessmentPage />);
      fireEvent.click(screen.getByRole("button", { name: /Start assessment/ }));

      fireEvent.click(screen.getByRole("button", { name: "Yes" }));
      fireEvent.click(screen.getByRole("button", { name: "Yes" }));
      fireEvent.click(screen.getByRole("button", { name: "Restart" }));

      fireEvent.click(screen.getByRole("button", { name: "Start again" }));

      // Back at question 1 with no preserved answer (Next disabled).
      expect(screen.getByText(/Question\s*1\s*\/\s*35/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
      expect(
        screen.queryByRole("heading", { name: /Start the assessment again\?/ })
      ).not.toBeInTheDocument();
    });

    it("Restart button is disabled when no answers have been given yet", () => {
      render(<AssessmentPage />);
      fireEvent.click(screen.getByRole("button", { name: /Start assessment/ }));

      expect(screen.getByRole("button", { name: "Restart" })).toBeDisabled();
    });
  });

  it("redirects to /auth on unauthorized", async () => {
    (global.fetch as unknown as Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });

    render(<AssessmentPage />);
    fireEvent.click(screen.getByRole("button", { name: /Start assessment/ }));

    for (let i = 0; i < assessmentQuestions.length; i += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    }

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/auth");
    });
  });
});
