import { apiRequest } from "@/lib/api";

type RequestBase = {
  token?: string | null;
  headers?: Record<string, string>;
  suppressStatusCodes?: number[];
};

export const trainingApi = {
  modules: {
    get(moduleId: number, options: RequestBase) {
      return apiRequest(`/training-content-v2/modules/${moduleId}`, options);
    },
    getLocks(options: RequestBase) {
      return apiRequest("/training-content-v2/modules/locks", options);
    },
  },

  sessions: {
    get(sessionId: number, options: RequestBase) {
      return apiRequest(`/training-content-v2/sessions/${sessionId}`, options);
    },
    create(body: unknown, options: RequestBase) {
      return apiRequest<{ id: number }>("/training-content-v2/sessions", {
        ...options,
        method: "POST",
        body,
      });
    },
    update(sessionId: number, body: unknown, options: RequestBase) {
      return apiRequest(`/training-content-v2/sessions/${sessionId}`, {
        ...options,
        method: "PUT",
        body,
      });
    },
    delete(sessionId: number, options: RequestBase) {
      return apiRequest(`/training-content-v2/sessions/${sessionId}`, {
        ...options,
        method: "DELETE",
      });
    },
  },

  items: {
    get(itemId: number, options: RequestBase) {
      return apiRequest(`/training-content-v2/items/${itemId}`, options);
    },
    create(body: unknown, options: RequestBase) {
      return apiRequest<{ id: number }>("/training-content-v2/items", {
        ...options,
        method: "POST",
        body,
      });
    },
    update(itemId: number, body: unknown, options: RequestBase) {
      return apiRequest(`/training-content-v2/items/${itemId}`, {
        ...options,
        method: "PUT",
        body,
      });
    },
    delete(itemId: number, options: RequestBase) {
      return apiRequest(`/training-content-v2/items/${itemId}`, {
        ...options,
        method: "DELETE",
      });
    },
  },

  others: {
    get(otherId: number, options: RequestBase) {
      return apiRequest(`/training-content-v2/others/${otherId}`, options);
    },
    create(body: unknown, options: RequestBase) {
      return apiRequest<{ id: number }>("/training-content-v2/others", {
        ...options,
        method: "POST",
        body,
      });
    },
    update(otherId: number, body: unknown, options: RequestBase) {
      return apiRequest(`/training-content-v2/others/${otherId}`, {
        ...options,
        method: "PUT",
        body,
      });
    },
    delete(otherId: number, options: RequestBase) {
      return apiRequest(`/training-content-v2/others/${otherId}`, {
        ...options,
        method: "DELETE",
      });
    },
  },

  admin: {
    listAudiences(options: RequestBase) {
      return apiRequest("/training-content-v2/admin/audiences", options);
    },
    updateAudience(body: unknown, options: RequestBase) {
      return apiRequest("/training-content-v2/admin/audiences", {
        ...options,
        method: "PUT",
        body,
      });
    },
  },
};
