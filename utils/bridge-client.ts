/**
 * FastAPI Bridge Client
 * Communicates with CLEO daemon via FastAPI bridge (127.0.0.1:8765)
 * Personal mode: local Tailscale network
 * Commercial mode: PocketBase (stub for future)
 */

const BRIDGE_HOST = process.env.EXPO_PUBLIC_BRIDGE_HOST || "http://127.0.0.1:8765";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

class BridgeClient {
  private host: string;

  constructor(host: string = BRIDGE_HOST) {
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

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
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
    const response = await fetch(url, {
      method: "POST",
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
}

export const bridgeClient = new BridgeClient();
