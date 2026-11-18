import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { readResumeText, suggestResumeTopics } from "@/lib/pilotResume";

export default function PilotResumePrep({ topics, selected, onSelect, onBusyChange }) {
  const [matches, setMatches] = useState(null);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  const identify = (text) => {
    setMatches(suggestResumeTopics(text, topics));
    onSelect([]);
    setPaste("");
  };
  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true);
    onBusyChange(true);
    setError("");
    setMatches(null);
    onSelect([]);
    try {
      identify(await readResumeText(file));
    } catch (error) {
      setError(error.message || "The résumé could not be read. Paste the relevant lines below.");
    } finally {
      setReading(false);
      onBusyChange(false);
    }
  };
  const toggle = (id) => onSelect(selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]);

  return (
    <div className="my-4 rounded-lg border border-gray-800 bg-black/25 p-4">
      <h3 className="font-semibold">Optional résumé-guided follow-ups</h3>
      <p className="mt-1 text-sm text-gray-300">Choose up to two relevant skills the candidate claims. Use the prompts during live roleplay. The core exercise and scores are the same for both candidates.</p>
      <label className="mt-3 block text-sm font-medium">
        Résumé file
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          className="mt-2 block w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-gray-100"
          disabled={reading}
          onChange={onFile}
        />
      </label>
      <p className="mt-2 text-xs text-gray-400">PDF, DOCX, or TXT · Up to 5 MB · The file and extracted text stay in this browser. The attempt saves only the selected topics.</p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer">Paste relevant résumé lines</summary>
        <Textarea aria-label="Résumé excerpts" value={paste} onChange={(event) => { setPaste(event.target.value); setError(""); }}
          maxLength={18000} className="mt-2 min-h-20 border-gray-700 bg-black/30 text-gray-100" placeholder="Paste skills or experience relevant to Level 1 Technical Support." />
        <Button type="button" variant="outline" className="mt-2 border-gray-700" disabled={reading || !paste.trim()} onClick={() => identify(paste)}>Find relevant topics</Button>
      </details>
      {reading && <p className="mt-3 text-sm" role="status">Reading the résumé locally…</p>}
      {error && <p className="mt-3 text-sm text-red-200" role="alert">{error}</p>}
      {matches?.length === 0 && <p className="mt-3 text-sm text-gray-300">No supported Technical Support topics matched. You can continue with the core exercise.</p>}
      {matches && matches.length > 0 && (
        <fieldset className="mt-3 space-y-2">
          <legend className="mb-2 text-sm font-semibold">Confirm topics that reflect the candidate’s experience</legend>
          {matches.map((topic) => (
            <label key={topic.id} className="flex gap-3 rounded-md border border-gray-800 p-3 text-sm">
              <input type="checkbox" className="mt-1" checked={selected.includes(topic.id)} disabled={selected.length === 2 && !selected.includes(topic.id)} onChange={() => toggle(topic.id)} />
              <span><strong>{topic.title}</strong><span className="block text-gray-300">{topic.prompt}</span>
                <span className="text-xs text-gray-400">{topic.statementIds.join(" · ")}</span></span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
