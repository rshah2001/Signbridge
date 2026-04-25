import { render, screen, waitFor } from "@testing-library/react";
import { AppHealthProvider } from "../context/AppHealthContext";
import { SystemStatusBar } from "./SystemStatusBar";
import * as api from "../lib/api";

jest.mock("../lib/api");

describe("SystemStatusBar", () => {
  it("renders backend service states from the health endpoint", async () => {
    api.getHealth.mockResolvedValue({
      mode: "local",
      services: {
        database: { ok: true, mode: "local", detail: "Using local laptop storage." },
        llm: { ok: true, detail: "Gemini API configured." },
        tts: { ok: false, detail: "Browser fallback only." },
      },
    });

    render(
      <AppHealthProvider>
        <SystemStatusBar />
      </AppHealthProvider>,
    );

    expect(screen.getByText(/checking backend services/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/mode/i)).toBeInTheDocument());
    expect(screen.getAllByText(/local/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/local store/i)).toBeInTheDocument();
    expect(screen.getByText(/gemini/i)).toBeInTheDocument();
    expect(screen.getByText(/voice/i)).toBeInTheDocument();
  });
});
