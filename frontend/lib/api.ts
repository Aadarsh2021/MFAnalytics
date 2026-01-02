import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

import { supabase } from './supabaseClient';

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
    async (config) => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized - clear tokens
            await supabase.auth.signOut();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// API endpoints
export const api = {
    // Intake endpoints
    intake: {
        save: (data: any) => apiClient.post('/api/intake', data),
        get: (clientId: number) => apiClient.get(`/api/intake/${clientId}`),
    },

    // Fund endpoints
    funds: {
        search: (params: {
            query?: string;
            category?: string;
            asset_class?: string;
            plan_type?: string;
            scheme_type?: string;
            amc?: string | string[];
            exclude_keywords?: string[];
            limit?: number;
            offset?: number;
        }) => apiClient.post('/api/funds/search', params),
        select: (data: any) => apiClient.post('/api/funds/select', data),
        nav: (fundIds: number[], startDate?: string, endDate?: string) =>
            apiClient.post('/api/funds/nav', { fund_ids: fundIds, start_date: startDate, end_date: endDate }),
        getCategories: () => apiClient.get('/api/funds/categories'),
        getAssetClasses: () => apiClient.get('/api/funds/asset-classes'),
        getAMCs: () => apiClient.get('/api/funds/amcs'),
        list: (params?: any) => apiClient.get('/api/funds', { params }),
        audit: (fundId: number) => apiClient.post(`/api/funds/${fundId}/audit`),
        getMetrics: (fundId: number) => apiClient.get(`/api/funds/${fundId}/metrics`),
    },

    // Client endpoints
    clients: {
        list: () => apiClient.get('/api/clients'),
        get: (id: number) => apiClient.get(`/api/clients/${id}`),
        update: (id: number, data: any) => apiClient.put(`/api/clients/${id}`, data),
    },

    // Optimization endpoints
    optimize: {
        run: (data: any) => apiClient.post('/api/optimize/run', data),
        recalculate: (weights: Record<number, number>) => apiClient.post('/api/optimize/recalculate', { weights }),
        get: (id: number) => apiClient.get(`/api/optimize/${id}`),
        simulate: (data: any) => apiClient.post('/api/optimize/simulate', data),
        backtest: (data: any) => apiClient.post('/api/optimize/backtest', data),
    },

    // Rebalance endpoints
    rebalance: {
        upload: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return apiClient.post('/api/rebalance/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        optimize: (data: any) => apiClient.post('/api/rebalance/optimize', data),
    },

    // Portfolio endpoints
    portfolio: {
        upload: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return apiClient.post('/api/portfolio/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        parse: (uploadId: string) => apiClient.post(`/api/portfolio/parse?upload_id=${uploadId}`),
    },
};

export { apiClient };
export default api;

