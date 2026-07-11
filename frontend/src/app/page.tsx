"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileUpload } from "@/components/ui/file-upload";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { AlertCircle, ArrowLeft, CheckCircle2, AlertTriangle, Users, RefreshCw, Loader2, Download, Sun, Moon, Maximize2, Minimize2 } from "lucide-react";
import { useCsvParser } from "@/hooks/useCsvParser";
import { useImport } from "@/hooks/useImport";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";
import { cn, formatFileSize, formatStatusLabel, formatSourceLabel, getStatusBadgeVariant, formatSkippedReason, formatDate } from "@/lib/utils";
import type { CrmRecord, SkippedRecord } from "@groweasy/shared";
import type { ImportStep } from "@/types";


function StepIndicator({ step }: { step: ImportStep }) {
  const steps: { key: ImportStep; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "preview", label: "Preview" },
    { key: "processing", label: "Processing" },
    { key: "results", label: "Results" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-300",
              i < currentIdx && "bg-white text-black",
              i === currentIdx && "bg-white text-black ring-2 ring-white/20 ring-offset-2 ring-offset-black",
              i > currentIdx && "bg-white/5 text-white/30 border border-white/10",
            )}
          >
            {i < currentIdx ? "✓" : i + 1}
          </div>
          <span
            className={cn(
              "hidden text-xs font-medium sm:block transition-colors",
              i <= currentIdx ? "text-white/80" : "text-white/25",
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={cn("h-px w-6 transition-colors", i < currentIdx ? "bg-white/40" : "bg-white/10")} />
          )}
        </div>
      ))}
    </div>
  );
}


function StatusBadge({ status }: { status: string }) {
  const variant = getStatusBadgeVariant(status);
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    neutral: "bg-white/5 text-white/40 border-white/10",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", colors[variant])}>
      {formatStatusLabel(status)}
    </span>
  );
}


function ConfidenceDot({ confidence }: { confidence?: number }) {
  if (confidence === undefined || confidence >= 0.8) return null;
  const isMedium = confidence >= 0.5;
  return (
    <span
      className={cn(
        "ml-1.5 inline-block h-1.5 w-1.5 rounded-full cursor-help",
        isMedium ? "bg-amber-400" : "bg-red-400",
      )}
      title={isMedium ? "Low confidence — review recommended" : "Very low confidence — review required"}
    />
  );
}


