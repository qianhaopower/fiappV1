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

    expect(screen.getByText("1 / 35")).toBeInTheDocument();
    expect(screen.getByText(assessmentQuestions[0].text)).toBeInTheDocument();

    const nextButton = screen.getByRole("button", { name: "Next" });
    expect(nextButton).toBeDisabled();
  });

  it("advances with next and supports back with preserved answer", () => {
    render(<AssessmentPage />);

    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    const nextButton = screen.getByRole("button", { name: "Next" });
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);
    expect(screen.getByText("2 / 35")).toBeInTheDocument();
    expect(screen.getByText(assessmentQuestions[1].text)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("1 / 35")).toBeInTheDocument();
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
      if (i < assessmentQuestions.length - 1) {
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
      }
    }

    const submitButton = screen.getByRole("button", { name: "Submit" });
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
      if (i < assessmentQuestions.length - 1) {
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
      }
    }

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument();
    });

    expect(screen.getByText("35 / 35")).toBeInTheDocument();
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
      if (i < assessmentQuestions.length - 1) {
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
      }
    }

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/auth");
    });
  });
});
