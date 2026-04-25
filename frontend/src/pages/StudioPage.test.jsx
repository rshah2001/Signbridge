import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudioPage from "./StudioPage";
import * as api from "../lib/api";

jest.mock("sonner", () => ({
  Toaster: () => null,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../context/AppHealthContext", () => ({
  useAppHealth: () => ({
    health: {
      services: {
        database: { mode: "mongo" },
        llm: { ok: false },
        tts: { ok: false },
      },
    },
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock("../hooks/useSpeechRecognition", () => ({
  useSpeechRecognition: () => ({
    supported: false,
    listening: false,
    interim: "",
    transcript: "",
    start: jest.fn(),
    stop: jest.fn(),
  }),
}));

jest.mock("../hooks/useMediaPipeHands", () => ({
  useMediaPipeHands: () => ({
    videoRef: { current: null },
    canvasRef: { current: null },
    ready: true,
    running: false,
    detection: null,
    error: null,
    start: jest.fn(),
    stop: jest.fn(),
  }),
}));

jest.mock("../lib/api");

describe("StudioPage", () => {
  beforeEach(() => {
    api.getPhrases.mockResolvedValue([
      { key: "help", label: "Help", icon: "LifeBuoy", emergency: true, description: "Urgent help" },
      { key: "doctor", label: "Doctor", icon: "Stethoscope", emergency: true, description: "Need a doctor" },
      { key: "water", label: "Water", icon: "Droplets", emergency: false, description: "Need water" },
    ]);
    api.createConversation.mockResolvedValue({ id: "session-1234" });
    api.getConversation.mockResolvedValue({ messages: [] });
    api.logSignDetection.mockResolvedValue({ status: "logged" });
    api.signToVoice.mockResolvedValue({ sentence: "I need help now.", confidence: 0.9 });
    api.voiceToSign.mockResolvedValue({ simplified: "Hello thank you", sign_tokens: ["hello", "thank_you"] });
    api.speakTTS.mockRejectedValue(new Error("tts unavailable"));
    api.addMessage.mockResolvedValue({});
    window.speechSynthesis = { speak: jest.fn(), cancel: jest.fn() };
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
    };
  });

  it("surfaces emergency shortcuts and fallback voice copy", async () => {
    render(<StudioPage />);

    await waitFor(() => expect(screen.getByText(/emergency workflow/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.queryAllByText("Help").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.queryAllByText("Doctor").length).toBeGreaterThan(0));
    expect(screen.getByText(/browser voice/i)).toBeInTheDocument();
    expect(screen.getByText(/camera detection speaks recognized signs out loud/i)).toBeInTheDocument();
    expect(screen.getByText(/sign videos play in the center panel only/i)).toBeInTheDocument();
  });

  it("shows the emergency queue banner after adding an urgent sign", async () => {
    const user = userEvent.setup();
    render(<StudioPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Help" }));

    expect(screen.getByTestId("emergency-queue-banner")).toBeInTheDocument();
    expect(screen.getByText(/emergency signs in queue/i)).toBeInTheDocument();
  });

  it("plays asset-backed sign output for hearing-user text input", async () => {
    const user = userEvent.setup();
    render(<StudioPage />);

    await waitFor(() => expect(screen.getByTestId("hearing-text-input")).toBeInTheDocument());
    await user.type(screen.getByTestId("hearing-text-input"), "Hello thank you");
    await user.click(screen.getByTestId("hearing-send-button"));

    await waitFor(() => expect(api.voiceToSign).toHaveBeenCalledWith("Hello thank you"));
    await waitFor(() => expect(screen.getByTestId("sign-output-hello")).toBeInTheDocument());
  });
});
