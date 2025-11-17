# Frontend Implementation Guide - Debtor Reminder System

## Overview

This guide provides complete frontend implementation details for integrating the debtor reminder system into your existing application with multi-pharmacy support.

---

## Prerequisites

- Existing React/Vue/Angular application
- Authentication system integration
- API client setup
- State management solution (Redux/Zustand/Context API)

---

## API Base Configuration

### Environment Variables

```env
VITE_API_URL=https://api.yourdomain.com
# or
REACT_APP_API_URL=https://api.yourdomain.com
```

### API Client Setup

```javascript
// api/client.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken(); // Your auth token getter
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      // Handle file downloads
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return response; // For blob responses
      }
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  getAuthToken() {
    // Integrate with your auth system
    return localStorage.getItem('auth_token');
  }

  getPharmacyId() {
    // Get pharmacy ID from user context or selection
    return this.getCurrentPharmacyId(); // Your implementation
  }
}

export const apiClient = new ApiClient();
```

---

## API Service Functions

### Debtor Service

```javascript
// services/debtorService.js
import { apiClient } from './api/client';

export const debtorService = {
  /**
   * Upload PDF report
   * @param {string} pharmacyId - Pharmacy ID
   * @param {File} file - PDF file
   * @returns {Promise<Object>} Report and debtor data
   */
  async uploadReport(pharmacyId, file) {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.request(`/api/pharmacies/${pharmacyId}/debtors/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, browser will set it
        'Authorization': `Bearer ${apiClient.getAuthToken()}`,
      },
    });
  },

  /**
   * Get debtors list with filters
   * @param {string} pharmacyId - Pharmacy ID
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Paginated debtor list
   */
  async getDebtors(pharmacyId, filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.minBalance) params.append('min_balance', filters.minBalance);
    if (filters.ageingBuckets?.length) {
      params.append('ageing_buckets', filters.ageingBuckets.join(','));
    }
    if (filters.hasEmail) params.append('has_email', 'true');
    if (filters.hasPhone) params.append('has_phone', 'true');
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.perPage) params.append('per_page', filters.perPage);
    
    const queryString = params.toString();
    const endpoint = `/api/pharmacies/${pharmacyId}/debtors${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.request(endpoint, {
      method: 'GET',
    });
  },

  /**
   * Get statistics
   * @param {string} pharmacyId - Pharmacy ID
   * @returns {Promise<Object>} Statistics data
   */
  async getStatistics(pharmacyId) {
    return apiClient.request(`/api/pharmacies/${pharmacyId}/debtors/statistics`, {
      method: 'GET',
    });
  },

  /**
   * Send emails to selected debtors
   * @param {string} pharmacyId - Pharmacy ID
   * @param {Array<number>} debtorIds - Array of debtor IDs
   * @param {Array<string>} ageingBuckets - Selected ageing buckets
   * @returns {Promise<Object>} Send results
   */
  async sendEmail(pharmacyId, debtorIds, ageingBuckets) {
    return apiClient.request(`/api/pharmacies/${pharmacyId}/debtors/send-email`, {
      method: 'POST',
      body: JSON.stringify({
        debtor_ids: debtorIds,
        ageing_buckets: ageingBuckets,
      }),
    });
  },

  /**
   * Send SMS to selected debtors
   * @param {string} pharmacyId - Pharmacy ID
   * @param {Array<number>} debtorIds - Array of debtor IDs
   * @param {Array<string>} ageingBuckets - Selected ageing buckets
   * @returns {Promise<Object>} Send results
   */
  async sendSMS(pharmacyId, debtorIds, ageingBuckets) {
    return apiClient.request(`/api/pharmacies/${pharmacyId}/debtors/send-sms`, {
      method: 'POST',
      body: JSON.stringify({
        debtor_ids: debtorIds,
        ageing_buckets: ageingBuckets,
      }),
    });
  },

  /**
   * Download CSV
   * @param {string} pharmacyId - Pharmacy ID
   * @param {Array<number>} debtorIds - Array of debtor IDs
   * @param {number} minBalance - Minimum balance
   * @returns {Promise<Blob>} CSV file blob
   */
  async downloadCSV(pharmacyId, debtorIds, minBalance) {
    const response = await apiClient.request(`/api/pharmacies/${pharmacyId}/debtors/download-csv`, {
      method: 'POST',
      body: JSON.stringify({
        debtor_ids: debtorIds,
        min_balance: minBalance,
      }),
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debtors_${pharmacyId}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Download PDF
   * @param {string} pharmacyId - Pharmacy ID
   * @param {Array<number>} debtorIds - Array of debtor IDs
   * @param {Array<string>} ageingBuckets - Selected ageing buckets
   * @param {Object} colNames - Column name mappings
   * @returns {Promise<void>}
   */
  async downloadPDF(pharmacyId, debtorIds, ageingBuckets, colNames) {
    const response = await apiClient.request(`/api/pharmacies/${pharmacyId}/debtors/download-pdf`, {
      method: 'POST',
      body: JSON.stringify({
        debtor_ids: debtorIds,
        ageing_buckets: ageingBuckets,
        col_names: colNames,
      }),
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debtors_${pharmacyId}_${Date.now()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
};
```

