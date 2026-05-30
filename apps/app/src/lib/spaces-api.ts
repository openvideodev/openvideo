// ─── Space type (matches Director SpaceResponse) ────────────────────────────

export interface Space {
  id: string;
  name: string;
  description?: string | null;
  thumbnail?: string | null;
  width: number;
  height: number;
  fps: number;
  scene: {
    tracks: any[];
    clips: Record<string, any>;
    settings?: any;
  };
  userId: string;
  orgId?: string;
  data?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpaceRequest {
  name: string;
  description?: string;
  width?: number;
  height?: number;
  fps?: number;
}

export interface UpdateSpaceRequest {
  name?: string;
  description?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  fps?: number;
  scene?: Space["scene"];
  data?: any;
}

// ─── Client ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error ?? "Request failed"), { status: res.status });
  }
  return res.json() as Promise<T>;
}

class SpacesAPI {
  private base = "/api/spaces";

  list(): Promise<Space[]> {
    return apiFetch<Space[]>(this.base);
  }

  get(id: string): Promise<Space> {
    return apiFetch<Space>(`${this.base}/${id}`);
  }

  create(data: CreateSpaceRequest): Promise<Space> {
    return apiFetch<Space>(this.base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  update(id: string, data: UpdateSpaceRequest): Promise<Space> {
    return apiFetch<Space>(`${this.base}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  delete(id: string): Promise<void> {
    return apiFetch<void>(`${this.base}/${id}`, { method: "DELETE" });
  }
}

export const spacesAPI = new SpacesAPI();
