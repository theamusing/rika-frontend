
import { API_BASE, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '../constants.ts';
import { Job } from '../types.ts';

class ApiService {
  private token: string | null = null;
  private inFlight = new Map<string, Promise<any>>();
  private lastGlobalRequestTime = 0;
  
  // Reduced from 750ms to 200ms to allow faster sequential loading (e.g. credits + history)
  private readonly GLOBAL_MIN_INTERVAL = 200; 
  private readonly MAX_RETRIES = 2;

  setToken(token: string) {
    this.token = token;
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async request(method: string, endpoint: string, body?: any, retryCount = 0): Promise<any> {
    const key = `${method}:${endpoint}:${JSON.stringify(body || '')}`;
    
    const baseUrl = API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${baseUrl}${cleanEndpoint}`;

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const requestPromise = (async () => {
      const now = Date.now();
      const elapsed = now - this.lastGlobalRequestTime;
      if (elapsed < this.GLOBAL_MIN_INTERVAL) {
        await this.sleep(this.GLOBAL_MIN_INTERVAL - elapsed);
      }
      this.lastGlobalRequestTime = Date.now();

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      if (body && (method === 'POST' || method === 'PUT')) {
        headers['Content-Type'] = 'application/json';
      }

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          mode: 'cors',
          credentials: 'omit',
        });

        if (response.status === 429) {
          if (retryCount < this.MAX_RETRIES) {
            const backoff = Math.pow(2, retryCount) * 1000;
            await this.sleep(backoff);
            this.inFlight.delete(key);
            return this.request(method, endpoint, body, retryCount + 1);
          }
          throw new Error("Too many requests. Please wait.");
        }

        if (!response.ok) {
          let errorDetail = `Error ${response.status}`;
          try {
            const data = await response.json();
            errorDetail = data.detail || data.message || errorDetail;
          } catch (e) {}

          const isClockSkewError = errorDetail.toLowerCase().includes('not yet valid') || errorDetail.toLowerCase().includes('iat');
          if (isClockSkewError && retryCount < this.MAX_RETRIES) {
            console.warn(`[API] Clock skew detected (iat). Retrying in 1.5s... (Attempt ${retryCount + 1})`);
            await this.sleep(1500); 
            this.inFlight.delete(key);
            return this.request(method, endpoint, body, retryCount + 1);
          }

          throw new Error(errorDetail);
        }

        return await response.json();
      } catch (error: any) {
        if (error.message === 'Failed to fetch') {
          console.error(`CORS or Network Error detected for ${url}.`);
        }

        if (error.message === 'Failed to fetch' && retryCount < this.MAX_RETRIES) {
          await this.sleep(1000);
          this.inFlight.delete(key);
          return this.request(method, endpoint, body, retryCount + 1);
        }

        throw error;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, requestPromise);
    return requestPromise;
  }

  async getCredits() {
    return this.request('GET', 'credits');
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Use a lightweight request to check if the server is up
      // We use 'credits' because it's a valid endpoint, but we don't care about the result
      // If it returns 401/403 it still means the server is UP. 
      // Only network errors or 5xx (sometimes) mean it's DOWN.
      // However, for a simple "ping", we can just try to fetch the base URL or a known public endpoint.
      const baseUrl = API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`;
      const response = await fetch(baseUrl, { method: 'GET', mode: 'cors' });
      // If we get any response, even a 404 or 401, the server is reachable.
      return response.status < 500;
    } catch (e) {
      return false;
    }
  }

  async generate(image_base64: string[], params: any) {
    return this.request('POST', 'generate', { image_base64, params });
  }

  async getJobInfo(genId: string): Promise<Job> {
    return this.request('GET', `jobs/${genId}`);
  }

  async getHistory(start: number = 0, k: number = 20, get_liked: boolean = false): Promise<{ jobs: Job[] }> {
    return this.request('GET', `history?start=${start}&k=${k}&get_liked=${get_liked}`);
  }

  async getHistoryNum(get_liked: boolean = false): Promise<{ total: number }> {
    return this.request('POST', `history_num?get_liked=${get_liked}`);
  }

  async setLiked(generationId: string, liked: boolean, retryCount = 0): Promise<any> {
    const url = `${SUPABASE_FUNCTIONS_URL}set-liked`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'apikey': SUPABASE_ANON_KEY,
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ generation_id: generationId, liked }),
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        let detail = response.statusText;
        try {
          const data = await response.json();
          detail = data.detail || data.message || detail;
        } catch (e) {}
        throw new Error(`Failed to set liked status: ${detail}`);
      }
      return response.json();
    } catch (error: any) {
      if (error.message === 'Failed to fetch' && retryCount < this.MAX_RETRIES) {
        await this.sleep(1000);
        return this.setLiked(generationId, liked, retryCount + 1);
      }
      throw error;
    }
  }
}

export const apiService = new ApiService();