---

## State Management

### Redux Example

```javascript
// store/slices/debtorSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { debtorService } from '../../services/debtorService';

// Get current pharmacy ID from your auth/user state
const getPharmacyId = (state) => state.auth.currentPharmacyId;

// Async thunks
export const uploadReport = createAsyncThunk(
  'debtors/uploadReport',
  async (file, { getState, rejectWithValue }) => {
    try {
      const pharmacyId = getPharmacyId(getState());
      const response = await debtorService.uploadReport(pharmacyId, file);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchDebtors = createAsyncThunk(
  'debtors/fetchDebtors',
  async (filters, { getState, rejectWithValue }) => {
    try {
      const pharmacyId = getPharmacyId(getState());
      const response = await debtorService.getDebtors(pharmacyId, filters);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchStatistics = createAsyncThunk(
  'debtors/fetchStatistics',
  async (_, { getState, rejectWithValue }) => {
    try {
      const pharmacyId = getPharmacyId(getState());
      const response = await debtorService.getStatistics(pharmacyId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendEmail = createAsyncThunk(
  'debtors/sendEmail',
  async ({ debtorIds, ageingBuckets }, { getState, rejectWithValue }) => {
    try {
      const pharmacyId = getPharmacyId(getState());
      const response = await debtorService.sendEmail(pharmacyId, debtorIds, ageingBuckets);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  debtors: [],
  statistics: null,
  filters: {
    minBalance: 100,
    ageingBuckets: ['current', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180'],
    hasEmail: false,
    hasPhone: false,
    search: '',
  },
  selectedDebtors: [],
  sortColumn: null,
  sortDirection: 'asc',
  pagination: {
    page: 1,
    perPage: 100,
    total: 0,
    pages: 0,
  },
  loading: false,
  error: null,
  uploadStatus: 'idle', // 'idle' | 'uploading' | 'success' | 'error'
  communicationStatus: 'idle', // 'idle' | 'sending' | 'success' | 'error'
  communicationResult: null,
};

// Slice
const debtorSlice = createSlice({
  name: 'debtors',
  initialState,
  reducers: {
    setMinBalance: (state, action) => {
      state.filters.minBalance = action.payload;
    },
    setAgeingBuckets: (state, action) => {
      state.filters.ageingBuckets = action.payload;
    },
    setHasEmail: (state, action) => {
      state.filters.hasEmail = action.payload;
    },
    setHasPhone: (state, action) => {
      state.filters.hasPhone = action.payload;
    },
    setSearch: (state, action) => {
      state.filters.search = action.payload;
    },
    setSort: (state, action) => {
      const { column, direction } = action.payload;
      state.sortColumn = column;
      state.sortDirection = direction;
    },
    toggleDebtorSelection: (state, action) => {
      const debtorId = action.payload;
      const index = state.selectedDebtors.indexOf(debtorId);
      if (index > -1) {
        state.selectedDebtors.splice(index, 1);
      } else {
        state.selectedDebtors.push(debtorId);
      }
    },
    selectAllDebtors: (state) => {
      state.selectedDebtors = state.debtors
        .filter(d => !d.is_medical_aid_control)
        .map(d => d.id);
    },
    clearSelection: (state) => {
      state.selectedDebtors = [];
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetUploadStatus: (state) => {
      state.uploadStatus = 'idle';
    },
    resetCommunicationStatus: (state) => {
      state.communicationStatus = 'idle';
      state.communicationResult = null;
    },
  },
  extraReducers: (builder) => {
    // Upload report
    builder
      .addCase(uploadReport.pending, (state) => {
        state.uploadStatus = 'uploading';
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadReport.fulfilled, (state, action) => {
        state.uploadStatus = 'success';
        state.loading = false;
        state.debtors = action.payload.debtors;
        state.statistics = {
          total_accounts: action.payload.total_accounts,
          total_outstanding: action.payload.total_outstanding,
        };
      })
      .addCase(uploadReport.rejected, (state, action) => {
        state.uploadStatus = 'error';
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch debtors
    builder
      .addCase(fetchDebtors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDebtors.fulfilled, (state, action) => {
        state.loading = false;
        state.debtors = action.payload.debtors;
        state.pagination = {
          page: action.payload.page,
          perPage: action.payload.per_page,
          total: action.payload.total,
          pages: action.payload.pages,
        };
      })
      .addCase(fetchDebtors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch statistics
    builder
      .addCase(fetchStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
      });

    // Send email
    builder
      .addCase(sendEmail.pending, (state) => {
        state.communicationStatus = 'sending';
      })
      .addCase(sendEmail.fulfilled, (state, action) => {
        state.communicationStatus = 'success';
        state.communicationResult = {
          type: 'email',
          sent: action.payload.sent,
          errors: action.payload.errors,
        };
      })
      .addCase(sendEmail.rejected, (state, action) => {
        state.communicationStatus = 'error';
        state.communicationResult = {
          type: 'email',
          error: action.payload,
        };
      });
  },
});

export const {
  setMinBalance,
  setAgeingBuckets,
  setHasEmail,
  setHasPhone,
  setSearch,
  setSort,
  toggleDebtorSelection,
  selectAllDebtors,
  clearSelection,
  setPage,
  clearError,
  resetUploadStatus,
  resetCommunicationStatus,
} = debtorSlice.actions;

export default debtorSlice.reducer;
```

