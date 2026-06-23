import React, { useState, useEffect } from "react";
import { X, Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { downloadText } from "./exportUtils";

export default function ArtifactPreviewModal({ title, icon: Icon, generate, template, filename, onClose }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await generate(template);
        if (!cancelled) { setContent(result); setLoading(false); }
      } catch (err) {
        if (!cancelled) { setError(err.message || "Generation failed"); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-gray-400" />}
            <h3 className="text-white font-semibold">{title} — Preview</h3>
          </div>
          <div className="flex items-center gap-2">
            {content && (
              <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white h-8"
                onClick={() => downloadText(filename, content)}>
                <Download className="h-3.5 w-3.5 mr-1" /> Download
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="overflow-y-auto p-5 flex-1">
          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" /> Generating preview...
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm py-8 justify-center">
              <AlertCircle className="h-5 w-5" /> {error}
            </div>
          )}
          {content && (
            <div className="text-sm text-gray-300 space-y-2
              [&_h1]:text-white [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2
              [&_h2]:text-gray-100 [&_h2]:text-base [&_h2]:font-medium [&_h2]:mt-4 [&_h2]:mb-1
              [&_h3]:text-gray-200 [&_h3]:font-medium [&_h3]:mt-3
              [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2
              [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-2
              [&_li]:my-1
              [&_code]:text-green-400 [&_code]:bg-gray-900 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs
              [&_pre]:bg-gray-900 [&_pre]:p-3 [&_pre]:rounded [&_pre]:my-3
              [&_table]:w-full [&_table]:my-3
              [&_th]:text-gray-200 [&_th]:border [&_th]:border-gray-700 [&_th]:p-2 [&_th]:text-left
              [&_td]:border [&_td]:border-gray-700 [&_td]:p-2
              [&_hr]:border-gray-700 [&_hr]:my-4
              [&_a]:text-blue-400 [&_a]:underline
              [&_strong]:text-gray-100">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-800 flex justify-end flex-shrink-0">
          <Button onClick={onClose} className="bg-red-700 hover:bg-red-600 text-white">Close</Button>
        </div>
      </div>
    </div>
  );
}