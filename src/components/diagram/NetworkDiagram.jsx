import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import DevicePropertiesEditor from "./DevicePropertiesEditor";
import ZoomPanControls from "./ZoomPanControls";
import SelectionControls from "./SelectionControls";

// ── Device icon painters ──────────────────────────────────────────────────────

function drawCloud(ctx, x, y, w, h, color = "#7ecef4") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#4a9fc8";
  ctx.lineWidth = 1.2;
  const r = h * 0.38;
  const bumpY = y + h * 0.1;
  ctx.beginPath();
  ctx.arc(x - w * 0.22, bumpY, r * 0.75, Math.PI, 0);
  ctx.arc(x, bumpY - r * 0.3, r, Math.PI, 0);
  ctx.arc(x + w * 0.22, bumpY, r * 0.75, Math.PI, 0);
  ctx.lineTo(x + w * 0.48, bumpY + r * 0.65);
  ctx.lineTo(x - w * 0.48, bumpY + r * 0.65);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(x - w * 0.08, bumpY - r * 0.15, r * 0.55, r * 0.22, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawRouter(ctx, x, y, w, h) {
  ctx.save();
  const rx = x - w / 2, ry = y - h / 2;
  const grad = ctx.createLinearGradient(rx, ry, rx + w, ry + h);
  grad.addColorStop(0, "#6ab7e8"); grad.addColorStop(0.4, "#2e7fbf"); grad.addColorStop(1, "#1a4f7a");
  ctx.fillStyle = grad; ctx.strokeStyle = "#1a4f7a"; ctx.lineWidth = 1;
  const cx = x, cy = y, rw = w * 0.48, rh = h * 0.48;
  ctx.beginPath(); ctx.ellipse(cx, cy - rh * 0.6, rw, rh * 0.28, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - rw, cy - rh * 0.6); ctx.lineTo(cx - rw, cy + rh * 0.6);
  ctx.arc(cx, cy + rh * 0.6, rw, Math.PI, 0); ctx.lineTo(cx + rw, cy - rh * 0.6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 0.35; ctx.fillStyle = "#cce8ff";
  ctx.beginPath(); ctx.ellipse(cx, cy - rh * 0.6, rw, rh * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#0a2a44";
  for (let i = 0; i < 4; i++) ctx.fillRect(cx - rw * 0.7 + i * rw * 0.45, cy + rh * 0.1, rw * 0.28, rh * 0.22);
  ctx.restore();
}

function drawSwitch(ctx, x, y, w, h) {
  ctx.save();
  const rx = x - w / 2, ry = y - h / 2;
  const grad = ctx.createLinearGradient(rx, ry, rx, ry + h);
  grad.addColorStop(0, "#8ecde6"); grad.addColorStop(0.5, "#3a9ec7"); grad.addColorStop(1, "#1c5f80");
  ctx.fillStyle = grad; ctx.strokeStyle = "#1c5f80"; ctx.lineWidth = 1;
  roundRect(ctx, rx, ry, w, h, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#0d3347"; roundRect(ctx, rx + w * 0.06, ry + h * 0.22, w * 0.88, h * 0.45, 2); ctx.fill();
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i < 6 ? "#4dff91" : "#facc15";
    ctx.fillRect(rx + w * 0.1 + i * w * 0.1, ry + h * 0.32, w * 0.07, h * 0.28);
  }
  ctx.fillStyle = "#4dff91"; ctx.beginPath(); ctx.arc(rx + w * 0.88, ry + h * 0.5, 3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.2; ctx.fillStyle = "#fff"; roundRect(ctx, rx + 2, ry + 2, w - 4, h * 0.3, 3); ctx.fill();
  ctx.globalAlpha = 1; ctx.restore();
}

function drawFirewall(ctx, x, y, w, h) {
  ctx.save();
  const rx = x - w / 2, ry = y - h / 2;
  const grad = ctx.createLinearGradient(rx, ry, rx, ry + h);
  grad.addColorStop(0, "#ff6b6b"); grad.addColorStop(0.5, "#cc2200"); grad.addColorStop(1, "#7a0000");
  ctx.fillStyle = grad; ctx.strokeStyle = "#8b0000"; ctx.lineWidth = 1.2;
  roundRect(ctx, rx, ry, w, h, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#ff9900";
  ctx.beginPath(); ctx.moveTo(x, ry + h * 0.15);
  ctx.bezierCurveTo(x + w * 0.2, ry + h * 0.3, x + w * 0.15, ry + h * 0.55, x, ry + h * 0.75);
  ctx.bezierCurveTo(x - w * 0.15, ry + h * 0.55, x - w * 0.2, ry + h * 0.3, x, ry + h * 0.15); ctx.fill();
  ctx.fillStyle = "#ffdd00";
  ctx.beginPath(); ctx.moveTo(x, ry + h * 0.28);
  ctx.bezierCurveTo(x + w * 0.1, ry + h * 0.38, x + w * 0.08, ry + h * 0.55, x, ry + h * 0.68);
  ctx.bezierCurveTo(x - w * 0.08, ry + h * 0.55, x - w * 0.1, ry + h * 0.38, x, ry + h * 0.28); ctx.fill();
  ctx.globalAlpha = 0.15; ctx.fillStyle = "#fff"; roundRect(ctx, rx + 2, ry + 2, w - 4, h * 0.3, 3); ctx.fill();
  ctx.globalAlpha = 1; ctx.restore();
}

function drawServer(ctx, x, y, w, h) {
  ctx.save();
  const rx = x - w / 2, ry = y - h / 2;
  const unitH = h / 3.2;
  const colors = ["#5b3ea8", "#4c2e99", "#3d2080"];
  for (let i = 0; i < 3; i++) {
    const uy = ry + i * (unitH + 2);
    const grad = ctx.createLinearGradient(rx, uy, rx, uy + unitH);
    grad.addColorStop(0, lighten(colors[i], 0.4)); grad.addColorStop(1, colors[i]);
    ctx.fillStyle = grad; ctx.strokeStyle = "#1e0a4a"; ctx.lineWidth = 0.8;
    roundRect(ctx, rx, uy, w, unitH, 2); ctx.fill(); ctx.stroke();
    for (let j = 0; j < 4; j++) { ctx.fillStyle = "#0d0625"; ctx.fillRect(rx + w * 0.06 + j * w * 0.22, uy + unitH * 0.2, w * 0.18, unitH * 0.6); }
    ctx.fillStyle = i === 0 ? "#4dff91" : "#facc15"; ctx.beginPath(); ctx.arc(rx + w * 0.9, uy + unitH * 0.5, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawWorkstation(ctx, x, y, w, h) {
  ctx.save();
  const mw = w * 0.8, mh = h * 0.55, mx = x - mw / 2, my = y - h * 0.5;
  const mGrad = ctx.createLinearGradient(mx, my, mx, my + mh);
  mGrad.addColorStop(0, "#5b7fa6"); mGrad.addColorStop(1, "#2a4a6b");
  ctx.fillStyle = mGrad; ctx.strokeStyle = "#1a3050"; ctx.lineWidth = 1;
  roundRect(ctx, mx, my, mw, mh, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#c8e0ff"; roundRect(ctx, mx + mw * 0.07, my + mh * 0.1, mw * 0.86, mh * 0.72, 2); ctx.fill();
  ctx.fillStyle = "#3a5a80";
  ctx.fillRect(x - w * 0.06, my + mh, w * 0.12, h * 0.1);
  ctx.fillRect(x - w * 0.25, my + mh + h * 0.1, w * 0.5, h * 0.06);
  const tw = w * 0.3, th = h * 0.45, tx = x + mw * 0.45, ty = y - h * 0.2;
  const tGrad = ctx.createLinearGradient(tx, ty, tx, ty + th);
  tGrad.addColorStop(0, "#6e8fb0"); tGrad.addColorStop(1, "#2a3f58");
  ctx.fillStyle = tGrad; ctx.strokeStyle = "#1a2f44";
  roundRect(ctx, tx, ty, tw, th, 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#4dff91"; ctx.beginPath(); ctx.arc(tx + tw * 0.5, ty + th * 0.2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPhone(ctx, x, y, w, h) {
  ctx.save();
  const rx = x - w / 2, ry = y - h / 2;
  const grad = ctx.createLinearGradient(rx, ry, rx, ry + h);
  grad.addColorStop(0, "#7ba7c7"); grad.addColorStop(1, "#2e5c80");
  ctx.fillStyle = grad; ctx.strokeStyle = "#1a3a55"; ctx.lineWidth = 1;
  roundRect(ctx, rx, ry, w, h, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#b8d8f0"; roundRect(ctx, rx + w * 0.08, ry + h * 0.08, w * 0.84, h * 0.45, 2); ctx.fill();
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    ctx.fillStyle = "#1a3a55"; ctx.beginPath();
    ctx.arc(rx + w * (0.25 + c * 0.25), ry + h * (0.62 + r * 0.11), 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "#d0e8ff"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(rx + w * 0.3, ry + h * 0.95, w * 0.35, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.restore();
}

function drawWAP(ctx, x, y, w, h) {
  ctx.save();
  const arcColors = ["rgba(16,185,129,0.2)", "rgba(16,185,129,0.35)", "rgba(16,185,129,0.55)"];
  for (let i = 2; i >= 0; i--) {
    ctx.strokeStyle = arcColors[i]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y + h * 0.15, w * (0.2 + i * 0.22), Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }
  const bw = w * 0.65, bh = h * 0.3, bx = x - bw / 2, by = y + h * 0.05;
  const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
  grad.addColorStop(0, "#34d399"); grad.addColorStop(1, "#065f46");
  ctx.fillStyle = grad; ctx.strokeStyle = "#064e3b"; ctx.lineWidth = 1;
  roundRect(ctx, bx, by, bw, bh, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, by + bh * 0.5, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawLoadBalancer(ctx, x, y, w, h) {
  ctx.save();
  const rx = x - w / 2, ry = y - h / 2;
  const grad = ctx.createLinearGradient(rx, ry, rx, ry + h);
  grad.addColorStop(0, "#fde68a"); grad.addColorStop(1, "#b45309");
  ctx.fillStyle = grad; ctx.strokeStyle = "#92400e"; ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const hx = x + (w / 2) * Math.cos(a), hy = y + (h / 2) * Math.sin(a);
    i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#7c2d12"; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.25, y + h * 0.1); ctx.lineTo(x + w * 0.25, y + h * 0.1);
  ctx.moveTo(x, y - h * 0.2); ctx.lineTo(x, y + h * 0.2);
  ctx.stroke();
  ctx.restore();
}

// ── New device icons ──────────────────────────────────────────────────────────

function drawNAS(ctx, x, y, w, h) {
  ctx.save();
  const rx = x - w / 2, ry = y - h / 2;
  const grad = ctx.createLinearGradient(rx, ry, rx, ry + h);
  grad.addColorStop(0, "#818cf8"); grad.addColorStop(1, "#3730a3");
  ctx.fillStyle = grad; ctx.strokeStyle = "#312e81"; ctx.lineWidth = 1;
  roundRect(ctx, rx, ry, w, h, 4); ctx.fill(); ctx.stroke();
  // Disk bay slots
  for (let i = 0; i < 4; i++) {
    const dy = ry + h * 0.1 + i * h * 0.2;
    ctx.fillStyle = "#1e1b4b"; ctx.fillRect(rx + w * 0.08, dy, w * 0.55, h * 0.15);
    ctx.fillStyle = i < 3 ? "#34d399" : "#facc15";
    ctx.beginPath(); ctx.arc(rx + w * 0.74, dy + h * 0.075, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 0.15; ctx.fillStyle = "#fff";
  roundRect(ctx, rx + 2, ry + 2, w - 4, h * 0.22, 4); ctx.fill();
  ctx.globalAlpha = 1; ctx.restore();
}

function drawVPN(ctx, x, y, w, h) {
  ctx.save();
  const rx = x - w / 2, ry = y - h / 2;
  const grad = ctx.createLinearGradient(rx, ry, rx, ry + h);
  grad.addColorStop(0, "#6ee7b7"); grad.addColorStop(1, "#047857");
  ctx.fillStyle = grad; ctx.strokeStyle = "#064e3b"; ctx.lineWidth = 1.2;
  roundRect(ctx, rx, ry, w, h, 5); ctx.fill(); ctx.stroke();
  // Shield outline
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, ry + h * 0.1);
  ctx.lineTo(x + w * 0.38, ry + h * 0.28);
  ctx.lineTo(x + w * 0.38, ry + h * 0.55);
  ctx.quadraticCurveTo(x + w * 0.38, ry + h * 0.82, x, ry + h * 0.9);
  ctx.quadraticCurveTo(x - w * 0.38, ry + h * 0.82, x - w * 0.38, ry + h * 0.55);
  ctx.lineTo(x - w * 0.38, ry + h * 0.28);
  ctx.closePath(); ctx.stroke();
  // Lock body
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - w * 0.12, ry + h * 0.55, w * 0.24, h * 0.2);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.arc(x, ry + h * 0.55, w * 0.1, Math.PI, 0); ctx.stroke();
  ctx.restore();
}

function drawIDS(ctx, x, y, w, h) {
  ctx.save();
  const rx = x - w / 2, ry = y - h / 2;
  const grad = ctx.createLinearGradient(rx, ry, rx, ry + h);
  grad.addColorStop(0, "#fb923c"); grad.addColorStop(1, "#9a3412");
  ctx.fillStyle = grad; ctx.strokeStyle = "#7c2d12"; ctx.lineWidth = 1.2;
  // Octagon shape
  const s = Math.min(w, h) * 0.45;
  const cut = s * 0.3;
  ctx.beginPath();
  ctx.moveTo(x - s + cut, y - s); ctx.lineTo(x + s - cut, y - s);
  ctx.lineTo(x + s, y - s + cut); ctx.lineTo(x + s, y + s - cut);
  ctx.lineTo(x + s - cut, y + s); ctx.lineTo(x - s + cut, y + s);
  ctx.lineTo(x - s, y + s - cut); ctx.lineTo(x - s, y - s + cut);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Eye symbol
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(x, y - h * 0.05, w * 0.25, h * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#9a3412";
  ctx.beginPath(); ctx.arc(x, y - h * 0.05, w * 0.1, 0, Math.PI * 2); ctx.fill();
  // ! mark
  ctx.fillStyle = "#fff"; ctx.font = `bold ${h * 0.22}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("!", x, y + h * 0.3);
  ctx.restore();
}

function drawCloudProvider(ctx, x, y, w, h) {
  // Like internet cloud but with provider color
  drawCloud(ctx, x, y, w, h, "#7c3aed");
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(h * 0.22)}px sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("☁", x, y + h * 0.15);
  ctx.restore();
}

function drawUPS(ctx, x, y, w, h) {
  ctx.save();
  const rx = x - w / 2, ry = y - h / 2;
  const grad = ctx.createLinearGradient(rx, ry, rx, ry + h);
  grad.addColorStop(0, "#fbbf24"); grad.addColorStop(1, "#78350f");
  ctx.fillStyle = grad; ctx.strokeStyle = "#451a03"; ctx.lineWidth = 1.2;
  roundRect(ctx, rx, ry, w, h, 4); ctx.fill(); ctx.stroke();
  // Battery icon
  ctx.fillStyle = "#fff"; ctx.fillRect(rx + w * 0.15, ry + h * 0.25, w * 0.6, h * 0.5);
  ctx.fillStyle = "#fbbf24"; ctx.fillRect(rx + w * 0.18, ry + h * 0.28, w * 0.35, h * 0.44);
  ctx.fillStyle = "#fff"; ctx.fillRect(rx + w * 0.65, ry + h * 0.35, w * 0.1, h * 0.28);
  // Bolt
  ctx.fillStyle = "#fbbf24"; ctx.font = `bold ${h * 0.35}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("⚡", x - w * 0.08, y + h * 0.04);
  ctx.restore();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function lighten(hex, amt) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * amt));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amt));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amt));
  return `rgb(${r},${g},${b})`;
}

// ── Device size config ────────────────────────────────────────────────────────
const DEVICE_SIZE = {
  router:        { w: 48, h: 40 },
  switch:        { w: 54, h: 22 },
  firewall:      { w: 34, h: 40 },
  server:        { w: 42, h: 40 },
  internet:      { w: 60, h: 40 },
  loadbalancer:  { w: 38, h: 38 },
  wireless:      { w: 40, h: 33 },
  workstation:   { w: 44, h: 42 },
  phone:         { w: 28, h: 40 },
  nas:           { w: 38, h: 50 },
  vpn:           { w: 36, h: 40 },
  ids:           { w: 38, h: 38 },
  cloud:         { w: 60, h: 40 },
  ups:           { w: 34, h: 40 },
};

function getLayerOpacity(layer) {
  // Layers closer to the user are slightly more muted
  const opacityMap = { internet: 1, firewall: 1, core: 1, datacenter: 0.95, site: 0.85, user: 0.75, default: 0.9 };
  return opacityMap[layer] || 0.9;
}

function drawDevice(ctx, node) {
  const { x, y, type, label, layer = "default", _scale = 1 } = node;
  const sz = DEVICE_SIZE[type] || { w: 52, h: 42 };
  const w = sz.w * _scale;
  const h = sz.h * _scale;
  const opacity = getLayerOpacity(layer);

  ctx.globalAlpha = opacity;
  
  switch (type) {
    case "router":       drawRouter(ctx, x, y, w, h); break;
    case "switch":       drawSwitch(ctx, x, y, w, h); break;
    case "firewall":     drawFirewall(ctx, x, y, w, h); break;
    case "server":       drawServer(ctx, x, y, w, h); break;
    case "internet":     drawCloud(ctx, x, y, w, h, "#7ecef4"); break;
    case "loadbalancer": drawLoadBalancer(ctx, x, y, w, h); break;
    case "wireless":     drawWAP(ctx, x, y, w, h); break;
    case "workstation":  drawWorkstation(ctx, x, y, w, h); break;
    case "phone":        drawPhone(ctx, x, y, w, h); break;
    case "nas":          drawNAS(ctx, x, y, w, h); break;
    case "vpn":          drawVPN(ctx, x, y, w, h); break;
    case "ids":          drawIDS(ctx, x, y, w, h); break;
    case "cloud":        drawCloudProvider(ctx, x, y, w, h); break;
    case "ups":          drawUPS(ctx, x, y, w, h); break;
    default:             drawSwitch(ctx, x, y, w, h);
  }

  ctx.globalAlpha = 1;

  // Label below
  ctx.save();
  ctx.fillStyle = "#e2e8f0";
  const fontSize = Math.max(7, Math.round(10 * (node._scale || 1)));
  ctx.font = `bold ${fontSize}px 'Inter', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const labelY = y + h / 2 + 4;
  ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 3;
  ctx.fillText(label, x, labelY);
  ctx.restore();
}

// ── Link drawing with extended styles ────────────────────────────────────────
function drawLink(ctx, from, to, label, style = "solid", fromIp = null) {
  const sz1 = DEVICE_SIZE[from.type] || { w: 52, h: 42 };
  const sz2 = DEVICE_SIZE[to.type] || { w: 52, h: 42 };
  const fx = from.x, fy = from.y, tx = to.x, ty = to.y;
  const dx = tx - fx, dy = ty - fy;
  const angle = Math.atan2(dy, dx);
  const fromX = fx + (sz1.w / 2) * Math.cos(angle);
  const fromY = fy + (sz1.h / 2) * Math.sin(angle);
  const toX = tx - (sz2.w / 2) * Math.cos(angle);
  const toY = ty - (sz2.h / 2) * Math.sin(angle);

  ctx.save();

  switch (style) {
    case "ha":
      ctx.strokeStyle = "rgba(250,204,21,0.7)"; ctx.setLineDash([6, 3]); ctx.lineWidth = 1.5; break;
    case "wan":
      ctx.strokeStyle = "rgba(99,102,241,0.8)"; ctx.lineWidth = 2; ctx.setLineDash([]); break;
    case "dmz":
      ctx.strokeStyle = "rgba(244,63,94,0.7)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); break;
    case "fiber":
      ctx.strokeStyle = "rgba(251,191,36,0.9)"; ctx.lineWidth = 2.5; ctx.setLineDash([]);
      // Add a secondary glow line
      ctx.shadowColor = "rgba(251,191,36,0.5)"; ctx.shadowBlur = 6; break;
    case "p2p":
      ctx.strokeStyle = "rgba(52,211,153,0.9)"; ctx.lineWidth = 2; ctx.setLineDash([8, 2]); break;
    case "vpn":
      ctx.strokeStyle = "rgba(167,139,250,0.8)"; ctx.lineWidth = 1.8; ctx.setLineDash([3, 3]); break;
    default:
      ctx.strokeStyle = "rgba(148,163,184,0.55)"; ctx.lineWidth = 1.5; ctx.setLineDash([]); break;
  }

  ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke();
  ctx.setLineDash([]); ctx.shadowBlur = 0;

  // Arrow tip
  if (style !== "ha") {
    const arrowSize = 6;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - arrowSize * Math.cos(angle - 0.4), toY - arrowSize * Math.sin(angle - 0.4));
    ctx.lineTo(toX - arrowSize * Math.cos(angle + 0.4), toY - arrowSize * Math.sin(angle + 0.4));
    ctx.closePath(); ctx.fill();
  }

  // For fiber, draw parallel track
  if (style === "fiber") {
    const offset = 3;
    const perpX = -Math.sin(angle) * offset, perpY = Math.cos(angle) * offset;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.moveTo(fromX + perpX, fromY + perpY); ctx.lineTo(toX + perpX, toY + perpY); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (label || fromIp) {
    const mx = (fromX + toX) / 2, my = (fromY + toY) / 2;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 3;
    if (label) {
      ctx.fillStyle = "#94a3b8"; ctx.font = "9px Inter, sans-serif";
      ctx.fillText(label, mx, my - 7);
    }
    if (fromIp) {
      ctx.fillStyle = "#4ade80"; ctx.font = "8px Inter, monospace";
      ctx.fillText(fromIp, mx, my + (label ? 5 : -1));
    }
  }

  ctx.restore();
}

// ── Annotation drawing ────────────────────────────────────────────────────────
function drawAnnotation(ctx, ann, isSelected) {
  ctx.save();
  if (isSelected) {
    ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(ann.x - 4, ann.y - 14, (ann.text.length * 7) + 8, 20);
    ctx.setLineDash([]);
  }
  ctx.fillStyle = ann.color || "#fde68a";
  ctx.font = `${ann.bold ? "bold " : ""}${ann.size || 12}px Inter, sans-serif`;
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 3;
  ctx.fillText(ann.text, ann.x, ann.y - 12);
  ctx.restore();
}

// ── Hit-test ──────────────────────────────────────────────────────────────────
function hitTest(mappedNodes, cx, cy) {
  for (let i = mappedNodes.length - 1; i >= 0; i--) {
    const n = mappedNodes[i];
    const sz = DEVICE_SIZE[n.type] || { w: 52, h: 42 };
    const s = n._scale || 1;
    const hw = sz.w * s / 2 + 6, hh = sz.h * s / 2 + 6;
    if (cx >= n.x - hw && cx <= n.x + hw && cy >= n.y - hh && cy <= n.y + hh) return n;
  }
  return null;
}

function hitTestAnnotation(annotations, cx, cy) {
  for (let i = annotations.length - 1; i >= 0; i--) {
    const a = annotations[i];
    const w = (a.text.length * 7) + 8;
    if (cx >= a.x - 4 && cx <= a.x - 4 + w && cy >= a.y - 14 && cy <= a.y + 6) return i;
  }
  return -1;
}

// ── Main component ────────────────────────────────────────────────────────────
const NetworkDiagram = forwardRef(function NetworkDiagram(
  { diagramData, onNodeClick, onNodeHover, onNodeUpdate, onNodesMoved, simulationMode, annotations = [], annotationMode = false, onAnnotationAdd, simulationTrafficPattern = "steady", simulationScenario = null },
  ref
) {
  const canvasRef = useRef(null);
  const mappedRef = useRef([]);
  const animFrameRef = useRef(null);
  const packetsRef = useRef([]);
  const selectedRef = useRef(null);
  const hoveredRef = useRef(null);
  const trafficPatternRef = useRef(simulationTrafficPattern);
  const scenarioRef = useRef(simulationScenario);
  const linkLoadRef = useRef({}); // { "fromId-toId": 0..1 }
  const animTickRef = useRef(0);
  const [selectedAnnotation, setSelectedAnnotation] = useState(-1);
  const [editingNode, setEditingNode] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const annotationsRef = useRef(annotations);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(zoomLevel);
  const panRef = useRef(panOffset);

  useEffect(() => { zoomRef.current = zoomLevel; }, [zoomLevel]);
  useEffect(() => { panRef.current = panOffset; }, [panOffset]);
  useEffect(() => { trafficPatternRef.current = simulationTrafficPattern; }, [simulationTrafficPattern]);
  useEffect(() => { scenarioRef.current = simulationScenario; }, [simulationScenario]);
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set());
  const [deviceGroups, setDeviceGroups] = useState({});
  const panStartRef = useRef(null);
  const [boxSelectStart, setBoxSelectStart] = useState(null);
  const [boxSelectEnd, setBoxSelectEnd] = useState(null);

  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);

  // Export PNG
  useImperativeHandle(ref, () => ({
    exportPNG() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url; a.download = "network-diagram.png";
      document.body.appendChild(a); a.click(); a.remove();
    },
    exportSVG() {
      // Build SVG from current diagram
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      const mapped = mappedRef.current;
      const { links } = diagramData;

      const linkColors = { ha: "#facc15", wan: "#6366f1", dmz: "#f43f5e", fiber: "#fbbf24", p2p: "#34d399", vpn: "#a78bfa", solid: "#94a3b8" };
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="background:#0b1120">`;
      svgContent += `<defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

      // Draw links
      links.forEach(link => {
        const from = mapped.find(n => n.id === link.from);
        const to = mapped.find(n => n.id === link.to);
        if (!from || !to) return;
        const style = link.label === "HA" ? "ha" : link.label === "DMZ" ? "dmz" : link.wan ? "wan" : link.style || "solid";
        const color = linkColors[style] || "#94a3b8";
        const dash = ["ha", "dmz", "p2p", "vpn"].includes(style) ? 'stroke-dasharray="6,3"' : "";
        svgContent += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="2" ${dash} opacity="0.8"/>`;
        if (link.label) {
          const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
          svgContent += `<text x="${mx}" y="${my - 7}" fill="#94a3b8" font-size="9" text-anchor="middle">${link.label}</text>`;
        }
      });

      // Draw device labels
      mapped.forEach(n => {
        const sz = DEVICE_SIZE[n.type] || { w: 52, h: 42 };
        const colors = { router: "#2e7fbf", switch: "#3a9ec7", firewall: "#cc2200", server: "#5b3ea8", internet: "#7ecef4", loadbalancer: "#b45309", wireless: "#065f46", workstation: "#2a4a6b", phone: "#2e5c80", nas: "#3730a3", vpn: "#047857", ids: "#9a3412", cloud: "#7c3aed", ups: "#78350f" };
        const fill = colors[n.type] || "#334155";
        svgContent += `<rect x="${n.x - sz.w / 2}" y="${n.y - sz.h / 2}" width="${sz.w}" height="${sz.h}" rx="4" fill="${fill}" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>`;
        svgContent += `<text x="${n.x}" y="${n.y + sz.h / 2 + 14}" fill="#e2e8f0" font-size="10" font-weight="bold" text-anchor="middle">${n.label.replace(/\n/g, " ")}</text>`;
      });

      // Annotations
      annotationsRef.current.forEach(ann => {
        svgContent += `<text x="${ann.x}" y="${ann.y}" fill="${ann.color || "#fde68a"}" font-size="${ann.size || 12}" ${ann.bold ? 'font-weight="bold"' : ""}>${ann.text}</text>`;
      });

      svgContent += `</svg>`;
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "network-diagram.svg";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }
  }));

  // Compute per-link load factor (0..1) based on traffic pattern + scenario
  const computeLinkLoad = useCallback((linkKey, isWan) => {
    const pattern = trafficPatternRef.current;
    const scenario = scenarioRef.current;
    const t = animTickRef.current;

    let base = isWan ? 0.45 : 0.25;

    // Traffic pattern modulation
    switch (pattern) {
      case "bursty":   base = t % 30 < 6 ? 0.95 : 0.2; break;
      case "ramp_up":  base = Math.min(0.95, 0.15 + (t / 300) * 0.85); break;
      case "sine":     base = 0.3 + 0.65 * (0.5 + 0.5 * Math.sin((t / 40) * Math.PI)); break;
      default:         base = isWan ? 0.5 + Math.random() * 0.1 : 0.25 + Math.random() * 0.1;
    }

    // Scenario multiplier
    const scenarioBoost = {
      high_latency:    0.3,
      ddos:            0.95,
      bandwidth_surge: 0.85,
      bgp_flap:        0.6,
      link_failure:    0.1,
      device_reboot:   0.15,
      firewall_breach: 0.7,
      server_crash:    0.4,
    };
    if (scenario) base = Math.min(1, base + (scenarioBoost[scenario.id] || 0) * (isWan ? 0.8 : 0.6));

    return Math.max(0.05, Math.min(1, base));
  }, []);

  const spawnPacket = useCallback(() => {
    const mapped = mappedRef.current;
    if (!mapped.length || !diagramData) return;
    const { links } = diagramData;
    if (!links.length) return;

    const pattern = trafficPatternRef.current;
    const scenario = scenarioRef.current;
    const t = animTickRef.current;

    // How many packets to spawn this tick (frequency driven by traffic load)
    let spawnCount = 1;
    if (pattern === "bursty")       spawnCount = t % 30 < 6 ? 4 : 0;
    else if (pattern === "ramp_up") spawnCount = Math.ceil(1 + (t / 120) * 3);
    else if (pattern === "sine")    spawnCount = Math.round(1 + 2 * (0.5 + 0.5 * Math.sin((t / 40) * Math.PI)));
    else                            spawnCount = 1 + (scenario ? 2 : 0);

    for (let s = 0; s < spawnCount; s++) {
      const link = links[Math.floor(Math.random() * links.length)];
      const from = mapped.find(n => n.id === link.from), to = mapped.find(n => n.id === link.to);
      if (!from || !to) continue;

      const linkKey = `${link.from}-${link.to}`;
      const load = linkLoadRef.current[linkKey] ?? 0.3;

      // Color: green→yellow→red based on congestion load
      let color;
      if (load < 0.35)      color = "#4dff91"; // green – normal
      else if (load < 0.65) color = "#fbbf24"; // yellow – moderate
      else if (load < 0.85) color = "#f97316"; // orange – high
      else                  color = "#ef4444"; // red – congested

      // Packet size reflects load
      const radius = 3 + load * 5;
      // Speed: congested packets move slower (queuing delay)
      const speed = (0.014 - load * 0.007) + Math.random() * 0.005;

      packetsRef.current.push({
        from, to, progress: 0, link: linkKey,
        ip: from.ip || `10.${Math.floor(Math.random()*254)+1}.1.1`,
        color, radius, speed, load,
      });
    }
  }, [diagramData, computeLinkLoad]);

  const draw = useCallback((selectedId = null, hoveredId = null, packets = [], selAnn = -1) => {
    const canvas = canvasRef.current;
    if (!canvas || !diagramData) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Read zoom/pan from refs so draw is always up-to-date without stale closure
    const curZoom = zoomRef.current;
    const curPan = panRef.current;

    // Background
    const bg = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    bg.addColorStop(0, "#0b1120"); bg.addColorStop(1, "#0f172a");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = "rgba(148,163,184,0.06)";
    for (let gx = 20; gx < rect.width; gx += 40) for (let gy = 20; gy < rect.height; gy += 40) {
      ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill();
    }

    const { nodes, links } = diagramData;
    const allX = nodes.map(n => n.x), allY = nodes.map(n => n.y);
    const minX = Math.min(...allX), maxX = Math.max(...allX);
    const minY = Math.min(...allY), maxY = Math.max(...allY);
    const diagW = maxX - minX || 1;
    const diagH = maxY - minY || 1;
    const padX = 100, padY = 80;
    // Fit scale: always fit entire diagram within the canvas (regardless of browser zoom)
    const fitScale = Math.min(
      (rect.width - padX * 2) / diagW,
      (rect.height - padY * 2) / diagH
    );
    // Apply user zoom on top of fit — zoom=1 always means "fit to screen"
    const scale = fitScale * curZoom;
    // Icon scale tied to fitScale so icons stay consistent regardless of browser zoom
    const iconScale = Math.min(Math.max(fitScale * 2.2, 0.3), 1.8);
    // Center diagram in canvas at all times, then apply pan offset
    const canvasCx = rect.width / 2;
    const canvasCy = rect.height / 2;
    const diagMidX = (minX + maxX) / 2;
    const diagMidY = (minY + maxY) / 2;
    const offX = canvasCx - diagMidX * scale + curPan.x;
    const offY = canvasCy - diagMidY * scale + curPan.y;

    const mapped = nodes.map(n => ({ ...n, x: n.x * scale + offX, y: n.y * scale + offY, _scale: iconScale }));
    mappedRef.current = mapped;

    links.forEach(link => {
      const from = mapped.find(n => n.id === link.from), to = mapped.find(n => n.id === link.to);
      if (from && to) {
        const style = link.label === "HA" ? "ha" : link.label === "DMZ" ? "dmz" : link.wan ? "wan" : link.style || "solid";
        drawLink(ctx, from, to, link.label, style, link.fromIp || null);
      }
    });

    mapped.forEach(node => {
      const isSelected = selectedId && node.id === selectedId;
      const isMultiSelected = selectedNodeIds.has(node.id);
      const isHovered = hoveredId && node.id === hoveredId;
      const sz = DEVICE_SIZE[node.type] || { w: 52, h: 42 };

      if (isSelected || isHovered || isMultiSelected) {
        const ns = node._scale || 1;
        const sw = sz.w * ns, sh = sz.h * ns;
        ctx.save();
        if (isMultiSelected) {
          ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 15;
          ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 1.5;
        } else if (isSelected) {
          ctx.shadowColor = "#0ea5e9"; ctx.shadowBlur = 20;
          ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = 2;
        } else {
          ctx.shadowColor = "rgba(148,163,184,0.6)"; ctx.shadowBlur = 12;
          ctx.strokeStyle = "rgba(148,163,184,0.5)"; ctx.lineWidth = 1.5;
        }
        roundRect(ctx, node.x - sw / 2 - 5, node.y - sh / 2 - 5, sw + 10, sh + 10, 6); ctx.stroke();
        ctx.restore();
      }
      drawDevice(ctx, node);
    });

    // Draw annotations
    annotationsRef.current.forEach((ann, i) => drawAnnotation(ctx, ann, i === selAnn));

    // ── Congestion overlay on links ──────────────────────────────────────────
    if (packets.length > 0) {
      links.forEach(link => {
        const from = mapped.find(n => n.id === link.from), to = mapped.find(n => n.id === link.to);
        if (!from || !to) return;
        const load = linkLoadRef.current[`${link.from}-${link.to}`] ?? 0;
        if (load < 0.35) return; // no overlay for low-load links

        const sz1 = DEVICE_SIZE[from.type] || { w: 52, h: 42 };
        const sz2 = DEVICE_SIZE[to.type] || { w: 52, h: 42 };
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const fx = from.x + (sz1.w / 2) * Math.cos(angle);
        const fy = from.y + (sz1.h / 2) * Math.sin(angle);
        const tx = to.x - (sz2.w / 2) * Math.cos(angle);
        const ty = to.y - (sz2.h / 2) * Math.sin(angle);

        const glowColor = load < 0.65
          ? `rgba(251,191,36,${0.15 + load * 0.25})`
          : load < 0.85
          ? `rgba(249,115,22,${0.2 + load * 0.3})`
          : `rgba(239,68,68,${0.25 + load * 0.35})`;

        ctx.save();
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 2 + load * 8;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8 + load * 12;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.restore();
      });
    }

    // ── Packets ───────────────────────────────────────────────────────────────
    packets.forEach(pkt => {
      const px = pkt.from.x + (pkt.to.x - pkt.from.x) * pkt.progress;
      const py = pkt.from.y + (pkt.to.y - pkt.from.y) * pkt.progress;
      const r = pkt.radius ?? 5;
      ctx.save();
      ctx.shadowColor = pkt.color; ctx.shadowBlur = 6 + r * 2; ctx.fillStyle = pkt.color;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // Draw box selection
    if (boxSelectStart && boxSelectEnd) {
      const startX = Math.min(boxSelectStart.x, boxSelectEnd.x);
      const startY = Math.min(boxSelectStart.y, boxSelectEnd.y);
      const width = Math.abs(boxSelectEnd.x - boxSelectStart.x);
      const height = Math.abs(boxSelectEnd.y - boxSelectStart.y);
      
      ctx.save();
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(startX, startY, width, height);
      ctx.fillStyle = "rgba(14, 165, 233, 0.1)";
      ctx.fillRect(startX, startY, width, height);
      ctx.restore();
    }

    // Annotation mode hint
    if (annotationMode) {
      ctx.save(); ctx.fillStyle = "rgba(253,230,138,0.6)"; ctx.font = "10px Inter"; ctx.textAlign = "left";
      ctx.fillText("✏ Click anywhere to add annotation", 16, rect.height - 12); ctx.restore();
    }

    ctx.save(); ctx.fillStyle = "rgba(226,232,240,0.55)"; ctx.font = "bold 12px Inter, sans-serif";
    ctx.textAlign = "left"; ctx.fillText("Network Diagram", 16, 20); ctx.restore();
  }, [diagramData, annotationMode, selectedNodeIds, boxSelectStart, boxSelectEnd]);

  const redraw = useCallback(() => {
    draw(selectedRef.current, hoveredRef.current, packetsRef.current, selectedAnnotation);
  }, [draw, selectedAnnotation, zoomLevel, panOffset]);

  useEffect(() => {
    if (!simulationMode) {
      packetsRef.current = [];
      linkLoadRef.current = {};
      animTickRef.current = 0;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      redraw(); return;
    }

    let spawnTimer = 0;
    const animate = () => {
      animTickRef.current++;
      spawnTimer++;

      // Update per-link load values every 6 frames
      if (spawnTimer % 6 === 0 && diagramData) {
        const newLoads = {};
        diagramData.links.forEach(link => {
          const key = `${link.from}-${link.to}`;
          newLoads[key] = computeLinkLoad(key, !!link.wan);
        });
        linkLoadRef.current = newLoads;
      }

      // Spawn frequency: base 18 frames, reduced when bursty/congested
      const spawnInterval = trafficPatternRef.current === "bursty" ? 10
        : trafficPatternRef.current === "ramp_up" ? Math.max(6, 18 - Math.floor(animTickRef.current / 30))
        : trafficPatternRef.current === "sine" ? 14
        : 18;

      if (spawnTimer % spawnInterval === 0) spawnPacket();

      packetsRef.current = packetsRef.current
        .map(p => ({ ...p, progress: p.progress + p.speed }))
        .filter(p => p.progress < 1);

      draw(selectedRef.current, hoveredRef.current, packetsRef.current, selectedAnnotation);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [simulationMode, spawnPacket, draw, selectedAnnotation, computeLinkLoad, diagramData]);

  useEffect(() => {
    redraw();
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [redraw, zoomLevel, panOffset]);

  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
  };

  const handleClick = (e) => {
    const { x, y } = getCanvasPos(e);

    if (annotationMode) {
      if (onAnnotationAdd) onAnnotationAdd(x, y);
      return;
    }

    const annIdx = hitTestAnnotation(annotationsRef.current, x, y);
    if (annIdx >= 0) { setSelectedAnnotation(annIdx); return; }
    setSelectedAnnotation(-1);

    const node = hitTest(mappedRef.current, x, y);
    if (node && e.detail === 2) {
      // Double-click to edit
      setEditingNode(node);
      return;
    }

    // Multi-select with Ctrl/Cmd
    if (e.ctrlKey || e.metaKey) {
      if (node) {
        setSelectedNodeIds(prev => {
          const next = new Set(prev);
          if (next.has(node.id)) {
            next.delete(node.id);
          } else {
            next.add(node.id);
          }
          return next;
        });
      }
    } else {
      // Single select
      if (node) {
        setSelectedNodeIds(new Set([node.id]));
      } else {
        setSelectedNodeIds(new Set());
      }
    }

    selectedRef.current = node ? node.id : null;
    draw(selectedRef.current, hoveredRef.current, packetsRef.current, -1);
    if (onNodeClick) onNodeClick(node || null);
  };

  const handleMouseDown = (e) => {
    const { x, y } = getCanvasPos(e);
    const node = hitTest(mappedRef.current, x, y);
    
    if (e.button === 0 && !annotationMode) {
      // If shift held, start box selection
      if (e.shiftKey && !node) {
        setBoxSelectStart({ x, y });
        setBoxSelectEnd({ x, y });
        return;
      }
      
      if (node) {
        // Normal drag single node
        setDraggingNode(node);
        setDragOffset({ x: x - node.x, y: y - node.y });
      } else {
        // Drag on empty space = pan
        panStartRef.current = { x, y };
      }
    }
    // Middle mouse pan
    if (e.button === 1) {
      panStartRef.current = { x, y };
    }
  };

  const handleMouseUpOrMove = (e) => {
    // Handle box selection
    if (boxSelectStart && e.type === "mousemove") {
      const { x, y } = getCanvasPos(e);
      setBoxSelectEnd({ x, y });
      return;
    }

    if (boxSelectStart && e.type === "mouseup") {
      // Find nodes within box
      const startX = Math.min(boxSelectStart.x, boxSelectEnd.x);
      const startY = Math.min(boxSelectStart.y, boxSelectEnd.y);
      const endX = Math.max(boxSelectStart.x, boxSelectEnd.x);
      const endY = Math.max(boxSelectStart.y, boxSelectEnd.y);

      const nodesInBox = mappedRef.current.filter(n => {
        const sz = DEVICE_SIZE[n.type] || { w: 52, h: 42 };
        return n.x - sz.w / 2 >= startX && n.x + sz.w / 2 <= endX &&
               n.y - sz.h / 2 >= startY && n.y + sz.h / 2 <= endY;
      });

      setSelectedNodeIds(new Set(nodesInBox.map(n => n.id)));
      setBoxSelectStart(null);
      setBoxSelectEnd(null);
      return;
    }

    // Handle dragging selected group
    if (selectedNodeIds.size > 1 && draggingNode && e.type === "mousemove") {
      const { x, y } = getCanvasPos(e);
      const deltaX = x - dragOffset.x - draggingNode.x;
      const deltaY = y - dragOffset.y - draggingNode.y;

      const updatedNode = { ...draggingNode, x: x - dragOffset.x, y: y - dragOffset.y };
      const updatedNodes = mappedRef.current.map(n => {
        if (selectedNodeIds.has(n.id)) {
          return { ...n, x: n.x + deltaX, y: n.y + deltaY };
        }
        return n;
      });
      mappedRef.current = updatedNodes;
      setDraggingNode(updatedNode);
      draw(selectedRef.current, draggingNode.id, packetsRef.current, selectedAnnotation);
    } else if (draggingNode && e.type === "mousemove") {
      const { x, y } = getCanvasPos(e);
      const updatedNode = { ...draggingNode, x: x - dragOffset.x, y: y - dragOffset.y };
      mappedRef.current = mappedRef.current.map(n => n.id === draggingNode.id ? updatedNode : n);
      setDraggingNode(updatedNode);
      draw(selectedRef.current, draggingNode.id, packetsRef.current, selectedAnnotation);
    } else if (e.type === "mouseup") {
      if (draggingNode) {
        // Unscale back to diagram coordinates using the same transform as draw()
        const rect = canvasRef.current.getBoundingClientRect();
        const { nodes } = diagramData;
        const allX = nodes.map(n => n.x), allY = nodes.map(n => n.y);
        const minX = Math.min(...allX), maxX = Math.max(...allX);
        const minY = Math.min(...allY), maxY = Math.max(...allY);
        const diagW = maxX - minX || 1;
        const diagH = maxY - minY || 1;
        const padX = 100, padY = 80;
        const fitScale = Math.min(
          (rect.width - padX * 2) / diagW,
          (rect.height - padY * 2) / diagH
        );
        const curZoom = zoomRef.current;
        const curPan = panRef.current;
        const scale = fitScale * curZoom;
        const canvasCx = rect.width / 2;
        const canvasCy = rect.height / 2;
        const diagMidX = (minX + maxX) / 2;
        const diagMidY = (minY + maxY) / 2;
        const offX = canvasCx - diagMidX * scale + curPan.x;
        const offY = canvasCy - diagMidY * scale + curPan.y;

        // Update all selected nodes if multiple selected
        if (selectedNodeIds.size > 1) {
          selectedNodeIds.forEach(nodeId => {
            const mappedNode = mappedRef.current.find(n => n.id === nodeId);
            const originalNode = diagramData.nodes.find(n => n.id === nodeId);
            if (mappedNode && originalNode) {
              originalNode.x = (mappedNode.x - offX) / scale;
              originalNode.y = (mappedNode.y - offY) / scale;
            }
          });
        } else {
          // Single node
          const originalNode = diagramData.nodes.find(n => n.id === draggingNode.id);
          if (originalNode) {
            originalNode.x = (draggingNode.x - offX) / scale;
            originalNode.y = (draggingNode.y - offY) / scale;
          }
        }
        if (onNodesMoved) onNodesMoved(diagramData.nodes);
      }
      setDraggingNode(null);
      panStartRef.current = null;
    }
  };

  const handleMouseMove = (e) => {
    // Handle box selection move
    if (boxSelectStart && !boxSelectEnd) {
      const { x, y } = getCanvasPos(e);
      setBoxSelectEnd({ x, y });
      redraw();
      return;
    }

    // Handle panning
    if (panStartRef.current && !draggingNode) {
      const { x, y } = getCanvasPos(e);
      setPanOffset(prev => ({
        x: prev.x + (x - panStartRef.current.x),
        y: prev.y + (y - panStartRef.current.y)
      }));
      panStartRef.current = { x, y };
      return;
    }

    const { x, y } = getCanvasPos(e);
    const node = hitTest(mappedRef.current, x, y);
    const newHoverId = node ? node.id : null;
    if (newHoverId !== hoveredRef.current) {
      hoveredRef.current = newHoverId;
      draw(selectedRef.current, hoveredRef.current, packetsRef.current, selectedAnnotation);
      canvasRef.current.style.cursor = annotationMode ? "crosshair" : 
        (boxSelectStart ? "crosshair" : e.shiftKey ? "grab" : node ? "pointer" : "default");
      if (onNodeHover) onNodeHover(node || null, e);
    }
  };

  const handleMouseLeave = () => {
    hoveredRef.current = null;
    panStartRef.current = null;
    setDraggingNode(null);
    draw(selectedRef.current, null, packetsRef.current, selectedAnnotation);
    if (onNodeHover) onNodeHover(null, null);
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + scroll = zoom centered on cursor
      const delta = e.deltaY > 0 ? 0.85 : 1.18;
      const { x, y } = getCanvasPos(e);
      setZoomLevel(prev => {
        const newZoom = Math.max(0.3, Math.min(5, prev * delta));
        const zoomRatio = newZoom / prev;
        setPanOffset(pan => ({
          x: x - zoomRatio * (x - pan.x),
          y: y - zoomRatio * (y - pan.y),
        }));
        return newZoom;
      });
    } else {
      // Plain scroll = pan (horizontal and vertical)
      setPanOffset(pan => ({
        x: pan.x - e.deltaX,
        y: pan.y - e.deltaY,
      }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach non-passive wheel listener so preventDefault works
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleGroupSelected = () => {
    if (selectedNodeIds.size < 2) return;
    const groupId = `group-${Date.now()}`;
    setDeviceGroups(prev => ({
      ...prev,
      [groupId]: {
        nodeIds: Array.from(selectedNodeIds),
        label: `Group ${Object.keys(prev).length + 1}`,
        color: ["#0ea5e9", "#22d3ee", "#10b981", "#f59e0b", "#ef4444"][Math.floor(Math.random() * 5)]
      }
    }));
  };

  const handleDeleteSelected = () => {
    if (selectedNodeIds.size === 0) return;
    diagramData.nodes = diagramData.nodes.filter(n => !selectedNodeIds.has(n.id));
    diagramData.links = diagramData.links.filter(l => 
      !selectedNodeIds.has(l.from) && !selectedNodeIds.has(l.to)
    );
    setSelectedNodeIds(new Set());
    redraw();
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(3, prev * 1.2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.3, prev * 0.8));
  const handleFitToScreen = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };
  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedNodeIds(new Set());
  };

  return (
    <>
      <div className="w-full rounded-xl overflow-hidden border border-border relative" style={{ background: "#0b1120" }}>
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ minHeight: 1100, display: "block", cursor: draggingNode ? "grabbing" : panStartRef.current ? "grabbing" : annotationMode ? "crosshair" : "grab", touchAction: "none" }}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => { handleMouseMove(e); handleMouseUpOrMove(e); }}
          onMouseUp={handleMouseUpOrMove}
          onMouseLeave={handleMouseLeave}
          onPointerDown={handlePointerDown}
        />
        <ZoomPanControls
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={handleFitToScreen}
          onResetView={handleResetView}
          disabled={annotationMode}
        />
        <SelectionControls
          selectionCount={selectedNodeIds.size}
          onClear={() => setSelectedNodeIds(new Set())}
          onGroupSelected={handleGroupSelected}
          onDeleteSelected={handleDeleteSelected}
          disabled={annotationMode}
        />
        {selectedNodeIds.size > 0 && (
          <div className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground z-10 space-y-1">
            <div>Shift+Click+Drag to box select • Ctrl+Click to select</div>
            <div>Drag selected devices to move group • Shift+Drag to pan</div>
          </div>
        )}
      </div>
      {editingNode && (
        <DevicePropertiesEditor
          node={editingNode}
          onSave={(updatedNode) => {
            const originalNode = diagramData.nodes.find(n => n.id === updatedNode.id);
            if (originalNode) {
              // Only update properties, preserve x and y from original
              const { x, y } = originalNode;
              Object.assign(originalNode, updatedNode);
              originalNode.x = x;
              originalNode.y = y;
              redraw();
              // Notify parent that node was updated so config snippet can refresh
              if (onNodeUpdate) onNodeUpdate(originalNode);
            }
            setEditingNode(null);
          }}
          onClose={() => setEditingNode(null)}
        />
      )}
    </>
  );
});

export default NetworkDiagram;