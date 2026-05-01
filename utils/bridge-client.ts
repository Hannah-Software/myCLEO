/**
 * FastAPI Bridge Client
 * Communicates with CLEO daemon via FastAPI bridge.
 * Personal mode: local Tailscale network (set EXPO_PUBLIC_BRIDGE_URL to the
 *   Tailscale IP, e.g. http://100.64.218.73:8765).
 * Commercial mode: PocketBase (stub for future).
 */

export const BRIDGE_URL =
  process.env.EXPO_PUBLIC_BRIDGE_URL ||
  process.env.EXPO_PUBLIC_BRIDGE_HOST ||
  "http://127.0.0.1:8765";

export const BRIDGE_API_KEY_HEADER = "X-CLEO-API-Key";

// Module-level mutable key. Initialized from EXPO_PUBLIC_BRIDGE_API_KEY for
// dev/Expo Go convenience; replaced at app boot by setBridgeApiKey() once
// utils/bridge-auth bootstrapBridgeAuth() reads the secure-store value.
let _apiKey: string | null =
  process.env.EXPO_PUBLIC_BRIDGE_API_KEY || null;

export function setBridgeApiKey(key: string | null): void {
  _apiKey = key;
}

export function getBridgeApiKey(): string | null {
  return _apiKey;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

class BridgeClient {
  private host: string;

  constructor(host: string = BRIDGE_URL) {
    this.host = host;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = "GET",
      headers = {},
      body,
      timeout = 10000,
    } = options;

    const url = `${this.host}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const mergedHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };
    if (_apiKey) {
      mergedHeaders[BRIDGE_API_KEY_HEADER] = _apiKey;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: mergedHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Bridge error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Orchestrator state
  async getState() {
    return this.request("/state");
  }

  async dispatchSignal(signal: string) {
    return this.request(`/signal/${signal}`, { method: "POST" });
  }

  // Health tracking
  async getHealthLog(days: number = 1) {
    return this.request(`/health?days=${days}`);
  }

  async logHealthEntry(entry: { mood: number; energy: number; notes?: string }) {
    return this.request("/health", {
      method: "POST",
      body: entry,
    });
  }

  // Medications
  async getActiveMedications() {
    return this.request("/medications");
  }

  async logMedicationTaken(medicationId: string) {
    return this.request(`/medications/${medicationId}/taken`, {
      method: "POST",
    });
  }

  // Email actions
  async getEmailActions(account?: string) {
    const query = account ? `?account=${account}` : "";
    return this.request(`/email${query}`);
  }

  // Calendar
  async getCalendarEvents(days: number = 7) {
    return this.request(`/calendar?days=${days}`);
  }

  // Family
  async getFamily() {
    return this.request("/family");
  }

  // Weather
  async getWeather() {
    return this.request("/weather");
  }

  // News
  async getNews() {
    return this.request("/news");
  }

  // Morning Briefing
  async getLatestBriefing() {
    return this.request("/briefing/latest");
  }

  // Alerts
  async getProactiveAlerts() {
    return this.request("/alerts");
  }

  // Documents
  async getDocuments() {
    return this.request("/documents");
  }

  async uploadDocument(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.host}/documents`;
    const uploadHeaders: Record<string, string> = {};
    if (_apiKey) {
      uploadHeaders[BRIDGE_API_KEY_HEADER] = _apiKey;
    }
    const response = await fetch(url, {
      method: "POST",
      headers: uploadHeaders,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  }

  // Configuration
  async getConfig() {
    return this.request("/config");
  }

  async updateConfig(config: unknown) {
    return this.request("/config", {
      method: "PUT",
      body: config,
    });
  }

  // Digests & Reports
  async getDigests() {
    return this.request("/digests");
  }

  async getReports() {
    return this.request("/reports");
  }

  // Health check
  async healthCheck() {
    return this.request("/health-check");
  }

  // Push notifications
  async registerPushToken(
    token: string,
    deviceId: string,
    deviceType: "ios" | "android"
  ) {
    return this.request("/push-token", {
      method: "POST",
      body: { token, device_id: deviceId, device_type: deviceType },
    });
  }

  // Chat — POST /chat (Claude Haiku 4.5, grounded in last 90d email/calendar)
  async chat(
    message: string,
    history?: ChatTurn[]
  ): Promise<ChatResponse> {
    return this.request<ChatResponse>("/chat", {
      method: "POST",
      body: { message, history },
      timeout: 35000,
    });
  }
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContextSummary {
  email_count: number;
  calendar_count: number;
  window_days: number;
}

export interface ChatResponse {
  response: string;
  model: string;
  context: ChatContextSummary;
}

export const bridgeClient = new BridgeClient();
