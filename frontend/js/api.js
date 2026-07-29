/**
 * Frontend API boundary.
 *
 * The backend route and request schema are not approved yet. The page therefore
 * reads an endpoint from `body[data-api-endpoint]` and never assumes a route.
 * Kavish can provide the agreed endpoint when the backend contract is ready.
 */

export class ApiConfigurationError extends Error {
  constructor(message = "The analysis endpoint has not been configured.") {
    super(message);
    this.name = "ApiConfigurationError";
  }
}

export class ApiRequestError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export function getConfiguredEndpoint(root = document.body) {
  return root?.dataset?.apiEndpoint?.trim() ?? "";
}

export async function submitFarmerIntake({ endpoint, payload, signal }) {
  if (!endpoint) {
    throw new ApiConfigurationError();
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: payload,
    signal,
  });

  if (!response.ok) {
    let message = "We could not send your information. Please try again.";

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.detail === "string") {
        message = errorBody.detail;
      }
    } catch {
      // A non-JSON error response should still receive a clear farmer-facing message.
    }

    throw new ApiRequestError(message, response.status);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}
