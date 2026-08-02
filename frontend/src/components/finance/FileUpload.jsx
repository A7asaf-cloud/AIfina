import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useUpload, useAnalyze } from "../../hooks/useFinanceData";

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [batchId, setBatchId] = useState(null);

  const upload = useUpload();
  const analyze = useAnalyze();

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    maxFiles: 1,
  });

  async function handleUpload() {
    if (!file) return;
    const res = await upload.mutateAsync(file);
    setBatchId(res.batch_id);
  }

  async function handleAnalyze() {
    if (!batchId) return;
    await analyze.mutateAsync(batchId);
  }

  const isUploading = upload.isPending;
  const isAnalyzing = analyze.isPending;

  return (
    <div className="max-w-xl mx-auto mt-8 space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 bg-white"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">📁</div>
        <p className="text-gray-600 font-medium">
          {isDragActive ? "שחרר את הקובץ כאן..." : "גרור קובץ CSV או Excel לכאן, או לחץ לבחירה"}
        </p>
        <p className="text-xs text-gray-400 mt-2">קבצי .csv ו-.xlsx בלבד · מקסימום 5MB</p>
      </div>

      {file && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-800">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {isUploading ? "מעלה..." : "העלה קובץ"}
          </button>
        </div>
      )}

      {isUploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse w-2/3" />
        </div>
      )}

      {batchId && !isUploading && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-medium mb-3">✓ הקובץ הועלה בהצלחה</p>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {isAnalyzing ? "⏳ מנתח עם AI..." : "🤖 הפעל ניתוח AI"}
          </button>
          {isAnalyzing && (
            <p className="text-xs text-gray-500 mt-2">הניתוח עשוי לקחת כדקה...</p>
          )}
        </div>
      )}
    </div>
  );
}