---

## React Component Examples

### Main Debtor Component

```javascript
// components/DebtorReminder/DebtorReminder.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  uploadReport,
  fetchDebtors,
  fetchStatistics,
  sendEmail,
  sendSMS,
  setMinBalance,
  setAgeingBuckets,
  setSearch,
  setSort,
  toggleDebtorSelection,
  selectAllDebtors,
  clearSelection,
} from '../../store/slices/debtorSlice';
import FileUpload from './FileUpload';
import StatisticsPanel from './StatisticsPanel';
import FilterPanel from './FilterPanel';
import DebtorTable from './DebtorTable';
import CommunicationPanel from './CommunicationPanel';

const DebtorReminder = () => {
  const dispatch = useDispatch();
  const {
    debtors,
    statistics,
    filters,
    selectedDebtors,
    sortColumn,
    sortDirection,
    pagination,
    loading,
    error,
    uploadStatus,
    communicationStatus,
    communicationResult,
  } = useSelector((state) => state.debtors);

  // Fetch statistics on mount
  useEffect(() => {
    dispatch(fetchStatistics());
  }, [dispatch]);

  // Fetch debtors when filters change
  useEffect(() => {
    dispatch(fetchDebtors(filters));
  }, [dispatch, filters, pagination.page]);

  const handleFileUpload = async (file) => {
    try {
      const result = await dispatch(uploadReport(file));
      if (uploadReport.fulfilled.match(result)) {
        // Refresh statistics and debtors
        dispatch(fetchStatistics());
        dispatch(fetchDebtors(filters));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'minBalance':
        dispatch(setMinBalance(value));
        break;
      case 'ageingBuckets':
        dispatch(setAgeingBuckets(value));
        break;
      case 'search':
        dispatch(setSearch(value));
        break;
      default:
        break;
    }
    // Reset to page 1 when filters change
    dispatch(setPage(1));
  };

  const handleSort = (column) => {
    const direction = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    dispatch(setSort({ column, direction }));
    // Re-fetch with sort (if backend supports it) or sort client-side
  };

  const handleSendEmail = async () => {
    if (selectedDebtors.length === 0) return;
    
    await dispatch(sendEmail({
      debtorIds: selectedDebtors,
      ageingBuckets: filters.ageingBuckets,
    }));
  };

  const handleSendSMS = async () => {
    if (selectedDebtors.length === 0) return;
    
    await dispatch(sendSMS({
      debtorIds: selectedDebtors,
      ageingBuckets: filters.ageingBuckets,
    }));
  };

  // Client-side sorting (if backend doesn't support it)
  const sortedDebtors = [...debtors].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aValue, bValue;
    
    if (['balance', 'current', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180'].includes(sortColumn)) {
      aValue = Number(a[sortColumn]) || 0;
      bValue = Number(b[sortColumn]) || 0;
    } else {
      aValue = (a[sortColumn] || '').toString().toLowerCase();
      bValue = (b[sortColumn] || '').toString().toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter out medical aid accounts (should already be filtered by backend)
  const displayDebtors = sortedDebtors.filter(d => !d.is_medical_aid_control);

  return (
    <div className="debtor-reminder">
      <FileUpload
        onUpload={handleFileUpload}
        status={uploadStatus}
        error={error}
      />

      {statistics && (
        <StatisticsPanel
          statistics={statistics}
          ageingBuckets={filters.ageingBuckets}
        />
      )}

      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <CommunicationPanel
        selectedCount={selectedDebtors.length}
        onSendEmail={handleSendEmail}
        onSendSMS={handleSendSMS}
        status={communicationStatus}
        result={communicationResult}
      />

      <DebtorTable
        debtors={displayDebtors}
        selectedDebtors={selectedDebtors}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        onSelectDebtor={toggleDebtorSelection}
        onSelectAll={selectAllDebtors}
        ageingBuckets={filters.ageingBuckets}
        loading={loading}
      />
    </div>
  );
};

export default DebtorReminder;
```

