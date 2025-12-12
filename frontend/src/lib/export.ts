/**
 * Export utilities for CSV and Excel
 */

/**
 * Convert data to CSV format and download
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // If no columns specified, use all keys from first object
  const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key }));

  // Create CSV header
  const headers = cols.map(col => `"${col.label}"`).join(',');

  // Create CSV rows
  const rows = data.map(row =>
    cols
      .map(col => {
        const value = row[col.key];
        // Handle null/undefined
        if (value === null || value === undefined) return '""';
        // Handle objects/arrays
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        // Handle strings with commas or quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return `"${stringValue}"`;
      })
      .join(',')
  );

  // Combine header and rows
  const csv = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Convert data to Excel format (CSV with .xlsx extension for compatibility)
 * For true .xlsx support, use a library like xlsx or exceljs
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  // For now, use CSV format with .xlsx extension
  // In production, integrate xlsx library for proper Excel format
  exportToCSV(data, filename.replace(/\.xlsx$/, ''), columns);
}

/**
 * Helper function to download a blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Export employee data with formatted columns
 */
export function exportEmployees(employees: any[], format: 'csv' | 'excel' = 'csv') {
  const columns = [
    { key: 'employeeNumber', label: 'Employee Number' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'workEmail', label: 'Email' },
    { key: 'status', label: 'Status' },
    { key: 'departmentName', label: 'Department' },
    { key: 'positionTitle', label: 'Position' },
    { key: 'dateOfHire', label: 'Date of Hire' },
  ];

  const filename = `employees_${new Date().toISOString().split('T')[0]}`;

  if (format === 'excel') {
    exportToExcel(employees, filename, columns);
  } else {
    exportToCSV(employees, filename, columns);
  }
}
