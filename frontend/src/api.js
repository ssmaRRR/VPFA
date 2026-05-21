const API_BASE_URL = 'http://localhost:8000/api';

let jwtToken = localStorage.getItem('token') || '';

export const api = {
  setToken(token) {
    jwtToken = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },

  getToken() {
    return jwtToken;
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Setăm header-ele implicit
    const headers = { ...options.headers };
    if (jwtToken && !options.noAuth) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    }
    
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 204) {
      return null;
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'A apărut o eroare la procesarea solicitării.');
    }

    return data;
  },

  // ===================================================================
  // AUTENTIFICARE
  // ===================================================================
  async login(email, password) {
    const formData = new FormData();
    formData.append('username', email); // oauth2 form data
    formData.append('password', password);

    const data = await this.request('/auth/login', {
      method: 'POST',
      body: formData,
      noAuth: true
    });
    
    this.setToken(data.access_token);
    return data;
  },

  async register(nume, email, password, varsta, venitLunar, tolerantaRisc, obiectivEconomii) {
    return this.request('/auth/register', {
      method: 'POST',
      body: {
        nume,
        email,
        password,
        varsta: parseInt(varsta) || 30,
        venit_lunar: parseFloat(venitLunar) || 5000.0,
        toleranta_risc: tolerantaRisc || 'Moderat',
        obiectiv_economii: parseFloat(obiectivEconomii) || 1000.0
      },
      noAuth: true
    });
  },

  async getProfile() {
    return this.request('/auth/me');
  },

  async updateProfile(profileData) {
    return this.request('/auth/me', {
      method: 'PUT',
      body: profileData
    });
  },

  // ===================================================================
  // TRANZACȚII
  // ===================================================================
  async getTransactions(filters = {}) {
    const params = new URLSearchParams();
    if (filters.tip) params.append('tip', filters.tip);
    if (filters.categorie) params.append('categorie', filters.categorie);
    if (filters.cautare) params.append('cautare', filters.cautare);
    
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/transactions/${queryStr}`);
  },

  async createTransaction(txData) {
    return this.request('/transactions/', {
      method: 'POST',
      body: {
        suma: parseFloat(txData.suma),
        categorie: txData.categorie,
        tip: txData.tip,
        descriere: txData.descriere || '',
        data: txData.data || null,
        sursa: txData.sursa || 'Manual'
      }
    });
  },

  async deleteTransaction(id) {
    return this.request(`/transactions/${id}`, {
      method: 'DELETE'
    });
  },

  async getDashboardSummary() {
    return this.request('/transactions/dashboard-summary');
  },

  async getMonthlyTrends() {
    return this.request('/transactions/monthly-trends');
  },

  async syncMockData() {
    return this.request('/transactions/mock-sync', {
      method: 'POST'
    });
  },

  async importCSV(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/transactions/import-csv', {
      method: 'POST',
      body: formData
    });
  },

  // ===================================================================
  // MACHINE LEARNING
  // ===================================================================
  async getForecast() {
    return this.request('/ml/forecast');
  },

  async getInvestments() {
    return this.request('/ml/investments');
  },

  async triggerAnomalyDetection() {
    return this.request('/ml/trigger-anomalies', {
      method: 'POST'
    });
  }
};