function PreviewTable({
  headers,
  data,
  onVisibleCountChange,
}: {
  headers: string[];
  data: Record<string, string>[];
  onVisibleCountChange?: (count: number) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const preview = data.slice(0, visibleCount);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 150 && visibleCount < data.length) {
      const nextCount = Math.min(data.length, visibleCount + 30);
      setVisibleCount(nextCount);
      onVisibleCountChange?.(nextCount);
    }
  };

  const renderTableContent = (inFullscreen: boolean) => (
    <div
      onScroll={handleScroll}
      className={cn(
        "scrollbar-thin overflow-auto rounded-lg border border-white/[0.08] bg-white/[0.02]",
        inFullscreen ? "max-h-[calc(100vh-140px)] flex-1" : "max-h-[420px]"
      )}
    >
      <table className="w-full min-w-max border-collapse text-left">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 whitespace-nowrap bg-white/[0.06] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/50 backdrop-blur-md">
              #
            </th>
            {headers.map((h) => (
              <th key={h} className="sticky top-0 z-10 whitespace-nowrap bg-white/[0.06] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/50 backdrop-blur-md">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.map((row, i) => (
            <tr key={i} className={cn("border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]", i % 2 === 1 && "bg-white/[0.01]")}>
              <td className="whitespace-nowrap px-4 py-2.5 text-xs text-white/30 font-mono">{i + 1}</td>
              {headers.map((h) => (
                <td key={h} className="max-w-[280px] truncate whitespace-nowrap px-4 py-2.5 text-sm text-white/80" title={row[h]}>
                  {row[h] || <span className="text-white/20">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-white/40">
          Showing <span className="font-medium text-white/80">{preview.length.toLocaleString()}</span> of{" "}
          <span className="font-medium text-white/80">{data.length.toLocaleString()}</span> rows
          {preview.length < data.length ? (
            <span className="text-white/25"> — Scroll table down to load more automatically</span>
          ) : (
            <span className="text-white/25"> — All rows loaded</span>
          )}
        </p>
        <button
          onClick={() => setIsFullscreen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
          title="Fullscreen Table View"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
        </button>
      </div>

      {renderTableContent(false)}

      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fullscreen-modal fixed inset-0 z-50 flex flex-col backdrop-blur-2xl p-4 md:p-8 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Data Preview — Fullscreen View</h3>
                <p className="text-xs text-white/50">
                  Showing {preview.length.toLocaleString()} of {data.length.toLocaleString()} rows · {headers.length} columns
                </p>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-all"
              >
                <Minimize2 className="h-4 w-4" /> Minimize (Esc)
              </button>
            </div>
            {renderTableContent(true)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultsTable({ records }: { records: CrmRecord[] }) {
  const [visibleCount, setVisibleCount] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const visibleRecords = records.slice(0, visibleCount);
  const columns = [
    "Name",
    "Email",
    "Country Code",
    "Mobile Number",
    "Company",
    "City",
    "State",
    "Country",
    "Lead Owner",
    "CRM Status",
    "CRM Note",
    "Data Source",
    "Created At",
    "Possession Time",
    "Description",
  ];

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 150 && visibleCount < records.length) {
      setVisibleCount((prev) => Math.min(records.length, prev + 30));
    }
  };

  const renderTableContent = (inFullscreen: boolean) => (
    <div
      onScroll={handleScroll}
      className={cn(
        "scrollbar-thin overflow-auto rounded-lg border border-white/[0.06] bg-white/[0.02]",
        inFullscreen ? "max-h-[calc(100vh-140px)] flex-1" : "max-h-[400px]"
      )}
    >
      <table className="w-full min-w-max border-collapse text-left">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} className="sticky top-0 z-10 whitespace-nowrap bg-white/[0.04] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/40 backdrop-blur-sm">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRecords.map((r, i) => (
            <tr key={`${r.email}-${i}`} className={cn("border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]", i % 2 === 1 && "bg-white/[0.01]")}>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-white/90">
                {r.name || "—"}<ConfidenceDot confidence={r.confidence} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/60">{r.email || "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/60">{r.country_code || "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/60">{r.mobile_without_country_code || "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/60">{r.company || "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/60">{r.city || "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/60">{r.state || "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/60">{r.country || "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/60">{r.lead_owner || "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm">
                {r.crm_status ? <StatusBadge status={r.crm_status} /> : <span className="text-white/20">—</span>}
              </td>
              <td className="max-w-[200px] truncate px-4 py-2.5 text-sm text-white/60" title={r.crm_note}>{r.crm_note || "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/60">{formatSourceLabel(r.data_source)}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/60">{formatDate(r.created_at)}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/60">{r.possession_time || "—"}</td>
              <td className="max-w-[200px] truncate px-4 py-2.5 text-sm text-white/60" title={r.description}>{r.description || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-white/40">
          Showing <span className="font-medium text-white/80">{visibleRecords.length.toLocaleString()}</span> of{" "}
          <span className="font-medium text-white/80">{records.length.toLocaleString()}</span> records
          {visibleRecords.length < records.length ? (
            <span className="text-white/25"> — Scroll table down to load more automatically</span>
          ) : (
            <span className="text-white/25"> — All records loaded</span>
          )}
        </p>
        <button
          onClick={() => setIsFullscreen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
          title="Fullscreen Table View"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
        </button>
      </div>

      {renderTableContent(false)}

      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fullscreen-modal fixed inset-0 z-50 flex flex-col backdrop-blur-2xl p-4 md:p-8 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Imported Records — Fullscreen View</h3>
                <p className="text-xs text-white/50">
                  Showing {visibleRecords.length.toLocaleString()} of {records.length.toLocaleString()} records
                </p>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-all"
              >
                <Minimize2 className="h-4 w-4" /> Minimize (Esc)
              </button>
            </div>
            {renderTableContent(true)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function SkippedTable({ records }: { records: SkippedRecord[] }) {
  return (
    <div className="scrollbar-thin max-h-[300px] overflow-auto rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <table className="w-full min-w-max border-collapse text-left">
        <thead>
          <tr>
            {["Row", "Reason", "Original Data"].map((col) => (
              <th key={col} className="sticky top-0 z-10 whitespace-nowrap bg-white/[0.04] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/40 backdrop-blur-sm">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={r.index} className={cn("border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]", i % 2 === 1 && "bg-white/[0.01]")}>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-white/40 font-mono">#{r.index + 1}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-sm text-amber-400/80">{formatSkippedReason(r.reason)}</td>
              <td className="max-w-md truncate px-4 py-2.5 text-sm text-white/40">
                {Object.entries(r.original_data).map(([k, v]) => `${k}: ${v}`).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof CheckCircle2; color: string }) {
  return (
    <div className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/35">{label}</span>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", color)}>{value.toLocaleString()}</p>
    </div>
  );
}


function downloadCsv(records: CrmRecord[]) {
  const headers = ["created_at","name","email","country_code","mobile_without_country_code","company","city","state","country","lead_owner","crm_status","crm_note","data_source","possession_time","description"];
  const rows = records.map((r) =>
    headers.map((h) => {
      const val = String((r as unknown as Record<string, unknown>)[h] ?? "");
      return val.includes(",") || val.includes('"') || val.includes("\n") ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "groweasy-import.csv";
  a.click();
  URL.revokeObjectURL(url);
}


export default function Home(): React.JSX.Element {
  const [step, setStep] = useState<ImportStep>("upload");
  const [resultsTab, setResultsTab] = useState<"imported" | "skipped">("imported");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const csvParser = useCsvParser();
  const importJob = useImport();
  const { toasts, showToast, dismissToast } = useToast();
  const wasProcessing = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("groweasy_theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.remove("light");
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("groweasy_theme", next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (csvParser.data.length > 0 && step === "upload") {
      setStep("preview");
    }
  }, [csvParser.data, step]);

  useEffect(() => {
    if (importJob.result && step === "processing") {
      if (importJob.result.stats.imported === 0) {
        showToast({
          type: "error",
          title: "Import failed",
          description: "0 records imported. Please retry or upload another file.",
        });
        wasProcessing.current = false;
        return;
      }

      setStep("results");
      showToast({
        type: importJob.result.stats.skipped > 0 ? "warning" : "success",
        title: "Import complete",
        description: `${importJob.result.stats.imported} imported, ${importJob.result.stats.skipped} skipped.`,
      });
      wasProcessing.current = false;
    }
    if (importJob.error && step === "processing" && !wasProcessing.current) {
      wasProcessing.current = true;
    }
  }, [importJob.result, importJob.error, step]);

  const handleFileUpload = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (file) csvParser.parse(file);
    },
    [csvParser],
  );

  const handleConfirm = useCallback(async () => {
    setStep("processing");
    wasProcessing.current = false;
    await importJob.startImport(csvParser.headers, csvParser.data, csvParser.fileName);
  }, [importJob, csvParser]);

  const handleRetry = useCallback(async () => {
    wasProcessing.current = false;
    await importJob.startImport(csvParser.headers, csvParser.data, csvParser.fileName);
  }, [importJob, csvParser]);

  const handleReset = useCallback(() => {
    csvParser.reset();
    importJob.reset();
    setStep("upload");
    setResultsTab("imported");
  }, [csvParser, importJob]);

  return (
    <div className="relative min-h-screen">

      {step === "upload" && (
        <div className="fixed inset-0 -z-10 mask-radial-fade opacity-40">
          <BackgroundRippleEffect rows={10} cols={30} cellSize={52} />
        </div>
      )}


      <div className="relative mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-16">


        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-14 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              GrowEasy
              <span className="ml-3 text-base font-normal text-white/40">CSV Importer</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <StepIndicator step={step} />
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white active:scale-95 shadow-sm"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />

                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-slate-700" />

                </>
              )}
            </button>
          </div>
        </motion.header>


        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8 py-4"
            >
              <div className="text-center mb-10">
                <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
                  Import your leads
                </h2>
                <p className="mt-4 text-base sm:text-xl text-white/50 max-w-xl mx-auto leading-relaxed">
                  Upload any CSV file — Facebook exports, Google Ads, CRM dumps, spreadsheets.
                  AI will map your columns automatically.
                </p>
              </div>

              <div className="w-full max-w-4xl mx-auto rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015]">
                <FileUpload onChange={handleFileUpload} />
              </div>

              {csvParser.error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto max-w-4xl flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-base text-red-400"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span>{csvParser.error}</span>
                </motion.div>
              )}

              <p className="text-center text-sm text-white/30">Supports .csv files up to 10 MB</p>
            </motion.div>
          )}


          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06]">
                    <svg className="h-4 w-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80">{csvParser.fileName}</p>
                    <p className="text-xs text-white/30">
                      {formatFileSize(csvParser.fileSize)} · {csvParser.totalRows.toLocaleString()} rows · {csvParser.headers.length} columns
                    </p>
                  </div>
                </div>
                <button onClick={handleReset} className="text-xs font-medium text-white/40 hover:text-white/70 transition-colors">
                  Change file
                </button>
              </div>

              <PreviewTable headers={csvParser.headers} data={csvParser.data} />

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <button
                  onClick={handleConfirm}
                  className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  Confirm Import
                </button>
              </div>
            </motion.div>
          )}


          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center gap-6 py-24"
            >
              {importJob.error || (importJob.result && importJob.result.stats.imported === 0) ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-medium text-white/90">Import Failed</p>
                    <p className="mt-1.5 max-w-md text-sm text-white/50">
                      {importJob.error
                        ? importJob.error
                        : formatSkippedReason(
                            importJob.result?.skipped?.[0]?.reason ||
                              "AI processing capacity reached or format unsupported (0 records imported).",
                          )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:bg-white/90 active:scale-[0.98]"
                    >
                      <RefreshCw className="h-4 w-4" /> Retry Import
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white active:scale-[0.98]"
                    >
                      Upload Another CSV
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="spinner-ring h-12 w-12 rounded-full border-2 animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-medium text-white/90">Processing your data</p>
                    <p className="mt-1 text-sm text-white/60">
                      {importJob.progress.message || "AI is mapping your columns to CRM fields"}
                    </p>
                  </div>

                  <div className="w-full max-w-xs space-y-2">
                    <div className="progress-track h-2 w-full overflow-hidden rounded-full">
                      <motion.div
                        className="progress-bar-fill h-full rounded-full"
                        initial={{ width: "0%" }}
                        animate={{
                          width: importJob.progress.totalBatches > 0
                            ? `${Math.min(100, Math.round((importJob.progress.currentBatch / importJob.progress.totalBatches) * 100))}%`
                            : "15%",
                        }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-center text-xs text-white/60 font-mono">
                      {importJob.progress.totalBatches > 0
                        ? `Batch ${importJob.progress.currentBatch} of ${importJob.progress.totalBatches} (${importJob.progress.processedRecords}/${importJob.progress.totalRecords} records)`
                        : "Starting AI extraction…"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      importJob.reset();
                      setStep("preview");
                    }}
                    className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Stop & Return to Preview
                  </button>
                </>
              )}
            </motion.div>
          )}


          {step === "results" && importJob.result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >

              <div className="flex flex-col gap-3 sm:flex-row">
                <StatCard label="Imported" value={importJob.result.stats.imported} icon={CheckCircle2} color="text-emerald-400" />
                <StatCard label="Skipped" value={importJob.result.stats.skipped} icon={AlertTriangle} color="text-amber-400" />
                <StatCard label="Total" value={importJob.result.stats.total} icon={Users} color="text-white/70" />
              </div>


              <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                <button
                  onClick={() => setResultsTab("imported")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                    resultsTab === "imported" ? "bg-white text-black" : "text-white/40 hover:text-white/60",
                  )}
                >
                  Imported ({importJob.result.stats.imported})
                </button>
                <button
                  onClick={() => setResultsTab("skipped")}
                  disabled={importJob.result.stats.skipped === 0}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all disabled:opacity-30",
                    resultsTab === "skipped" ? "bg-white text-black" : "text-white/40 hover:text-white/60",
                  )}
                >
                  Skipped ({importJob.result.stats.skipped})
                </button>
              </div>


              {resultsTab === "imported" ? (
                importJob.result.imported.length > 0 ? (
                  <ResultsTable records={importJob.result.imported} />
                ) : (
                  <p className="rounded-lg border border-dashed border-white/[0.08] p-8 text-center text-sm text-white/30">
                    All records were skipped. Check the &quot;Skipped&quot; tab.
                  </p>
                )
              ) : (
                <SkippedTable records={importJob.result.skipped} />
              )}


              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Import another
                </button>
                <button
                  onClick={() => downloadCsv(importJob.result!.imported)}
                  className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
