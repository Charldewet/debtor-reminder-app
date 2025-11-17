import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  BarChart3, 
  Settings, 
  Download, 
  Upload, 
  FileUp, 
  Mail, 
  MessageSquare, 
  Filter,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';

function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [minBalance, setMinBalance] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [ageingBuckets, setAgeingBuckets] = useState(['current', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180']);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [filterMobile, setFilterMobile] = useState(false);
  const [filterEmail, setFilterEmail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    filters: true,
    table: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  const ageCols = ['current', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180'];
  const colNames = {
    current: 'Current', d30: '30D', d60: '60D', d90: '90D',
    d120: '120D', d150: '150D', d180: '180D'
  };

  // Helper function to identify medical aid control accounts
  const isMedicalAidControlAccount = (row) => {
    const name = (row.name || '').toUpperCase().trim();
    
    // Check for various medical aid control account patterns
    const medicalAidPatterns = [
      'MEDAID CONTROL ACC',
      'MEDICAL AID CONTROL',
      'MEDICAL AID CONTROL ACCOUNT',
      'MED AID CONTROL',
      'MEDAID CONTROL',
      'MEDICAL AID ACC'
    ];
    
    return medicalAidPatterns.some(pattern => name.includes(pattern));
  };

  // Only allow selection for accounts with nonzero in selected ageing buckets (excluding medical aid accounts)
  const selectableRows = filtered.filter(row => 
    !isMedicalAidControlAccount(row) && ageingBuckets.some(b => row[b] > 0)
  );

  // Filtered for table display with search
  const filteredForTable = filtered.filter(row => {
    // Always exclude medical aid control accounts
    if (isMedicalAidControlAccount(row)) return false;
    
    // Filter by contact info
    if (filterMobile && (!row.phone || row.phone.trim() === '')) return false;
    if (filterEmail && (!row.email || row.email.trim() === '')) return false;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        row.acc_no?.toLowerCase().includes(searchLower) ||
        row.name?.toLowerCase().includes(searchLower) ||
        row.email?.toLowerCase().includes(searchLower) ||
        row.phone?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by ageing buckets - only show rows that have values in selected ageing buckets
    const hasValueInSelectedBuckets = ageingBuckets.some(bucket => row[bucket] > 0);
    return hasValueInSelectedBuckets;
  });

  useEffect(() => {
    // Reset selection when filtered or ageingBuckets change
    setSelectedRows(selectableRows.map(row => row.acc_no));
    setSelectAll(true);
  }, [filtered, ageingBuckets]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(''); // Clear any previous errors
  };

  // Filter out medical aid control accounts
  const filterMedicalAidAccounts = (dataArray) => {
    return dataArray.filter(row => !isMedicalAidControlAccount(row));
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload file. Please try again.');
      const json = await res.json();
      // Filter out medical aid control accounts immediately after upload
      const filteredData = filterMedicalAidAccounts(json);
      setData(filteredData);
      setFiltered(filteredData);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleFilter = () => {
    // Ensure medical aid accounts are filtered out when applying balance filter
    const filteredRows = data.filter(row => {
      // Exclude medical aid control accounts
      if (isMedicalAidControlAccount(row)) return false;
      // Apply balance filter
      return row.d60 + row.d90 + row.d120 + row.d150 + row.d180 > minBalance;
    });
    setFiltered(filteredRows);
  };

  const handleDownload = async () => {
    try {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: filtered, min_balance: minBalance })
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered_debtors.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download file. Please try again.');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(selectableRows.map(row => row.acc_no));
      setSelectAll(true);
    } else {
      setSelectedRows([]);
      setSelectAll(false);
    }
  };

  const handleSelectRow = (acc_no) => {
    if (selectedRows.includes(acc_no)) {
      setSelectedRows(selectedRows.filter(id => id !== acc_no));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedRows, acc_no];
      setSelectedRows(newSelected);
      if (newSelected.length === selectableRows.length) setSelectAll(true);
    }
  };

  const handleAgeingBucketChange = (bucket) => {
    if (ageingBuckets.includes(bucket)) {
      setAgeingBuckets(ageingBuckets.filter(b => b !== bucket));
    } else {
      setAgeingBuckets([...ageingBuckets, bucket]);
    }
  };

  const handleSendEmail = async () => {
    const selectedAccounts = selectableRows.filter(row => selectedRows.includes(row.acc_no));
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/send_email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: selectedAccounts })
      });
      const data = await res.json();
      setSendResult({ type: 'email', count: data.sent.length, status: 'success' });
    } catch (err) {
      setSendResult({ type: 'email', status: 'error', error: err.message });
    }
    setSending(false);
  };

  const handleSendSMS = async () => {
    const selectedAccounts = selectableRows.filter(row => selectedRows.includes(row.acc_no));
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/send_sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: selectedAccounts })
      });
      const data = await res.json();
      setSendResult({ type: 'sms', count: data.sent.length, status: 'success' });
    } catch (err) {
      setSendResult({ type: 'sms', status: 'error', error: err.message });
    }
    setSending(false);
  };

  const handleDownloadMissingContactsPDF = async () => {
    try {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/download_missing_contacts_pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: filtered })
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'missing_contacts.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download PDF. Please try again.');
    }
  };

  const handleDownloadFilteredTablePDF = async () => {
    try {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/download_filtered_table_pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        rows: filteredForTable,
        ageing_buckets: ageingBuckets,
        col_names: colNames
      })
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered_debtor_table.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download PDF. Please try again.');
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort the filtered table data
  const sortedTableData = [...filteredForTable].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aValue, bValue;
    
    // Handle different column types
    if (sortColumn === 'balance' || ageingBuckets.includes(sortColumn)) {
      // Numeric columns
      aValue = Number(a[sortColumn]) || 0;
      bValue = Number(b[sortColumn]) || 0;
    } else if (sortColumn === 'acc_no') {
      // Account number - try numeric first, then string
      aValue = Number(a.acc_no) || a.acc_no || '';
      bValue = Number(b.acc_no) || b.acc_no || '';
    } else {
      // String columns (name, email, phone)
      aValue = (a[sortColumn] || '').toString().toLowerCase();
      bValue = (b[sortColumn] || '').toString().toLowerCase();
    }
    
    // Compare values
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalOutstanding = filtered.reduce((sum, row) => sum + row.balance, 0);
  const totalAccounts = filtered.length;
  const selectedCount = selectedRows.length;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo">
              <FileText size={32} />
              </div>
            <div className="brand">
              <h1>Debtor Reminder</h1>
              <p>Professional Debt Management Dashboard</p>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="btn-secondary"
              onClick={() => window.location.reload()}
              title="Refresh page"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {/* File Upload Section */}
          <section className="upload-section">
            <div className="upload-card">
              <div className="upload-header">
                <FileUp size={24} />
                <h2>Upload Debtor Report</h2>
              </div>
              <div className="upload-content">
                <div className="file-input-wrapper">
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={handleFileChange} 
                    id="file-upload" 
                    className="file-input"
                  />
                  <label htmlFor="file-upload" className="file-label">
                    <FileUp size={24} />
                    <span>{file ? file.name : 'Choose PDF file or drag and drop'}</span>
                    <span className="file-hint">Supports PDF files only</span>
            </label>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={handleUpload} 
                  disabled={loading || !file}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={20} className="spinning" />
                      Processing...
                    </>
                  ) : (
                    <>
              <Upload size={20} />
                      Upload & Analyze
                    </>
                  )}
            </button>
          </div>
            </div>
          </section>

          {/* Error Messages */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
              <button 
                className="alert-close" 
                onClick={() => setError('')}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Success Messages */}
          {sendResult && (
            <div className={`alert ${sendResult.status === 'success' ? 'alert-success' : 'alert-error'}`}>
              {sendResult.status === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span>
                {sendResult.status === 'success'
                  ? `Successfully sent ${sendResult.count} ${sendResult.type === 'email' ? 'email(s)' : 'SMS(es)'}!`
                  : `Failed to send ${sendResult.type === 'email' ? 'emails' : 'SMSes'}: ${sendResult.error}`
                }
              </span>
              <button 
                className="alert-close" 
                onClick={() => setSendResult(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {data.length > 0 && (
            <>
              {/* Summary Statistics */}
              <section className="section">
                <div className="section-header" onClick={() => toggleSection('summary')}>
                  <div className="section-title">
                  <BarChart3 size={24} />
                    <h2>Summary Statistics</h2>
                </div>
                  {expandedSections.summary ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                
                {expandedSections.summary && (
                  <div className="stats-container">
                <div className="stats-grid">
                      {ageingBuckets.map((col) => {
                    const sum = filtered.reduce((sum, row) => sum + row[col], 0);
                    return (
                      <div key={col} className="stat-card">
                            <div className="stat-icon">
                              <DollarSign size={20} />
                            </div>
                            <div className="stat-content">
                        <div className="stat-label">{colNames[col]}</div>
                        <div className="stat-value">R {sum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>
                      </div>
                    );
                  })}
                </div>
                    
                    <div className="overview-cards">
                      <div className="overview-card">
                        <div className="overview-icon">
                          <DollarSign size={24} />
              </div>
                        <div className="overview-content">
                          <div className="overview-label">Total Outstanding</div>
                          <div className="overview-value">R {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    </div>
                      <div className="overview-card">
                        <div className="overview-icon">
                          <Users size={24} />
                  </div>
                        <div className="overview-content">
                          <div className="overview-label">Total Accounts</div>
                          <div className="overview-value">{totalAccounts}</div>
                </div>
              </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Filter Settings */}
              <section className="section">
                <div className="section-header" onClick={() => toggleSection('filters')}>
                  <div className="section-title">
                  <Settings size={24} />
                    <h2>Filter & Settings</h2>
                </div>
                  {expandedSections.filters ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                
                {expandedSections.filters && (
                  <div className="filters-container">
                <div className="filter-card">
                      <h3>Balance Filter</h3>
                      <div className="filter-group">
                        <label className="filter-label">
                          Minimum Balance for 60+ Day Arrears
                        </label>
                        <div className="range-container">
                      <input 
                        type="range" 
                        min={0} 
                        max={2000} 
                        step={10} 
                        value={minBalance} 
                        onChange={e => setMinBalance(Number(e.target.value))}
                        className="range-slider"
                      />
                          <div className="range-value">R {minBalance}</div>
                    </div>
                        <button className="btn-primary" onClick={handleFilter}>
                          Apply Filter
                        </button>
                  </div>
                    </div>

                    <div className="filter-card">
                      <h3>Ageing Buckets</h3>
                      <div className="filter-group">
                        <label className="filter-label">
                          Select buckets to include in communications:
                        </label>
                        <div className="checkbox-grid">
                      {['current', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180'].map(bucket => (
                            <label key={bucket} className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={ageingBuckets.includes(bucket)}
                            onChange={() => handleAgeingBucketChange(bucket)}
                          />
                              <span className="checkbox-label">{colNames[bucket]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                    <div className="filter-card">
                      <h3>Contact Filters</h3>
                      <div className="filter-group">
                        <div className="checkbox-row">
                          <label className="checkbox-item">
                            <input 
                              type="checkbox" 
                              checked={filterMobile} 
                              onChange={e => setFilterMobile(e.target.checked)} 
                            />
                            <span className="checkbox-label">Only show accounts with mobile number</span>
                  </label>
                          <label className="checkbox-item">
                            <input 
                              type="checkbox" 
                              checked={filterEmail} 
                              onChange={e => setFilterEmail(e.target.checked)} 
                            />
                            <span className="checkbox-label">Only show accounts with email address</span>
                  </label>
                        </div>
                        <button className="btn-secondary" onClick={handleDownloadMissingContactsPDF}>
                          <Download size={16} />
                          Download Missing Contacts PDF
                  </button>
                </div>
              </div>
                  </div>
                )}
              </section>

              {/* Data Table */}
              <section className="section">
                <div className="section-header" onClick={() => toggleSection('table')}>
                  <div className="section-title">
                    <FileText size={24} />
                    <h2>Accounts in Arrears</h2>
                    <span className="badge">{sortedTableData.length} accounts</span>
                  </div>
                  {expandedSections.table ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                
                {expandedSections.table && (
                  <div className="table-container">
                    <div className="table-header">
                      <div className="table-controls">
                        <div className="search-box">
                          <Search size={20} />
                          <input
                            type="text"
                            placeholder="Search accounts, names, emails, or phone numbers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                          />
                        </div>
                        <div className="selection-info">
                          {selectedCount > 0 && (
                            <span className="selection-count">
                              {selectedCount} of {selectableRows.length} selected
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="action-buttons">
                        <button 
                          className="btn-primary btn-email" 
                          onClick={handleSendEmail} 
                          disabled={selectedCount === 0 || sending}
                        >
                          <Mail size={16} />
                          Send Email ({selectedCount})
                    </button>
                        <button 
                          className="btn-primary btn-sms" 
                          onClick={handleSendSMS} 
                          disabled={selectedCount === 0 || sending}
                        >
                          <MessageSquare size={16} />
                          Send SMS ({selectedCount})
                    </button>
                        <button className="btn-secondary" onClick={handleDownload}>
                          <Download size={16} />
                          Export CSV
                    </button>
                        <button className="btn-secondary" onClick={handleDownloadFilteredTablePDF}>
                          <FileText size={16} />
                          Export PDF
                    </button>
                  </div>
                </div>

                  <div className="table-wrapper">
                      <table className="data-table">
                      <thead>
                        <tr>
                            <th className="checkbox-cell">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={handleSelectAll}
                              disabled={selectableRows.length === 0}
                            />
                          </th>
                            <th 
                              className="sortable-header" 
                              onClick={() => handleSort('acc_no')}
                              title="Click to sort"
                            >
                              <div className="header-content">
                                Account
                                {sortColumn === 'acc_no' && (
                                  sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                )}
                                {sortColumn !== 'acc_no' && <ArrowUpDown size={14} className="sort-icon-inactive" />}
                              </div>
                            </th>
                            <th 
                              className="sortable-header" 
                              onClick={() => handleSort('name')}
                              title="Click to sort"
                            >
                              <div className="header-content">
                                Name
                                {sortColumn === 'name' && (
                                  sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                )}
                                {sortColumn !== 'name' && <ArrowUpDown size={14} className="sort-icon-inactive" />}
                              </div>
                            </th>
                            {ageingBuckets.map(col => (
                              <th 
                                key={col} 
                                className="amount-header sortable-header"
                                onClick={() => handleSort(col)}
                                title="Click to sort"
                              >
                                <div className="header-content">
                                  {colNames[col]}
                                  {sortColumn === col && (
                                    sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                  )}
                                  {sortColumn !== col && <ArrowUpDown size={14} className="sort-icon-inactive" />}
                                </div>
                              </th>
                            ))}
                            <th 
                              className="amount-header sortable-header"
                              onClick={() => handleSort('balance')}
                              title="Click to sort"
                            >
                              <div className="header-content">
                                Balance
                                {sortColumn === 'balance' && (
                                  sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                )}
                                {sortColumn !== 'balance' && <ArrowUpDown size={14} className="sort-icon-inactive" />}
                              </div>
                            </th>
                            <th 
                              className="sortable-header"
                              onClick={() => handleSort('email')}
                              title="Click to sort"
                            >
                              <div className="header-content">
                                Email
                                {sortColumn === 'email' && (
                                  sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                )}
                                {sortColumn !== 'email' && <ArrowUpDown size={14} className="sort-icon-inactive" />}
                              </div>
                            </th>
                            <th 
                              className="sortable-header"
                              onClick={() => handleSort('phone')}
                              title="Click to sort"
                            >
                              <div className="header-content">
                                Phone
                                {sortColumn === 'phone' && (
                                  sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                )}
                                {sortColumn !== 'phone' && <ArrowUpDown size={14} className="sort-icon-inactive" />}
                              </div>
                            </th>
                        </tr>
                      </thead>
                      <tbody>
                          {sortedTableData.length === 0 ? (
                            <tr>
                              <td colSpan={8 + ageingBuckets.length} className="empty-state">
                                <div className="empty-content">
                                  <FileText size={48} />
                                  <p>No accounts match your current filters</p>
                                  <button 
                                    className="btn-secondary"
                                    onClick={() => {
                                      setSearchTerm('');
                                      setFilterMobile(false);
                                      setFilterEmail(false);
                                    }}
                                  >
                                    Clear Filters
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            sortedTableData.map((row, idx) => (
                              <tr key={idx} className={selectedRows.includes(row.acc_no) ? 'selected' : ''}>
                                <td className="checkbox-cell">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(row.acc_no)}
                                onChange={() => handleSelectRow(row.acc_no)}
                              />
                            </td>
                              <td className="account-cell">{row.acc_no}</td>
                              <td className="name-cell">{row.name}</td>
                                {ageingBuckets.map(col => (
                                  <td key={col} className="amount-cell">
                                    {row[col] > 0 ? `R ${row[col].toLocaleString()}` : '-'}
                                  </td>
                                ))}
                              <td className="balance-cell">R {row.balance.toLocaleString()}</td>
                                <td className="contact-cell">
                                  {row.email ? (
                                    <a href={`mailto:${row.email}`} className="contact-link">
                                      {row.email}
                                    </a>
                                  ) : (
                                    <span className="missing-contact">No email</span>
                                  )}
                                </td>
                                <td className="contact-cell">
                                  {row.phone ? (
                                    <a href={`tel:${row.phone}`} className="contact-link">
                                      {row.phone}
                                    </a>
                                  ) : (
                                    <span className="missing-contact">No phone</span>
                                  )}
                                </td>
                            </tr>
                            ))
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        .app {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0;
        }

        .brand p {
          font-size: 0.875rem;
          color: #718096;
          margin: 0;
        }

        .main {
          padding: 2rem 0;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
        }
        
        .upload-section {
          margin-bottom: 2rem;
        }

        .upload-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .upload-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .upload-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }

        .upload-content {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        
        .file-input-wrapper {
          flex: 1;
          min-width: 300px;
        }

        .file-input {
          display: none;
        }

        .file-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          border: 2px dashed #cbd5e0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          background: #f7fafc;
        }

        .file-label:hover {
          border-color: #667eea;
          background: #edf2f7;
        }

        .file-label span {
          margin-top: 0.5rem;
          font-weight: 500;
          color: #4a5568;
        }

        .file-hint {
          font-size: 0.875rem;
          color: #718096;
          margin-top: 0.25rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
        }
        
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: white;
          color: #4a5568;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-secondary:hover {
          background: #f7fafc;
          border-color: #cbd5e0;
        }

        .btn-email {
          background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%) !important;
        }

        .btn-sms {
          background: linear-gradient(135deg, #38a169 0%, #2f855a 100%) !important;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-weight: 500;
        }

        .alert-error {
          background: #fed7d7;
          color: #c53030;
          border: 1px solid #feb2b2;
        }

        .alert-success {
          background: #c6f6d5;
          color: #2f855a;
          border: 1px solid #9ae6b4;
        }

        .alert-close {
          background: none;
          border: none;
          cursor: pointer;
          margin-left: auto;
          padding: 0.25rem;
          border-radius: 4px;
        }

        .alert-close:hover {
          background: rgba(0, 0, 0, 0.1);
        }
        
        .section {
          margin-bottom: 2rem;
        }
        
        .section-header {
          background: white;
          border-radius: 12px 12px 0 0;
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background-color 0.2s;
          border: 1px solid #e2e8f0;
          border-bottom: none;
        }

        .section-header:hover {
          background: #f7fafc;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-title h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
        }

        .badge {
          background: #667eea;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .stats-container {
          background: white;
          border-radius: 0 0 12px 12px;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
          border-top: none;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .stat-card {
          background: #f7fafc;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border: 1px solid #e2e8f0;
        }

        .stat-icon {
          background: #667eea;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-label {
          font-size: 0.875rem;
          color: #718096;
          font-weight: 500;
        }
        
        .stat-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1a202c;
        }

        .overview-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .overview-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .overview-icon {
          background: rgba(255, 255, 255, 0.2);
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .overview-label {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .overview-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .filters-container {
          background: white;
          border-radius: 0 0 12px 12px;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
          border-top: none;
        }

        .filter-card {
          margin-bottom: 2rem;
        }

        .filter-card:last-child {
          margin-bottom: 0;
        }

        .filter-card h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 1rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .filter-label {
          font-weight: 500;
          color: #4a5568;
        }

        .range-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .range-slider {
          flex: 1;
          min-width: 200px;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          outline: none;
          -webkit-appearance: none;
        }
        
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: #667eea;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .range-value {
          font-weight: 700;
          color: #667eea;
          min-width: 80px;
        }

        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.75rem;
        }

        .checkbox-row {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .checkbox-item:hover {
          background: #f7fafc;
        }

        .checkbox-item input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #667eea;
        }

        .checkbox-label {
          font-weight: 500;
          color: #4a5568;
        }

        .table-container {
          background: white;
          border-radius: 0 0 12px 12px;
          border: 1px solid #e2e8f0;
          border-top: none;
        }
        
        .table-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .table-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          min-width: 300px;
        }

        .search-box svg {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #718096;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 0.75rem 0.75rem 2.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          background: #f7fafc;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
        }

        .selection-info {
          font-size: 0.875rem;
          color: #718096;
        }

        .selection-count {
          background: #667eea;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
        }

        .action-buttons {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        
        .table-wrapper {
          overflow-x: auto;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: #f7fafc;
          color: #4a5568;
          font-weight: 600;
          padding: 1rem 0.75rem;
          text-align: left;
          font-size: 0.875rem;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .sortable-header {
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s;
        }

        .sortable-header:hover {
          background: #edf2f7 !important;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sort-icon-inactive {
          opacity: 0.3;
          transition: opacity 0.2s;
        }

        .sortable-header:hover .sort-icon-inactive {
          opacity: 0.6;
        }
        
        .data-table td {
          padding: 1rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
          color: #4a5568;
        }
        
        .data-table tbody tr {
          transition: background-color 0.2s;
        }
        
        .data-table tbody tr:hover {
          background: #f7fafc;
        }

        .data-table tbody tr.selected {
          background: #ebf8ff;
        }

        .checkbox-cell {
          width: 40px;
          text-align: center;
        }

        .amount-header {
          text-align: right;
        }
        
        .account-cell {
          font-weight: 600;
          color: #1a202c;
        }
        
        .name-cell {
          font-weight: 500;
        }
        
        .amount-cell {
          text-align: right;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          font-weight: 500;
        }
        
        .balance-cell {
          text-align: right;
          font-weight: 700;
          color: #1a202c;
        }
        
        .contact-cell {
          font-size: 0.875rem;
        }
        
        .contact-link {
          color: #667eea;
          text-decoration: none;
        }

        .contact-link:hover {
          text-decoration: underline;
        }

        .missing-contact {
          color: #a0aec0;
          font-style: italic;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
        }

        .empty-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          color: #718096;
        }

        .empty-content p {
          font-size: 1.125rem;
          font-weight: 500;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .header-content {
            padding: 1rem;
          }

          .container {
            padding: 0 1rem;
          }

          .upload-content {
            flex-direction: column;
            align-items: stretch;
          }

          .file-input-wrapper {
            min-width: auto;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .overview-cards {
            grid-template-columns: 1fr;
          }
          
          .table-header {
            flex-direction: column;
            align-items: stretch;
          }
          
          .table-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .search-box {
            min-width: auto;
          }

          .action-buttons {
            justify-content: center;
          }
          
          .checkbox-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

export default App;