---

### File Upload Component

```javascript
// components/DebtorReminder/FileUpload.jsx
import React, { useRef } from 'react';

const FileUpload = ({ onUpload, status, error }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    } else {
      alert('Please select a PDF file');
    }
  };

  return (
    <div className="file-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button onClick={() => fileInputRef.current?.click()}>
        Choose PDF File
      </button>
      {status === 'uploading' && <div>Uploading...</div>}
      {status === 'success' && <div>Upload successful!</div>}
      {status === 'error' && <div>Error: {error}</div>}
    </div>
  );
};

export default FileUpload;
```

---

### Statistics Panel Component

```javascript
// components/DebtorReminder/StatisticsPanel.jsx
import React from 'react';

const StatisticsPanel = ({ statistics, ageingBuckets }) => {
  const colNames = {
    current: 'Current',
    d30: '30D',
    d60: '60D',
    d90: '90D',
    d120: '120D',
    d150: '150D',
    d180: '180D',
  };

  return (
    <div className="statistics-panel">
      <h2>Summary Statistics</h2>
      <div className="stats-grid">
        {ageingBuckets.map(bucket => (
          <div key={bucket} className="stat-card">
            <div className="stat-label">{colNames[bucket]}</div>
            <div className="stat-value">
              R {statistics[bucket]?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
            </div>
          </div>
        ))}
      </div>
      <div className="overview">
        <div>Total Outstanding: R {statistics.total_outstanding?.toLocaleString()}</div>
        <div>Total Accounts: {statistics.total_accounts}</div>
      </div>
    </div>
  );
};

export default StatisticsPanel;
```

---

### Filter Panel Component

```javascript
// components/DebtorReminder/FilterPanel.jsx
import React from 'react';

const FilterPanel = ({ filters, onFilterChange }) => {
  const ageingBuckets = ['current', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180'];
  const colNames = {
    current: 'Current',
    d30: '30D',
    d60: '60D',
    d90: '90D',
    d120: '120D',
    d150: '150D',
    d180: '180D',
  };

  return (
    <div className="filter-panel">
      <h3>Filters</h3>
      
      <div className="filter-group">
        <label>Minimum Balance (60+ days)</label>
        <input
          type="range"
          min={0}
          max={2000}
          step={10}
          value={filters.minBalance}
          onChange={(e) => onFilterChange('minBalance', Number(e.target.value))}
        />
        <span>R {filters.minBalance}</span>
        <button onClick={() => onFilterChange('applyBalanceFilter', filters.minBalance)}>
          Apply Filter
        </button>
      </div>

      <div className="filter-group">
        <label>Ageing Buckets</label>
        {ageingBuckets.map(bucket => (
          <label key={bucket}>
            <input
              type="checkbox"
              checked={filters.ageingBuckets.includes(bucket)}
              onChange={(e) => {
                const newBuckets = e.target.checked
                  ? [...filters.ageingBuckets, bucket]
                  : filters.ageingBuckets.filter(b => b !== bucket);
                onFilterChange('ageingBuckets', newBuckets);
              }}
            />
            {colNames[bucket]}
          </label>
        ))}
      </div>

      <div className="filter-group">
        <label>
          <input
            type="checkbox"
            checked={filters.hasEmail}
            onChange={(e) => onFilterChange('hasEmail', e.target.checked)}
          />
          Only show accounts with email
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.hasPhone}
            onChange={(e) => onFilterChange('hasPhone', e.target.checked)}
          />
          Only show accounts with phone
        </label>
      </div>

      <div className="filter-group">
        <input
          type="text"
          placeholder="Search accounts, names, emails, or phones..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
      </div>
    </div>
  );
};

export default FilterPanel;
```

---

### Debtor Table Component

