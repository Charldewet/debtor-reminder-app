# Frontend Implementation Checklist

Use this checklist to ensure all features are properly implemented in your consolidated web app.

## Core Features

### ✅ File Upload
- [ ] File input component (PDF only)
- [ ] Upload button with loading state
- [ ] Error handling and display
- [ ] Success feedback
- [ ] Medical aid account filtering on upload

### ✅ Data Display
- [ ] Summary statistics cards (all ageing buckets)
- [ ] Total outstanding display
- [ ] Total accounts count
- [ ] Data table with all columns
- [ ] Empty state handling

### ✅ Filtering System
- [ ] Balance filter slider (0-2000, step 10)
- [ ] Apply filter button
- [ ] Ageing bucket selection (checkboxes)
- [ ] Contact availability filters (mobile/email)
- [ ] Search functionality (acc_no, name, email, phone)
- [ ] Medical aid exclusion (always applied)

### ✅ Table Features
- [ ] Sortable columns (all columns)
- [ ] Sort direction indicators (arrows)
- [ ] Select all checkbox
- [ ] Individual row selection
- [ ] Selection counter display
- [ ] Responsive table layout

### ✅ Communication Features
- [ ] Send Email button
- [ ] Send SMS button
- [ ] Button disabled state (no selection)
- [ ] Selection count in button text
- [ ] Loading state during sending
- [ ] Success/error result display
- [ ] Dismissible alerts

### ✅ Export Features
- [ ] Export CSV button
- [ ] Export PDF (filtered table) button
- [ ] Export PDF (missing contacts) button
- [ ] File download handling

### ✅ UI/UX Features
- [ ] Collapsible sections (summary, filters, table)
- [ ] Loading indicators
- [ ] Error messages
- [ ] Success notifications
- [ ] Responsive design
- [ ] Accessibility (keyboard navigation, ARIA labels)

---

## State Management

### Required State Variables
- [ ] `file` - Selected PDF file
- [ ] `data` - Raw uploaded data
- [ ] `filtered` - Filtered data after balance filter
- [ ] `minBalance` - Minimum balance threshold
- [ ] `loading` - Upload/processing state
- [ ] `error` - Error messages
- [ ] `selectedRows` - Selected account numbers array
- [ ] `selectAll` - Select all checkbox state
- [ ] `ageingBuckets` - Selected ageing periods array
- [ ] `sending` - Communication sending state
- [ ] `sendResult` - Communication result object
- [ ] `filterMobile` - Filter by mobile availability
- [ ] `filterEmail` - Filter by email availability
- [ ] `searchTerm` - Search input value
- [ ] `sortColumn` - Current sort column
- [ ] `sortDirection` - Sort direction ('asc' or 'desc')
- [ ] `expandedSections` - Collapsible sections state

---

## Functions to Implement

### Core Functions
- [ ] `isMedicalAidControlAccount(row)` - Identify medical aid accounts
- [ ] `filterMedicalAidAccounts(dataArray)` - Filter out medical aid accounts
- [ ] `handleFileChange(e)` - Handle file selection
- [ ] `handleUpload()` - Upload and process PDF
- [ ] `handleFilter()` - Apply balance filter
- [ ] `handleSelectAll(e)` - Toggle select all
- [ ] `handleSelectRow(acc_no)` - Toggle individual selection
- [ ] `handleAgeingBucketChange(bucket)` - Toggle ageing bucket selection
- [ ] `handleSort(column)` - Sort table by column
- [ ] `handleSendEmail()` - Send emails to selected accounts
- [ ] `handleSendSMS()` - Send SMS to selected accounts
- [ ] `handleDownload()` - Download CSV
- [ ] `handleDownloadMissingContactsPDF()` - Download missing contacts PDF
- [ ] `handleDownloadFilteredTablePDF()` - Download filtered table PDF
- [ ] `toggleSection(section)` - Toggle section expand/collapse

