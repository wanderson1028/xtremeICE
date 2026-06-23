import React, { useState } from "react";
import { Download, Loader2, AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { downloadText } from "./exportUtils";

export default function ExportArtifact({ title, icon: Icon, generate, template, filename }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const run = async () => {
    setLoading(true); setError(null); setContent("");
    try {
      const result = await generate(template);
      setContent(result);
      setHasGenerated(true);
    } catch (err) {
      setError(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
          <h4 className="text-white text-sm font-medium">{title}</h4>
        </div>
        <div className="flex items-center gap-1">
          {!hasGenerated && !loading && (
            <Button size="sm" variant="outline" className="text-gray-300 hover:text-white h-7"
              onClick={run}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate
            </Button>
          )}
          {hasGenerated && (
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white h-7"
              onClick={run} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
            </Button>
          )}
          {content && (
            <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white h-7"
              onClick={() => downloadText(filename, content)}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download
            </Button>
          )}
        </div>
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating...
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm py-4">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {content && (
        <div className="max-h-96 overflow-y-auto text-sm text-gray-300 space-y-2
          [&_h1]:text-white [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1
          [&_h2]:text-gray-100 [&_h2]:text-sm [&_h2]:font-medium [&_h2]:mt-3 [&_h2]:mb-1
          [&_h3]:text-gray-200 [&_h3]:font-medium [&_h3]:mt-2
          [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-1
          [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-1
          [&_li]:my-0.5
          [&_code]:text-green-400 [&_code]:bg-gray-900 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs
          [&_pre]:bg-gray-900 [&_pre]:p-2 [&_pre]:rounded [&_pre]:my-2
          [&_table]:w-full [&_table]:my-2
          [&_th]:text-gray-200 [&_th]:border [&_th]:border-gray-700 [&_th]:p-1.5 [&_th]:text-left
          [&_td]:border [&_td]:border-gray-700 [&_td]:p-1.5
          [&_hr]:border-gray-700 [&_hr]:my-3
          [&_a]:text-blue-400 [&_a]:underline
          [&_strong]:text-gray-100">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}