```javascript
// components/DebtorReminder/DebtorTable.jsx
import React from 'react';

const DebtorTable = ({
  debtors,
  selectedDebtors,
  sortColumn,
  sortDirection,
  onSort,
  onSelectDebtor,
  onSelectAll,
  ageingBuckets,
  loading,
}) => {
  const colNames = {
    current: 'Current',
    d30: '30D',
    d60: '60D',
    d90: '90D',
    d120: '120D',
    d150: '150D',
    d180: '180D',
  };

  const allSelected = debtors.length > 0 && 
    debtors.every(d => selectedDebtors.includes(d.id));

  const renderSortIcon = (column) => {
    if (sortColumn !== column) {
      return <span>↕</span>;
    }
    return sortDirection === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="debtor-table">
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectAll();
                  } else {
                    // Clear selection
                  }
                }}
              />
            </th>
            <th onClick={() => onSort('acc_no')}>
              Account {renderSortIcon('acc_no')}
            </th>
            <th onClick={() => onSort('name')}>
              Name {renderSortIcon('name')}
            </th>
            {ageingBuckets.map(bucket => (
              <th key={bucket} onClick={() => onSort(bucket)}>
                {colNames[bucket]} {renderSortIcon(bucket)}
              </th>
            ))}
            <th onClick={() => onSort('balance')}>
              Balance {renderSortIcon('balance')}
            </th>
            <th onClick={() => onSort('email')}>
              Email {renderSortIcon('email')}
            </th>
            <th onClick={() => onSort('phone')}>
              Phone {renderSortIcon('phone')}
            </th>
          </tr>
        </thead>
        <tbody>
          {debtors.map(debtor => (
            <tr key={debtor.id} className={selectedDebtors.includes(debtor.id) ? 'selected' : ''}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedDebtors.includes(debtor.id)}
                  onChange={() => onSelectDebtor(debtor.id)}
                />
              </td>
              <td>{debtor.acc_no}</td>
              <td>{debtor.name}</td>
              {ageingBuckets.map(bucket => (
                <td key={bucket}>
                  {debtor[bucket] > 0 ? `R ${debtor[bucket].toLocaleString()}` : '-'}
                </td>
              ))}
              <td>R {debtor.balance.toLocaleString()}</td>
              <td>
                {debtor.email ? (
                  <a href={`mailto:${debtor.email}`}>{debtor.email}</a>
                ) : (
                  <span>No email</span>
                )}
              </td>
              <td>
                {debtor.phone ? (
                  <a href={`tel:${debtor.phone}`}>{debtor.phone}</a>
                ) : (
                  <span>No phone</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {debtors.length === 0 && (
        <div>No debtors match your current filters</div>
      )}
    </div>
  );
};

export default DebtorTable;
```

---

## Integration Points

### 1. Pharmacy Selection

```javascript
// Get pharmacy ID from your existing system
const getCurrentPharmacyId = () => {
  // Option 1: From user context
  return userContext.currentPharmacyId;
  
  // Option 2: From URL/route
  return useParams().pharmacyId;
  
  // Option 3: From selection state
  return pharmacySelection.selectedPharmacyId;
};
```

### 2. Authentication

```javascript
// Integrate with your auth system
const getAuthToken = () => {
  return authService.getToken();
};

// Add to API client headers
headers: {
  'Authorization': `Bearer ${getAuthToken()}`,
}
```

### 3. Error Handling

```javascript
// Global error handler
const handleApiError = (error) => {
  if (error.status === 401) {
    // Redirect to login
    authService.logout();
  } else if (error.status === 403) {
    // Show access denied message
    showNotification('Access denied', 'error');
  } else {
    // Show generic error
    showNotification('An error occurred', 'error');
  }
};
```

---

## Key Implementation Notes

1. **Pharmacy Context**: Always pass `pharmacyId` to all API calls
2. **Medical Aid Filtering**: Backend handles this, but verify in frontend too
3. **Pagination**: Implement pagination controls for large datasets
4. **Real-time Updates**: Consider WebSocket for real-time statistics updates
5. **Caching**: Cache statistics to reduce API calls
6. **Optimistic Updates**: Update UI optimistically for better UX

---

## Testing

### Component Tests

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import DebtorReminder from './DebtorReminder';
import store from './store';

test('uploads file successfully', async () => {
  const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
  
  render(
    <Provider store={store}>
      <DebtorReminder />
    </Provider>
  );
  
  const fileInput = screen.getByLabelText(/choose file/i);
  fireEvent.change(fileInput, { target: { files: [file] } });
  
  // Assert upload success
});
```

---

This implementation guide provides everything your frontend team needs to integrate the debtor reminder system into your existing application.

