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
  /**
   * If true and the request fails (network/timeout/5xx), the write is
   * persisted to the offline queue (utils/offline-queue) and replayed
   * when the bridge is reachable again. Only meaningful for non-GET.
   * Caller still gets an error throw so it can show optimistic UI or a
   * "queued offline" toast.
   */
  enqueueOnFailure?: boolean;
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
      enqueueOnFailure = false,
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
        const httpErr = new Error(
          `Bridge error: ${response.status} ${response.statusText}`
        );
        if (enqueueOnFailure && method !== "GET" && response.status >= 500) {
          await this.tryEnqueue(endpoint, method, body);
        }
        throw httpErr;
      }

      return await response.json();
    } catch (err) {
      if (
        enqueueOnFailure &&
        method !== "GET" &&
        !(err instanceof Error && err.message.startsWith("Bridge error: 4"))
      ) {
        await this.tryEnqueue(endpoint, method, body);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async tryEnqueue(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body: unknown
  ): Promise<void> {
    if (method === "GET") return;
    try {
      const { enqueueWrite } = await import("./offline-queue");
      await enqueueWrite(endpoint, method, body);
    } catch (queueErr) {
      console.warn("[bridge-client] enqueue failed:", queueErr);
    }
  }

  // Orchestrator state
  async getState() {
    return this.request("/state");
  }

  async dispatchSignal(signal: string) {
    return this.request(`/signal/${signal}`, {
      method: "POST",
      enqueueOnFailure: true,
    });
  }

  // Health tracking
  async getHealthLog(days: number = 1) {
    return this.request(`/health?days=${days}`);
  }

  async logHealthEntry(entry: { mood: number; energy: number; notes?: string }) {
    return this.request("/health", {
      method: "POST",
      body: entry,
      enqueueOnFailure: true,
    });
  }

  // Medications
  async getActiveMedications() {
    return this.request("/medications");
  }

  async logMedicationTaken(medicationId: string) {
    return this.request(`/medications/${medicationId}/taken`, {
      method: "POST",
      enqueueOnFailure: true,
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

  // Health check (authenticated — also returns daemon status object)
  async healthCheck() {
    return this.request("/health-check");
  }

  /**
   * Tailscale reachability probe. Bypasses the auth-injecting request helper
   * and the offline queue — purely tests whether the bridge host responds at
   * the network layer. Returns a structured result instead of throwing so
   * the Settings UI can surface a friendly message.
   */
  async tailscaleProbe(timeoutMs: number = 5000): Promise<ProbeResult> {
    const url = `${this.host}/health-check`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    try {
      const r = await fetch(url, { method: "GET", signal: controller.signal });
      const latencyMs = Date.now() - start;
      return { ok: r.ok, status: r.status, latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, latencyMs, error: msg };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Daemon probe. Hits an authenticated endpoint (/state) so the Settings UI
   * can distinguish "daemon up + key works" (200) from "daemon up but key
   * wrong" (401) from "daemon down" (timeout / network error).
   */
  async daemonProbe(timeoutMs: number = 5000): Promise<ProbeResult> {
    const url = `${this.host}/state`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    const headers: Record<string, string> = {};
    if (_apiKey) headers[BRIDGE_API_KEY_HEADER] = _apiKey;
    try {
      const r = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      const latencyMs = Date.now() - start;
      return { ok: r.ok, status: r.status, latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, latencyMs, error: msg };
    } finally {
      clearTimeout(timer);
    }
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
      enqueueOnFailure: true,
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

export interface ProbeResult {
  ok: boolean;
  status?: number;
  latencyMs: number;
  error?: string;
}

export const bridgeClient = new BridgeClient();
