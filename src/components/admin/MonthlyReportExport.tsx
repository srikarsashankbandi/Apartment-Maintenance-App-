import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../services/mockSupabase';
import { FileText, FileSpreadsheet, Download, Calendar, Check, AlertCircle, Eye, Printer, X } from 'lucide-react';

interface MonthlyReportExportProps {
  onClose?: () => void;
}

export const MonthlyReportExport: React.FC<MonthlyReportExportProps> = ({ onClose }) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const availableMonths = [
    { label: 'October 2026', value: '2026-10' },
    { label: 'September 2026', value: '2026-09' },
    { label: 'August 2026', value: '2026-08' },
    { label: 'July 2026', value: '2026-07' },
  ];

  const fetchReportData = async (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const startDate = `${year}-${month}-01`;
    // calculate end of month
    const endDate = `${year}-${month}-31`;

    const state = supabase.getState();
    const transactions = state.transactions.filter(t => {
      return t.created_at.startsWith(monthStr);
    }).map(t => {
      const user = state.users.find(u => u.id === t.user_id);
      const flat = state.flats.find(f => f.id === t.flat_id);
      return {
        ...t,
        user,
        flat,
      };
    });

    const dues = state.dues.filter(d => {
      return d.due_date.startsWith(monthStr);
    }).map(d => {
      const flat = state.flats.find(f => f.id === d.flat_id);
      return {
        ...d,
        flat,
      };
    });

    const totalIncome = transactions.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0);
    const pendingDues = dues.filter(d => d.status !== 'Paid').reduce((sum, d) => sum + d.amount, 0);
    const collectedDues = dues.filter(d => d.status === 'Paid').reduce((sum, d) => sum + d.amount, 0);

    return {
      monthStr,
      transactions,
      dues,
      totalIncome,
      totalExpenses,
      pendingDues,
      collectedDues,
      netCashflow: totalIncome - totalExpenses,
    };
  };

  const handleExportExcel = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const data = await fetchReportData(selectedMonth);

      // Sheet 1: Transactions
      const txRows = data.transactions.map(t => ({
        'Transaction ID': t.id,
        'Date': t.created_at.slice(0, 10),
        'Type': t.type,
        'Category': t.category,
        'Amount ($)': t.amount,
        'Payee / Resident': t.user?.name || 'Society General',
        'Flat': t.flat?.flat_number || '-',
        'Description': t.description,
      }));

      // Sheet 2: Dues
      const dueRows = data.dues.map(d => ({
        'Due ID': d.id,
        'Flat Number': d.flat?.flat_number || '-',
        'Amount ($)': d.amount,
        'Due Date': d.due_date,
        'Status': d.status,
        'Proof Uploaded': d.payment_proof_url ? 'Yes' : 'No',
        'Notes': d.notes || '',
      }));

      // Sheet 3: Financial Summary
      const summaryRows = [
        { 'Metric': 'Reporting Period', 'Value': selectedMonth },
        { 'Metric': 'Total Income (Credits)', 'Value': `$${data.totalIncome.toLocaleString()}` },
        { 'Metric': 'Total Maintenance Expenses (Debits)', 'Value': `$${data.totalExpenses.toLocaleString()}` },
        { 'Metric': 'Net Cash Flow', 'Value': `$${data.netCashflow.toLocaleString()}` },
        { 'Metric': 'Collected Dues (Paid)', 'Value': `$${data.collectedDues.toLocaleString()}` },
        { 'Metric': 'Outstanding Receivables', 'Value': `$${data.pendingDues.toLocaleString()}` },
        { 'Metric': 'Generated On', 'Value': new Date().toLocaleString() },
      ];

      const workbook = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(workbook, wsSummary, 'Summary');

      const wsTx = XLSX.utils.json_to_sheet(txRows);
      XLSX.utils.book_append_sheet(workbook, wsTx, 'Transactions');

      const wsDues = XLSX.utils.json_to_sheet(dueRows);
      XLSX.utils.book_append_sheet(workbook, wsDues, 'Dues Ledger');

      // Generate binary and trigger download
      const fileName = `Apartment_Report_${selectedMonth}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setFeedback(`Successfully exported ${fileName}`);
    } catch (err: any) {
      setFeedback(`Excel Export Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPdfPreview = async () => {
    setLoading(true);
    try {
      const data = await fetchReportData(selectedMonth);
      setPreviewData(data);
      setShowPdfPreview(true);
    } catch (err: any) {
      setFeedback(`Error preparing PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Monthly Financial Reports</h3>
            <p className="text-[11px] text-slate-400">Phase 6: PDF & XLSX Statement Exporter</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-3.5 space-y-3">
        {/* Month Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Select Billing Period:</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableMonths.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setSelectedMonth(m.value)}
                className={`py-2 px-2.5 rounded-xl text-xs font-medium border text-left transition-colors flex items-center justify-between ${
                  selectedMonth === m.value
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{m.label}</span>
                {selectedMonth === m.value && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>
            ))}
          </div>
        </div>

        {feedback && (
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleOpenPdfPreview}
            disabled={loading}
            className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-950/50"
          >
            <FileText className="w-4 h-4" />
            <span>Export / View PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      {/* PDF Printable Modal */}
      {showPdfPreview && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white text-slate-900 w-full max-w-2xl max-h-[92vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden print:m-0 print:p-0 print:w-full print:max-w-none">
            {/* Action Bar */}
            <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  PDF Statement: CivicNest Society ({previewData.monthStr})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPdf}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 font-sans print:p-8">
              {/* Header */}
              <div className="border-b-2 border-blue-600 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CivicNest Society</h1>
                  <p className="text-xs text-slate-500 font-medium">Apartment Owners Maintenance Association</p>
                  <p className="text-[11px] text-slate-400 mt-1">Reg #AOA/2026/9182 · Grandview Boulevard, Tower A-D</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                    MONTHLY AUDIT REPORT
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1.5">{previewData.monthStr}</p>
                  <p className="text-[10px] text-slate-400">Generated: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Financial Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                    Total Income
                  </span>
                  <p className="text-lg font-bold text-emerald-900 tabular-nums">
                    ${previewData.totalIncome.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-600">Maintenance & Fees</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider">
                    Total Expenses
                  </span>
                  <p className="text-lg font-bold text-rose-900 tabular-nums">
                    ${previewData.totalExpenses.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-rose-600">Operations & AMCs</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                    Net Cash Flow
                  </span>
                  <p
                    className={`text-lg font-bold tabular-nums ${
                      previewData.netCashflow >= 0 ? 'text-blue-900' : 'text-rose-900'
                    }`}
                  >
                    ${previewData.netCashflow.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-blue-600">
                    Outstanding: ${previewData.pendingDues.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Itemized Debits & Operational Outlays
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Payee / Description</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.transactions.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50/80">
                          <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                            {t.created_at.slice(5, 10)}
                          </td>
                          <td className="p-2.5 font-medium text-slate-900">{t.category}</td>
                          <td className="p-2.5 text-slate-600 max-w-xs truncate">{t.description}</td>
                          <td
                            className={`p-2.5 text-right font-mono font-semibold tabular-nums ${
                              t.type === 'Debit' ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {t.type === 'Debit' ? '-' : '+'}${t.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dues Status Summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Flat Maintenance Collection Ledger
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Flat</th>
                        <th className="p-2.5">Due Date</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.dues.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-slate-900">{d.flat?.flat_number}</td>
                          <td className="p-2.5 text-slate-500 font-mono text-[11px]">{d.due_date}</td>
                          <td className="p-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                d.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : d.status === 'Under Verification'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                            ${d.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Sign-off */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-[11px] text-slate-500">
                <div>
                  <p>Prepared by: Maintenance Administrative Office</p>
                  <p>Certified for Resident Audit & Review</p>
                </div>
                <div className="text-right">
                  <div className="w-32 border-b border-slate-400 mb-1" />
                  <p>President / Treasurer Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
