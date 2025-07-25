import React, { useState } from 'react';
import { FileText, BarChart3, Settings, Download, Upload, FileUp, Mail, MessageSquare, Filter } from 'lucide-react';

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

  const ageCols = ['current', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180'];
  const colNames = {
    current: 'Current', d30: '30D', d60: '60D', d90: '90D',
    d120: '120D', d150: '150D', d180: '180D'
  };

  // Only allow selection for accounts with nonzero in selected ageing buckets
  const selectableRows = filtered.filter(row => ageingBuckets.some(b => row[b] > 0));

  // Filtered for table display
  const filteredForTable = filtered.filter(row => {
    // Filter by contact info
    if (filterMobile && (!row.phone || row.phone.trim() === '')) return false;
    if (filterEmail && (!row.email || row.email.trim() === '')) return false;
    
    // Filter by ageing buckets - only show rows that have values in selected ageing buckets
    const hasValueInSelectedBuckets = ageingBuckets.some(bucket => row[bucket] > 0);
    return hasValueInSelectedBuckets;
  });

  React.useEffect(() => {
    // Reset selection when filtered or ageingBuckets change
    setSelectedRows(selectableRows.map(row => row.acc_no));
    setSelectAll(true);
  }, [filtered, ageingBuckets]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
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
      if (!res.ok) throw new Error('Failed to upload');
      const json = await res.json();
      setData(json);
      setFiltered(json);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleFilter = () => {
    const filteredRows = data.filter(row =>
      row.d60 + row.d90 + row.d120 + row.d150 + row.d180 > minBalance
    );
    setFiltered(filteredRows);
  };

  const handleDownload = async () => {
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

  // Communication actions
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
    // Send all filtered rows to backend for PDF generation
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
  };

  const handleDownloadFilteredTablePDF = async () => {
    // Send filtered table data to backend for PDF generation
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
  };

  const totalOutstanding = filtered.reduce((sum, row) => sum + row.balance, 0);

  return (
    <div className="app-container">
      <div className="centered-main">
        <div className="container">
          <div className="header">
            <div className="title-section">
              <FileText className="title-icon" size={48} />
              <div>
                <h1 className="main-title">Debtor Reminder Dashboard</h1>
                <p className="subtitle">Easily manage your debtor reports in a simple way</p>
              </div>
            </div>
          </div>
          <div className="upload-section">
            <input type="file" accept="application/pdf" onChange={handleFileChange} id="file-upload" style={{ display: 'none' }} />
            <label htmlFor="file-upload" className="upload-btn">
              <FileUp size={20} />
              {file ? file.name : 'Choose PDF File'}
            </label>
            <button className="primary-btn" onClick={handleUpload} disabled={loading || !file}>
              <Upload size={20} />
              {loading ? 'Processing...' : 'Upload Report'}
            </button>
          </div>
          {error && <div className="error-msg">{error}</div>}
          {loading && <div className="loading-msg">Analyzing your debtor report...</div>}
          {data.length > 0 && (
            <>
              <div className="section">
                <div className="section-header">
                  <BarChart3 size={24} />
                  <h2 className="section-title">Summary Statistics</h2>
                </div>
                <div className="stats-grid">
                  {ageingBuckets.map((col, i) => {
                    const sum = filtered.reduce((sum, row) => sum + row[col], 0);
                    return (
                      <div key={col} className="stat-card">
                        <div className="stat-label">{colNames[col]}</div>
                        <div className="stat-value">R {sum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="section">
                <div className="totals-card">
                  <h3 className="card-title">Total Overview</h3>
                  <div className="totals-content">
                    <div className="total-item">
                      <span className="total-label">Total Outstanding</span>
                      <span className="total-value">R {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="total-item">
                      <span className="total-label">Total Accounts</span>
                      <span className="total-value">{filtered.length}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="section">
                <div className="section-header">
                  <Settings size={24} />
                  <h2 className="section-title">Filter Settings</h2>
                </div>
                <div className="filter-card">
                  <div className="filter-content">
                    <label className="filter-label">Minimum Balance for 60+ Day Arrears</label>
                    <div className="filter-controls">
                      <input 
                        type="range" 
                        min={0} 
                        max={2000} 
                        step={10} 
                        value={minBalance} 
                        onChange={e => setMinBalance(Number(e.target.value))}
                        className="range-slider"
                      />
                      <span className="filter-value">R {minBalance}</span>
                      <button className="primary-btn" onClick={handleFilter}>Apply Filter</button>
                    </div>
                  </div>
                  <div className="filter-content ageing-buckets">
                    <label className="filter-label">Select Ageing Buckets to Contact:</label>
                    <div className="filter-controls ageing-controls">
                      {['current', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180'].map(bucket => (
                        <label key={bucket} className="ageing-checkbox">
                          <input
                            type="checkbox"
                            checked={ageingBuckets.includes(bucket)}
                            onChange={() => handleAgeingBucketChange(bucket)}
                          />
                          {colNames[bucket]}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="section">
                <div className="section-header">
                  <Filter size={24} />
                  <h2 className="section-title">Contact Filters</h2>
                </div>
                <div className="contact-filters">
                  <label>
                    <input type="checkbox" checked={filterMobile} onChange={e => setFilterMobile(e.target.checked)} />
                    Only show accounts with mobile number
                  </label>
                  <label>
                    <input type="checkbox" checked={filterEmail} onChange={e => setFilterEmail(e.target.checked)} />
                    Only show accounts with email address
                  </label>
                  <button className="primary-btn" onClick={handleDownloadMissingContactsPDF}>
                    <Download size={20} /> Download PDF: Missing Contact Info
                  </button>
                </div>
              </div>
              <div className="section">
                <div className="table-header">
                  <div className="section-header">
                    <FileText size={24} />
                    <h2 className="section-title">Accounts in Arrears</h2>
                  </div>
                  <div className="comm-btns">
                    <button className="primary-btn btn-email" onClick={handleSendEmail} disabled={selectedRows.length === 0 || sending}>
                      <Mail size={20} /> Send Email
                    </button>
                    <button className="primary-btn btn-sms" onClick={handleSendSMS} disabled={selectedRows.length === 0 || sending}>
                      <MessageSquare size={20} /> Send SMS
                    </button>
                    <button className="primary-btn" onClick={handleDownload}>
                      <Download size={20} /> Download CSV
                    </button>
                    <button className="primary-btn" onClick={handleDownloadFilteredTablePDF}>
                      <FileText size={20} /> Download PDF
                    </button>
                  </div>
                  {sendResult && (
                    <div className={`send-result ${sendResult.status}`}>{
                      sendResult.status === 'success'
                        ? `Successfully sent ${sendResult.count} ${sendResult.type === 'email' ? 'email(s)' : 'SMS(es)'}!`
                        : `Failed to send ${sendResult.type === 'email' ? 'emails' : 'SMSes'}: ${sendResult.error}`
                    }</div>
                  )}
                </div>
                <div className="table-card">
                  <div className="table-wrapper">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={handleSelectAll}
                              disabled={selectableRows.length === 0}
                            />
                          </th>
                          <th>Account</th>
                          <th>Name</th>
                          {ageingBuckets.map(col => <th key={col}>{colNames[col]}</th>)}
                          <th>Balance</th>
                          <th>Email</th>
                          <th>Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredForTable.map((row, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(row.acc_no)}
                                onChange={() => handleSelectRow(row.acc_no)}
                              />
                            </td>
                              <td className="account-cell">{row.acc_no}</td>
                              <td className="name-cell">{row.name}</td>
                              {ageingBuckets.map(col => <td key={col} className="amount-cell">{row[col]}</td>)}
                              <td className="balance-cell">R {row.balance.toLocaleString()}</td>
                              <td className="contact-cell">{row.email}</td>
                              <td className="contact-cell">{row.phone}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`
        * {
          box-sizing: border-box;
        }
        
        body, html, #root {
          height: 100%;
          margin: 0;
          font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #0f172a;
          color: #ffffff;
        }
        
        .app-container {
          min-height: 100vh;
          min-width: 100vw;
          width: 100vw;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        
        .centered-main {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .container {
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          padding: 40px 24px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 48px;
        }
        
        .title-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 24px;
        }
        
        .title-icon {
          color: #f97316;
          flex-shrink: 0;
        }
        
        .main-title {
          font-size: 3.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.02em;
          text-align: left;
        }
        
        .subtitle {
          font-size: 1.25rem;
          color: #94a3b8;
          margin: 8px 0 0 0;
          font-weight: 400;
          text-align: left;
        }
        
        .upload-section {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        
        .upload-btn {
          background: #ffffff;
          color: #0f172a;
          border: none;
          border-radius: 12px;
          padding: 14px 24px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .upload-btn:hover {
          background: #f1f5f9;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }
        
        .primary-btn {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 14px 28px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(249, 115, 22, 0.3);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .primary-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(249, 115, 22, 0.4);
        }
        
        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .section {
          margin-bottom: 40px;
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .section-title {
          font-size: 1.75rem;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        
        .stat-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
          text-align: center;
          transition: transform 0.2s;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
        }
        
        .stat-label {
          color: #64748b;
          font-weight: 500;
          font-size: 0.875rem;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }
        
        .totals-card, .filter-card, .table-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
        }
        
        .card-title {
          color: #0f172a;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 20px;
          margin-top: 0;
        }
        
        .totals-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }
        
        .total-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .total-item:last-child {
          border-bottom: none;
        }
        
        .total-label {
          color: #64748b;
          font-weight: 500;
        }
        
        .total-value {
          color: #0f172a;
          font-weight: 700;
          font-size: 1.125rem;
        }
        
        .filter-content {
          color: #0f172a;
        }
        
        .filter-label {
          display: block;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .filter-controls {
          display: flex;
          align-items: center;
          gap: 20px;
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
          appearance: none;
          width: 20px;
          height: 20px;
          background: #f97316;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .range-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #f97316;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
        
        .filter-value {
          font-weight: 700;
          color: #f97316;
          font-size: 1.125rem;
          min-width: 80px;
        }
        
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .table-wrapper {
          overflow-x: auto;
        }
        
        .modern-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        
        .modern-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
          padding: 16px 12px;
          text-align: left;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .modern-table th:first-child {
          border-top-left-radius: 12px;
        }
        
        .modern-table th:last-child {
          border-top-right-radius: 12px;
        }
        
        .modern-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        
        .modern-table tbody tr {
          transition: background-color 0.2s;
        }
        
        .modern-table tbody tr:hover {
          background: #f8fafc;
        }
        
        .account-cell {
          font-weight: 600;
          color: #0f172a;
        }
        
        .name-cell {
          font-weight: 500;
        }
        
        .amount-cell, .balance-cell {
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          font-weight: 500;
        }
        
        .balance-cell {
          font-weight: 600;
          color: #0f172a;
        }
        
        .contact-cell {
          color: #64748b;
          font-size: 0.875rem;
        }
        
        .error-msg {
          background: #fee2e2;
          color: #dc2626;
          padding: 16px 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-weight: 500;
          border: 1px solid #fca5a5;
          text-align: center;
        }
        
        .loading-msg {
          background: #dbeafe;
          color: #1d4ed8;
          padding: 16px 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-weight: 500;
          border: 1px solid #93c5fd;
          text-align: center;
        }
        
        .comm-btns {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .btn-email {
          background: #3b82f6 !important;
          border-color: #3b82f6 !important;
        }
        
        .btn-email:hover {
          background: #2563eb !important;
          border-color: #2563eb !important;
        }
        
        .btn-sms {
          background: #10b981 !important;
          border-color: #10b981 !important;
        }
        
        .btn-sms:hover {
          background: #059669 !important;
          border-color: #059669 !important;
        }
        .ageing-buckets {
          margin-top: 18px;
        }
        .ageing-controls {
          gap: 18px;
        }
        .ageing-checkbox {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
          color: #0f172a;
          background: #f8fafc;
          border-radius: 6px;
          padding: 4px 10px;
          margin-right: 8px;
        }
        .modern-table .disabled-row {
          opacity: 0.5;
          background: #f1f5f9;
        }
        .send-result {
          margin-top: 16px;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 600;
          text-align: center;
        }
        .send-result.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #10b981;
        }
        .send-result.error {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #ef4444;
        }
        .contact-filters {
          display: flex;
          gap: 24px;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        
        @media (max-width: 768px) {
          .title-section {
            flex-direction: column;
            gap: 16px;
          }
          
          .main-title {
            font-size: 2.5rem;
            text-align: center;
          }
          
          .subtitle {
            text-align: center;
          }
          
          .upload-section {
            flex-direction: column;
            align-items: center;
          }
          
          .upload-btn, .primary-btn {
            width: 100%;
            max-width: 300px;
            justify-content: center;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .totals-content {
            grid-template-columns: 1fr;
          }
          
          .filter-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .table-header {
            flex-direction: column;
            align-items: stretch;
          }
          
          .section-header {
            justify-content: center;
          }
          
          .container {
            padding: 20px 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
