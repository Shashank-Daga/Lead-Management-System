// Issue 2 regression test: EditFollowUpDialog must rebuild its form state when
// a *different* follow-up is edited, even though the dialog component
// instance stays mounted between opens (the parent always renders it, only
// toggling `open`). Without the reset effect, editing A then B would show A's
// due date / notes / status while claiming to edit B.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditFollowUpDialog } from "../LeadFollowUpsTab";

const mockUpdateFollowUp = vi.fn().mockResolvedValue({ unwrap: () => Promise.resolve({}) });

vi.mock("../../../api/apiSlice", () => ({
  useUpdateFollowUpMutation: () => [
    (...args) => ({ unwrap: () => mockUpdateFollowUp(...args) }),
    { isLoading: false },
  ],
}));

vi.mock("notistack", () => ({
  useSnackbar: () => ({ enqueueSnackbar: vi.fn() }),
}));

const followUpA = {
  id: "fu-a",
  dueAt: "2026-01-10T09:00:00.000Z",
  notes: "Call about pricing",
  status: "PENDING",
};
const followUpB = {
  id: "fu-b",
  dueAt: "2026-03-20T15:30:00.000Z",
  notes: "Send contract",
  status: "COMPLETED",
};

describe("EditFollowUpDialog", () => {
  beforeEach(() => mockUpdateFollowUp.mockClear());

  it("shows follow-up A's own values while editing A", () => {
    render(<EditFollowUpDialog open leadId="lead-1" followUp={followUpA} onClose={() => {}} />);
    expect(screen.getByLabelText(/notes/i)).toHaveValue("Call about pricing");
    expect(screen.getByLabelText(/status/i)).toHaveTextContent(/pending/i);
  });

  it("rebuilds the form for follow-up B after A is closed — does not retain A's state", () => {
    const { rerender } = render(
      <EditFollowUpDialog open leadId="lead-1" followUp={followUpA} onClose={() => {}} />
    );
    expect(screen.getByLabelText(/notes/i)).toHaveValue("Call about pricing");

    // Close (open=false), then open again targeting a different follow-up —
    // exactly the parent's actual render sequence (editTarget changes, the
    // same <EditFollowUpDialog> element stays mounted).
    rerender(<EditFollowUpDialog open={false} leadId="lead-1" followUp={followUpA} onClose={() => {}} />);
    rerender(<EditFollowUpDialog open leadId="lead-1" followUp={followUpB} onClose={() => {}} />);

    expect(screen.getByLabelText(/notes/i)).toHaveValue("Send contract");
    expect(screen.getByLabelText(/notes/i)).not.toHaveValue("Call about pricing");
    expect(screen.getByLabelText(/status/i)).toHaveTextContent(/completed/i);
  });

  it("also resyncs if reopened for the SAME follow-up whose data changed while closed", () => {
    const { rerender } = render(
      <EditFollowUpDialog open leadId="lead-1" followUp={followUpA} onClose={() => {}} />
    );
    rerender(<EditFollowUpDialog open={false} leadId="lead-1" followUp={followUpA} onClose={() => {}} />);

    const updatedA = { ...followUpA, notes: "Updated externally", status: "CANCELLED" };
    rerender(<EditFollowUpDialog open leadId="lead-1" followUp={updatedA} onClose={() => {}} />);

    expect(screen.getByLabelText(/notes/i)).toHaveValue("Updated externally");
  });

  it("submits the currently-displayed follow-up's id and values, not a stale one", () => {
    const { rerender } = render(
      <EditFollowUpDialog open leadId="lead-1" followUp={followUpA} onClose={() => {}} />
    );
    rerender(<EditFollowUpDialog open={false} leadId="lead-1" followUp={followUpA} onClose={() => {}} />);
    rerender(<EditFollowUpDialog open leadId="lead-1" followUp={followUpB} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(mockUpdateFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: "lead-1", followUpId: "fu-b", notes: "Send contract" })
    );
  });
});
