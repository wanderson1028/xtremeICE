import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

const W = 612;
const H = 792;
const M = 48;
const CW = W - M * 2;

const BLACK = rgb(0.06, 0.06, 0.07);
const MUTED = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.88, 0.9, 0.93);
const TEAL = rgb(0, 0.843, 0.773);
const GREEN = rgb(0.086, 0.639, 0.29);
const AMBER = rgb(0.79, 0.54, 0.02);
const RED = rgb(0.86, 0.15, 0.15);
const SURFACE = rgb(0.966, 0.972, 0.98);

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_hire: 'Strong Hire',
  hire: 'Hire',
  borderline: 'Borderline',
  no_hire: 'No Hire',
};

// Standard PDF fonts only support WinAnsi: normalise punctuation and drop anything else.
const clean = (value: any) =>
  String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00b7\u2022]/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tone = (pct: number) => (pct >= 80 ? GREEN : pct >= 60 ? AMBER : RED);

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
};

export async function buildReportPdfBase64(data: any): Promise<string> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pages: any[] = [];
  let page: any = null;
  let y = 0;

  const wrap = (text: any, size: number, maxWidth: number, useBold = false) => {
    const face = useBold ? bold : font;
    const words = clean(text).split(' ').filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (face.widthOfTextAtSize(next, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  };

  const fit = (text: any, size: number, maxWidth: number, useBold = false) => {
    const face = useBold ? bold : font;
    let value = clean(text);
    if (face.widthOfTextAtSize(value, size) <= maxWidth) return value;
    while (value.length > 1 && face.widthOfTextAtSize(`${value}...`, size) > maxWidth) {
      value = value.slice(0, -1);
    }
    return `${value}...`;
  };

  const startPage = (first: boolean) => {
    page = pdf.addPage([W, H]);
    pages.push(page);
    if (first) {
      page.drawRectangle({ x: 0, y: H - 92, width: W, height: 92, color: TEAL });
      page.drawText('XTREME I.C.E.', { x: M, y: H - 50, size: 17, font: bold, color: BLACK });
      page.drawText('CANDIDATE ASSESSMENT REPORT', { x: M, y: H - 70, size: 9, font: bold, color: BLACK });
      y = H - 92 - 34;
    } else {
      page.drawRectangle({ x: 0, y: H - 28, width: W, height: 28, color: TEAL });
      page.drawText('XTREME I.C.E.  -  Candidate Assessment Report (continued)', {
        x: M,
        y: H - 19,
        size: 8.5,
        font: bold,
        color: BLACK,
      });
      y = H - 28 - 30;
    }
  };

  const space = (needed: number) => {
    if (y - needed < 76) startPage(false);
  };

  const paragraph = (text: any, opts: { size?: number; useBold?: boolean; color?: any; width?: number; gap?: number; indent?: number } = {}) => {
    const size = opts.size ?? 10.5;
    const face = opts.useBold ? bold : font;
    const color = opts.color ?? BLACK;
    const width = opts.width ?? CW;
    const indent = opts.indent ?? 0;
    const lines = wrap(text, size, width, opts.useBold);
    const leading = size * 1.42;
    space(lines.length * leading + 4);
    lines.forEach((line, index) => {
      page.drawText(line, { x: M + indent, y: y - size - index * leading, size, font: face, color });
    });
    y -= lines.length * leading + (opts.gap ?? 4);
  };

  const heading = (text: string, gap = 8) => {
    space(34);
    y -= 6;
    page.drawText(clean(text).toUpperCase(), { x: M, y: y - 9, size: 8.5, font: bold, color: MUTED });
    y -= 18 + gap;
  };

  const bullets = (items: string[], emptyLabel: string, color = BLACK) => {
    const list = (items || []).filter(Boolean).slice(0, 12);
    if (!list.length) {
      paragraph(emptyLabel, { color: MUTED });
      return;
    }
    for (const item of list) {
      const lines = wrap(item, 10.5, CW - 14);
      const leading = 10.5 * 1.4;
      space(lines.length * leading + 3);
      page.drawText('-', { x: M, y: y - 10.5, size: 10.5, font, color });
      lines.forEach((line, index) => {
        page.drawText(line, { x: M + 14, y: y - 10.5 - index * leading, size: 10.5, font, color });
      });
      y -= lines.length * leading + 3;
    }
  };

  startPage(true);

  // Candidate identity + headline score
  const scoreValue = Math.round(Number(data.overall_score) || 0);
  const passed = !!data.passed;
  const statusColor = passed ? GREEN : RED;
  const recommendation =
    data.recommendation || RECOMMENDATION_LABELS[data.hiring_recommendation] || 'Pending review';

  page.drawText(fit(data.candidate_name || 'Candidate', 19, CW - 160, true), {
    x: M,
    y: y - 19,
    size: 19,
    font: bold,
    color: BLACK,
  });
  y -= 27;
  paragraph(data.candidate_email || '', { size: 10, color: MUTED, gap: 1, width: CW - 160 });
  paragraph(
    [data.position_title || 'Assessment', data.assessment_type].filter(Boolean).join('  -  '),
    { size: 10, color: BLACK, gap: 8, width: CW - 160 },
  );

  const boxX = W - M - 132;
  const boxTop = y + 46;
  page.drawRectangle({ x: boxX, y: boxTop - 66, width: 132, height: 66, color: SURFACE });
  page.drawText(`${scoreValue}%`, { x: boxX + 14, y: boxTop - 34, size: 26, font: bold, color: statusColor });
  page.drawText(passed ? 'PASSED' : 'FAILED', { x: boxX + 14, y: boxTop - 47, size: 8.5, font: bold, color: statusColor });
  page.drawText(fit(recommendation, 9, 112, true), { x: boxX + 14, y: boxTop - 60, size: 9, font: bold, color: BLACK });

  heading('Score Breakdown');
  const categories = Object.entries(data.category_scores || {});
  if (!categories.length) {
    paragraph('No category scores recorded.', { color: MUTED });
  }
  for (const [key, value] of categories) {
    const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    const note = key === 'time_management' ? clean(data.timing_note || '') : '';
    space(note ? 32 : 24);
    page.drawText(fit(key.replace(/_/g, ' '), 10, 180), { x: M, y: y - 10, size: 10, font, color: BLACK });
    if (note) page.drawText(fit(note, 8, 180), { x: M, y: y - 21, size: 8, font, color: MUTED });
    const barX = M + 190;
    const barW = CW - 190 - 46;
    page.drawRectangle({ x: barX, y: y - 12, width: barW, height: 7, color: RULE });
    if (pct > 0) {
      page.drawRectangle({ x: barX, y: y - 12, width: (barW * pct) / 100, height: 7, color: tone(pct) });
    }
    page.drawText(`${pct}%`, { x: M + CW - 40, y: y - 12, size: 9.5, font: bold, color: tone(pct) });
    y -= note ? 32 : 24;
  }

  if (data.smart_summary) {
    heading('Skillset Synopsis');
    paragraph(data.smart_summary);
  }

  heading('Strengths');
  bullets(data.strengths, 'None recorded', BLACK);

  heading('Areas to Probe');
  bullets(data.weaknesses, 'No gaps identified', BLACK);

  const results = (data.task_results || []).slice(0, 40);
  if (results.length) {
    heading('Question-by-Question Results');
    const drawHeader = () => {
      page.drawRectangle({ x: M, y: y - 18, width: CW, height: 18, color: SURFACE });
      page.drawText('QUESTION', { x: M + 8, y: y - 12, size: 7.5, font: bold, color: MUTED });
      page.drawText('RESULT', { x: M + CW - 150, y: y - 12, size: 7.5, font: bold, color: MUTED });
      page.drawText('POINTS', { x: M + CW - 72, y: y - 12, size: 7.5, font: bold, color: MUTED });
      y -= 18;
    };
    space(40);
    drawHeader();
    for (const task of results) {
      const correct = task.validation_passed !== false && (task.completion_percentage ?? 0) >= 70;
      const lines = wrap(task.title || 'Question', 9.5, CW - 176);
      const rowHeight = lines.length * 12 + 8;
      if (y - rowHeight < 76) {
        startPage(false);
        drawHeader();
      }
      lines.forEach((line, index) => {
        page.drawText(line, { x: M + 8, y: y - 13 - index * 12, size: 9.5, font, color: BLACK });
      });
      page.drawText(correct ? 'Correct' : 'Review', {
        x: M + CW - 150,
        y: y - 13,
        size: 9,
        font: bold,
        color: correct ? GREEN : RED,
      });
      page.drawText(`${task.points_earned ?? 0}/${task.points_possible ?? 0}`, {
        x: M + CW - 48,
        y: y - 13,
        size: 9.5,
        font,
        color: BLACK,
      });
      y -= rowHeight;
      page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: RULE });
    }
  }

  if ((data.missed_steps || []).length) {
    heading('Missed Steps');
    bullets(data.missed_steps, '', AMBER);
  }

  if ((data.follow_up_questions || []).length) {
    heading('Suggested Interview Follow-Ups');
    const items = data.follow_up_questions.slice(0, 12);
    items.forEach((item: string, index: number) => {
      const lines = wrap(`${index + 1}. ${item}`, 10.5, CW - 10);
      const leading = 10.5 * 1.4;
      space(lines.length * leading + 3);
      lines.forEach((line, lineIndex) => {
        page.drawText(line, { x: M + 4, y: y - 10.5 - lineIndex * leading, size: 10.5, font, color: BLACK });
      });
      y -= lines.length * leading + 3;
    });
  }

  if (data.reviewer_note) {
    heading('Reviewer Note');
    const lines = wrap(data.reviewer_note, 10, CW - 28);
    const leading = 10 * 1.45;
    const boxHeight = lines.length * leading + 20;
    space(boxHeight + 6);
    page.drawRectangle({ x: M, y: y - boxHeight, width: CW, height: boxHeight, color: SURFACE });
    lines.forEach((line, index) => {
      page.drawText(line, { x: M + 14, y: y - 20 - index * leading, size: 10, font, color: BLACK });
    });
    y -= boxHeight + 8;
  }

  heading('Full Scorecard');
  paragraph(data.scorecard_url || '', { size: 9.5, color: BLACK });

  const footerNote = `Prepared by ${clean(data.prepared_by || 'the hiring team')} on ${clean(
    data.generated_on || '',
  )}. This report contains candidate assessment data; share it with authorized reviewers only.`;
  pages.forEach((pdfPage, index) => {
    pdfPage.drawLine({ start: { x: M, y: 54 }, end: { x: W - M, y: 54 }, thickness: 0.6, color: RULE });
    const lines = wrap(footerNote, 7.5, CW - 70);
    lines.slice(0, 2).forEach((line, lineIndex) => {
      pdfPage.drawText(line, { x: M, y: 42 - lineIndex * 10, size: 7.5, font, color: MUTED });
    });
    pdfPage.drawText(`${index + 1} of ${pages.length}`, {
      x: W - M - 34,
      y: 42,
      size: 7.5,
      font,
      color: MUTED,
    });
  });

  const bytes = await pdf.save();
  return toBase64(bytes);
}