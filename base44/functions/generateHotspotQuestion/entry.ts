import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const REGION_SCHEMA = {
  type: 'object',
  properties: {
    image_width: { type: 'number' },
    image_height: { type: 'number' },
    regions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          w: { type: 'number' },
          h: { type: 'number' },
          correct: { type: 'boolean' }
        },
        required: ['label', 'x', 'y', 'w', 'h', 'correct']
      }
    }
  },
  required: ['image_width', 'image_height', 'regions']
};

const round = (n) => Math.round(n * 10) / 10;
const clamp = (n) => Math.min(100, Math.max(0, Number(n) || 0));

function normalizeRegions(raw, imageWidth, imageHeight) {
  const rows = Array.isArray(raw) ? raw.slice(0, 5) : [];
  const looksLikePixels = rows.some((r) => Number(r.x) > 100 || Number(r.w) > 100);
  const scaleX = looksLikePixels && Number(imageWidth) > 0 ? 100 / Number(imageWidth) : 1;
  const scaleY = looksLikePixels && Number(imageHeight) > 0 ? 100 / Number(imageHeight) : 1;
  const list = rows
    .map((r) => {
      const x = clamp(Number(r.x) * scaleX);
      const y = clamp(Number(r.y) * scaleY);
      return {
        id: crypto.randomUUID(),
        label: String(r.label || 'Area').slice(0, 60),
        x: round(x),
        y: round(y),
        w: round(Math.min(100 - x, Math.max(4, clamp(Number(r.w) * scaleX)))),
        h: round(Math.min(100 - y, Math.max(4, clamp(Number(r.h) * scaleY)))),
        correct: r.correct === true
      };
    })
    .filter((r) => r.w >= 3 && r.h >= 3);
  if (!list.length) return null;
  let correctIndex = list.findIndex((r) => r.correct);
  if (correctIndex < 0) correctIndex = 0;
  return list.map((r, i) => ({
    id: r.id,
    label: r.label,
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
    correct: i === correctIndex
  }));
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const brief = String(body.prompt || '').trim().slice(0, 800);
    const question = String(body.question || '').trim().slice(0, 400);
    if (!brief) return Response.json({ error: 'Describe what the screenshot should show.' }, { status: 400 });

    const imagePrompt = `A realistic, high-resolution screenshot used as the exhibit for a cybersecurity assessment question. Subject: ${brief}. Render a full, plausible software window (application, console, browser, dashboard or admin panel) with clearly legible interface elements such as menus, tabs, buttons, tables, log lines and IP addresses. Clean flat UI screenshot look, neutral desktop chrome, readable labels. No arrows, no highlights, no annotation boxes, no watermark, no legend, no explanatory captions.`;

    const image = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt: imagePrompt });
    if (!image || !image.url) return Response.json({ error: 'Could not generate the image.' }, { status: 502 });

    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `This image is the exhibit for this assessment question: "${question || brief}".

Identify between 3 and 4 rectangular areas on the screenshot that a candidate could plausibly click. Exactly one is the correct answer (the element the question is really about); the rest are believable near-miss distractors in the same general region of the screen.

Report the image's pixel dimensions as image_width and image_height, using the size of the image you were given. Give every box in that same pixel scale: x and y are the distance of the box's top-left corner from the image's left and top edge; w and h are the box's width and height. Keep every box at most 45 percent of the image in each dimension, fully inside the image, and do not let the correct box overlap the distractors. Label each box briefly with the interface element or value it covers.`,
      file_urls: [image.url],
      response_json_schema: REGION_SCHEMA
    });

    let parsed = analysis;
    if (typeof parsed === 'string') {
      const text = parsed.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      try { parsed = JSON.parse(text); } catch { parsed = null; }
    }
    let rawRegions = parsed && Array.isArray(parsed.regions) ? parsed.regions : [];
    if (!rawRegions.length && parsed && typeof parsed === 'object') {
      const found = Object.values(parsed).find((v) => Array.isArray(v));
      if (found) rawRegions = found;
    }
    const regions = normalizeRegions(rawRegions, parsed?.image_width, parsed?.image_height);
    if (!regions) return Response.json({ error: 'Could not determine clickable areas for that image.' }, { status: 502 });

    const correct = regions.find((r) => r.correct) || regions[0];
    return Response.json({
      image_url: image.url,
      regions: regions.map(({ correct: _c, ...rest }) => rest),
      correct_region_id: correct.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}