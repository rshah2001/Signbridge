import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, timeout: 60000 });

export async function getPhrases() {
  const { data } = await api.get("/phrases");
  return data;
}

export async function createConversation(payload = {}) {
  const { data } = await api.post("/conversations", payload);
  return data;
}

export async function listConversations() {
  const { data } = await api.get("/conversations");
  return data;
}

export async function getConversation(id) {
  const { data } = await api.get(`/conversations/${id}`);
  return data;
}

export async function addMessage(convoId, payload) {
  const { data } = await api.post(`/conversations/${convoId}/messages`, payload);
  return data;
}

export async function voiceToSign(text) {
  const { data } = await api.post("/translate/voice-to-sign", { text });
  return data;
}

export async function signToVoice(sign_tokens, confidence) {
  const { data } = await api.post("/translate/sign-to-voice", { sign_tokens, confidence });
  return data;
}

export async function speakTTS(text) {
  const res = await api.post("/tts/speak", { text }, { responseType: "blob" });
  return res.data;
}

export async function logSignDetection(payload) {
  const { data } = await api.post("/signs/detect", payload);
  return data;
}

export async function getAnalytics() {
  const { data } = await api.get("/analytics/snowflake");
  return data;
}