### Computed Values
- [ ] `selectableRows` - Accounts available for selection
- [ ] `filteredForTable` - Filtered table data (with search, contact filters)
- [ ] `sortedTableData` - Sorted table data
- [ ] `totalOutstanding` - Sum of all balances
- [ ] `totalAccounts` - Count of accounts
- [ ] `selectedCount` - Count of selected accounts

---

## API Integration

### Endpoints to Integrate
- [ ] `POST /upload` - File upload
- [ ] `POST /download` - CSV download
- [ ] `POST /download_missing_contacts_pdf` - Missing contacts PDF
- [ ] `POST /download_filtered_table_pdf` - Filtered table PDF
- [ ] `POST /send_email` - Send emails
- [ ] `POST /send_sms` - Send SMS

### API Configuration
- [ ] Set API base URL (environment variable)
- [ ] Handle CORS properly
- [ ] Implement error handling for all endpoints
- [ ] Handle loading states
- [ ] Parse and display API responses

---

## Data Processing

### Filter Chain (Order Matters!)
1. [ ] Medical aid exclusion (always first)
2. [ ] Balance filter (60+ day arrears)
3. [ ] Ageing bucket selection
4. [ ] Contact availability filters
5. [ ] Search term matching
6. [ ] Sorting (final step)

### Calculations
- [ ] Ageing bucket sums (for statistics)
- [ ] Total outstanding (sum of balances)
- [ ] Account counts
- [ ] Selection counts

---

## Medical Aid Account Filtering

### Patterns to Match
- [ ] "MEDAID CONTROL ACC"
- [ ] "MEDICAL AID CONTROL"
- [ ] "MEDICAL AID CONTROL ACCOUNT"
- [ ] "MED AID CONTROL"
- [ ] "MEDAID CONTROL"
- [ ] "MEDICAL AID ACC"

### Application Points
- [ ] On upload (primary filter)
- [ ] In balance filter
- [ ] In table display filter
- [ ] In selection logic
- [ ] In statistics calculations

---

## Testing Checklist

### Functional Tests
- [ ] Upload valid PDF → data displays correctly
- [ ] Upload invalid file → error shown
- [ ] Balance filter → correct accounts shown
- [ ] Ageing bucket selection → table updates
- [ ] Search → filters table correctly
- [ ] Sort → table sorts correctly
- [ ] Select all → all accounts selected
- [ ] Individual selection → updates correctly
- [ ] Send email → success/error handled
- [ ] Send SMS → success/error handled
- [ ] Download CSV → file downloads
- [ ] Download PDF → file downloads

### Edge Cases
- [ ] Empty data set
- [ ] No accounts match filters
- [ ] No email/phone for accounts
- [ ] Medical aid accounts excluded
- [ ] Large data sets (performance)
- [ ] Network errors
- [ ] API errors

---

## Performance Considerations

- [ ] Debounce search input (300ms)
- [ ] Memoize expensive calculations
- [ ] Virtual scrolling for large tables (if needed)
- [ ] Lazy loading for PDF generation
- [ ] Optimize re-renders

---

## Accessibility

- [ ] Keyboard navigation
- [ ] ARIA labels on interactive elements
- [ ] Focus management
- [ ] Screen reader support
- [ ] Color contrast compliance

---

## Integration Notes

### Styling
- Use your existing design system
- Maintain consistent spacing and typography
- Follow your color palette
- Use your component library if available

### State Management
- Integrate with your existing state management solution
- Map state variables to your store structure
- Keep function logic but adapt to your patterns

### Component Structure
- Break into smaller components as needed
- Follow your component architecture
- Use your routing if needed
- Integrate with your authentication system

---

## Documentation

- [ ] API integration documented
- [ ] Component props documented
- [ ] State management documented
- [ ] Data flow documented
- [ ] Error handling documented

---

**Note:** This checklist covers all features from the reference implementation. Adapt as needed for your specific architecture and requirements.

