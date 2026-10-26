import { supabase } from "@/integrations/supabase/client";
import {
  buildOfflineUrl,
  enqueueOfflineRequest,
} from "@/lib/offlineSync";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as
  | string
  | undefined;

const getApiBaseUrl = (): string => {
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (import.meta.env.DEV) {
    return "http://localhost:3001";
  }

  return "https://artist-clarity-bacon-volunteers.trycloudflare.com";
};

export const apiBaseUrl = getApiBaseUrl();

export class ApiError extends Error {
  status: number;
  queued?: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Gemini predictions must receive a live backend response.
// Never queue these requests for offline synchronization.
const isLivePredictionRequest = (path: string): boolean => {
  return path === "/api/ai/predict-market-price";
};

// Convert an uploaded file to a data URL for demo-mode storage.
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("Could not read uploaded file."));

    reader.readAsDataURL(file);
  });

// Local mock handler for document operations only.
const handleMockApi = async (
  path: string,
  init: RequestInit = {}
): Promise<any> => {
  const method = (init.method || "GET").toUpperCase();

  const getDocs = () => {
    try {
      const stored = localStorage.getItem("mock_documents");

      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to parse mock documents", error);
    }

    const defaults = [
      {
        id: "doc-1",
        type: "LAND_RECORDS",
        originalName: "Khasra_Khatauni_Field_A.pdf",
        size: 1420500,
        isVerified: true,
        verifiedAt: "2025-06-10T10:00:00Z",
        createdAt: "2025-06-09T08:30:00Z",
      },
      {
        id: "doc-2",
        type: "ID_PROOF",
        originalName: "Aadhaar_Card_Verified.jpg",
        size: 524288,
        isVerified: true,
        verifiedAt: "2025-05-15T14:20:00Z",
        createdAt: "2025-05-15T12:00:00Z",
      },
      {
        id: "doc-3",
        type: "OTHER",
        originalName: "Soil_Health_Report.pdf",
        size: 2048576,
        isVerified: false,
        createdAt: "2026-06-17T09:15:00Z",
      },
    ];

    localStorage.setItem("mock_documents", JSON.stringify(defaults));

    return defaults;
  };

  const saveDocs = (docs: any[]) => {
    localStorage.setItem("mock_documents", JSON.stringify(docs));
  };

  if (path === "/api/documents/my-documents" && method === "GET") {
    return { documents: getDocs() };
  }

  if (path === "/api/documents/upload" && method === "POST") {
    const formData = init.body as FormData;
    const file = formData?.get("document") as File | null;
    const type = formData?.get("type") as string | null;

    if (!file) {
      throw new ApiError("Please select a file to upload.", 400);
    }

    const id = `doc-${Date.now()}`;
    const dataUrl = await fileToDataUrl(file);

    try {
      localStorage.setItem(`mock_document_file_${id}`, dataUrl);
    } catch {
      throw new ApiError(
        "Not enough browser storage to save this file. Try a smaller file.",
        0
      );
    }

    const newDoc = {
      id,
      type: type || "OTHER",
      originalName: file.name,
      size: file.size,
      isVerified: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [newDoc, ...getDocs()];

    saveDocs(updated);

    return { document: newDoc };
  }

  if (path.startsWith("/api/documents/download/") && method === "GET") {
    const id = decodeURIComponent(path.split("/").pop() || "");
    const dataUrl = localStorage.getItem(`mock_document_file_${id}`);

    if (!dataUrl) {
      throw new ApiError(
        "This sample document has no downloadable file. Upload a real file first.",
        404
      );
    }

    return dataUrl;
  }

  if (path.startsWith("/api/documents/") && method === "DELETE") {
    const id = decodeURIComponent(path.split("/").pop() || "");

    if (id) {
      const updated = getDocs().filter(
        (doc: any) => doc.id !== id
      );

      saveDocs(updated);
      localStorage.removeItem(`mock_document_file_${id}`);
    }

    return { success: true };
  }

  return null;
};

export const apiFetch = async <T>(
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  const isDocumentPath = path.startsWith("/api/documents");
  const isPredictionRequest = isLivePredictionRequest(path);
  const method = (init.method || "GET").toUpperCase();
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  // Keep the existing local mock handling for document operations.
  if (isDocumentPath) {
    return (await handleMockApi(path, init)) as T;
  }

  // Only non-GET requests that are not file uploads or Gemini
  // predictions are eligible for offline queueing.
  const canQueue =
    method !== "GET" && !isFormData && !isPredictionRequest;

  const headers = new Headers(init.headers ?? {});

  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  headers.set(
    "Accept",
    headers.get("Accept") || "application/json"
  );

  // Attach the current access token if a session is available.
  // A session lookup failure should not prevent public AI routes
  // from being called.
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.set(
        "Authorization",
        `Bearer ${session.access_token}`
      );
    }
  } catch (error) {
    console.warn("Could not retrieve the current auth session:", error);
  }

  // Queue eligible requests only when the browser is offline.
  if (
    typeof navigator !== "undefined" &&
    !navigator.onLine &&
    canQueue
  ) {
    enqueueOfflineRequest({
      url: buildOfflineUrl(path),
      method,
      headers: Object.fromEntries(headers.entries()),
      body:
        typeof init.body === "string"
          ? init.body
          : init.body
            ? JSON.stringify(init.body)
            : undefined,
    });

    const error = new ApiError(
      "Request queued for sync while offline.",
      0
    );

    error.queued = true;

    throw error;
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    if (isPredictionRequest) {
      console.error(
        "Market price prediction backend connection failed:",
        error
      );

      throw new ApiError(
        `Cannot connect to the prediction backend at ${apiBaseUrl}.`,
        0
      );
    }

    if (canQueue) {
      enqueueOfflineRequest({
        url: buildOfflineUrl(path),
        method,
        headers: Object.fromEntries(headers.entries()),
        body:
          typeof init.body === "string"
            ? init.body
            : init.body
              ? JSON.stringify(init.body)
              : undefined,
      });

      const queuedError = new ApiError(
        "Network error. Request queued for sync.",
        0
      );

      queuedError.queued = true;

      throw queuedError;
    }

    throw error;
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = await response.json();

      message =
        payload.error ||
        payload.message ||
        message;
    } catch {
      // Retain the default message if the response isn't JSON.
    }

    throw new ApiError(message, response.status);
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return undefined as T;
};