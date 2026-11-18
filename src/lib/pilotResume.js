const maxBytes = 5 * 1024 * 1024;
const maxCharacters = 100_000;

async function readPdf(file) {
  const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }] = await Promise.all([
    import("pdfjs-dist/build/pdf.mjs"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = workerUrl;
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
  try {
    const document = await task.promise;
    if (document.numPages > 15) throw new Error("Use a résumé of 15 pages or fewer.");
    const pages = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str || "").join(" "));
    }
    return pages.join("\n");
  } finally {
    await task.destroy();
  }
}

async function readDocx(file) {
  const { default: JSZip } = await import("jszip");
  const archive = await JSZip.loadAsync(await file.arrayBuffer());
  const part = archive.file("word/document.xml");
  if (!part) throw new Error("This file has no Word document text.");
  const xml = await part.async("string");
  if (xml.length > 2_000_000) throw new Error("Use a shorter résumé.");
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new Error("This Word file could not be read.");
  return Array.from(document.getElementsByTagNameNS("*", "p"), (paragraph) => paragraph.textContent).join("\n");
}

export async function readResumeText(file) {
  if (file.size > maxBytes) throw new Error("Choose a file up to 5 MB.");
  const extension = file.name.split(".").pop().toLowerCase();
  const readers = { pdf: readPdf, docx: readDocx, txt: (document) => document.text() };
  const read = Object.hasOwn(readers, extension) ? readers[extension] : null;
  if (!read) throw new Error("Choose a PDF, DOCX, or TXT file.");
  const text = (await read(file)).trim().slice(0, maxCharacters);
  if (!text) throw new Error("No text was found in the file. Paste the relevant résumé lines below.");
  return text;
}

const normalize = (text) => " " + text.toLowerCase().replace(/[^a-z0-9/]+/g, " ").trim() + " ";

export function suggestResumeTopics(text, topics) {
  const document = normalize(text.slice(0, maxCharacters));
  return topics.filter((topic) => topic.matches.some((term) => document.includes(normalize(term))));
}
