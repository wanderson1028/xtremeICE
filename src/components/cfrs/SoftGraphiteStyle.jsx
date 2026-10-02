import React from "react";

// Scoped Soft Graphite theme — only consumed by /CFRS and /CFRS/organizations.
// Palette: surface #eeeeee, cards #fafafa, borders #d4d4d4, text #171717, accent #b91c1c.
export default function SoftGraphiteStyle() {
  return (
    <style>{`
    .cfrs-sg{
      --sg-surface:#eeeeee;
      --sg-card:#fafafa;
      --sg-card-grad:linear-gradient(145deg,#ffffff,#f5f5f5);
      --sg-border:#d4d4d4;
      --sg-text:#171717;
      --sg-muted:#404040;
      --sg-accent:#b91c1c;
      --sg-accent-soft:#b91c1c14;
      --sg-radius:15px;
      --sg-shadow:0 2px 4px #17171710, 0 9px 22px -8px #17171723, inset 0 1px #fff;
      --sg-shadow-lg:0 4px 8px #17171718, 0 18px 40px -10px #1717172e, inset 0 1px #fff;
      --sg-shadow-hover:0 6px 10px #1717171c, 0 24px 48px -12px #17171733, inset 0 1px #fff;
      background:var(--sg-surface);
      color:var(--sg-text);
      font-variant-numeric:tabular-nums;
    }
    .cfrs-sg *{border-color:var(--sg-border);}
    .cfrs-sg .sg-micro{font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--sg-muted);line-height:1.2;}
    .cfrs-sg .sg-body{font-size:13px;line-height:1.65;color:var(--sg-text);}
    .cfrs-sg .sg-tabular{font-variant-numeric:tabular-nums;}

    /* Three-tier card hierarchy */
    .cfrs-sg .sg-panel{
      border-radius:var(--sg-radius);
      background:var(--sg-card-grad);
      border:1px solid var(--sg-border);
      box-shadow:var(--sg-shadow);
    }
    .cfrs-sg .sg-panel-hover{transition:transform .25s cubic-bezier(.4,0,.2,1),box-shadow .25s cubic-bezier(.4,0,.2,1);}
    .cfrs-sg .sg-panel-hover:hover{transform:translateY(-2px);box-shadow:var(--sg-shadow-hover);}
    .cfrs-sg .sg-tile{border-radius:12px;background:var(--sg-card-grad);border:1px solid var(--sg-border);box-shadow:0 1px 2px #17171710,0 4px 10px -4px #1717171a,inset 0 1px #fff;}
    .cfrs-sg .sg-score-card{
      border-radius:var(--sg-radius);
      background:var(--sg-card-grad);
      border:1px solid var(--sg-border);
      box-shadow:var(--sg-shadow-lg);
    }

    /* Inset-bevel inputs */
    .cfrs-sg .sg-input{
      background:linear-gradient(180deg,#f5f5f5,#ededed);
      border:1px solid var(--sg-border);
      border-radius:10px;
      box-shadow:inset 0 2px 5px #17171715, inset 0 1px #d4d4d4;
      color:var(--sg-text);
      outline:none;
      transition:box-shadow .2s ease, border-color .2s ease;
    }
    .cfrs-sg .sg-input::placeholder{color:#737373;}
    .cfrs-sg .sg-input:focus{border-color:var(--sg-accent);box-shadow:inset 0 2px 5px #17171715, inset 0 1px #d4d4d4, 0 0 0 3px #b91c1c66;}

    /* Buttons */
    .cfrs-sg .sg-btn{
      border-radius:10px;border:1px solid var(--sg-border);background:var(--sg-card-grad);
      box-shadow:0 1px 2px #17171712, inset 0 1px #fff;
      transition:transform .15s ease, box-shadow .15s ease, background .15s ease;
      color:var(--sg-text);
    }
    .cfrs-sg .sg-btn:hover{transform:translateY(-1px);box-shadow:0 3px 6px #1717171c, inset 0 1px #fff;}
    .cfrs-sg .sg-btn:active{transform:translateY(0);box-shadow:inset 0 1px 2px #17171722;}
    .cfrs-sg .sg-btn:focus-visible{outline:3px solid #b91c1c66;outline-offset:1px;}
    .cfrs-sg .sg-btn-primary{
      background:linear-gradient(180deg,#dc2626,#b91c1c);color:#fff;border:1px solid #991b1b;
      box-shadow:0 2px 5px #b91c1c33, inset 0 1px #ffffff44;
    }
    .cfrs-sg .sg-btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 12px #b91c1c44, inset 0 1px #ffffff55;}
    .cfrs-sg .sg-btn-primary:active{transform:translateY(0);box-shadow:inset 0 2px 4px #7f1d1d;}
    .cfrs-sg .sg-btn-danger{background:linear-gradient(180deg,#f87171,#ef4444);color:#fff;border:1px solid #dc2626;box-shadow:0 2px 5px #ef444433, inset 0 1px #ffffff44;}
    .cfrs-sg .sg-btn-danger:hover{transform:translateY(-1px);box-shadow:0 5px 12px #ef444444;}
    .cfrs-sg .sg-btn:disabled{opacity:.5;cursor:not-allowed;transform:none!important;}

    /* Score bar marker */
    .cfrs-sg .sg-marker{
      position:absolute;top:50%;height:20px;width:3px;transform:translate(-50%,-50%);
      border-radius:9999px;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.8);
      animation:sg-marker-glow 1.8s ease-in-out infinite alternate, sg-marker-slide .7s cubic-bezier(.2,.8,.2,1) both;
    }
    @keyframes sg-marker-glow{0%{box-shadow:0 0 4px rgba(255,255,255,.6);}50%{box-shadow:0 0 12px rgba(255,255,255,.95);}100%{box-shadow:0 0 6px rgba(255,255,255,.75);}}
    @keyframes sg-marker-slide{from{left:0!important;opacity:0;}}

    /* Section entrance */
    .cfrs-sg .sg-enter{opacity:0;transform:translateY(9px);animation:sg-enter .55s cubic-bezier(.2,.8,.2,1) forwards;}
    @keyframes sg-enter{to{opacity:1;transform:translateY(0);}}

    /* Skeleton shimmer */
    .cfrs-sg .sg-skeleton{background:linear-gradient(90deg,#e5e5e5 25%,#f5f5f5 50%,#e5e5e5 75%);background-size:200% 100%;animation:sg-shimmer 1.4s infinite;border-radius:8px;}
    @keyframes sg-shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}

    /* History table */
    .cfrs-sg .sg-table{border-collapse:separate;border-spacing:0;}
    .cfrs-sg .sg-table thead th{position:sticky;top:0;background:#f5f5f5;z-index:2;}
    .cfrs-sg .sg-table tbody tr:nth-child(even){background:#f3f3f3;}
    .cfrs-sg .sg-table tbody tr:hover{background:#fef2f2;}
    .cfrs-sg .sg-table tbody tr{transition:background .15s ease;}

    /* Badges */
    .cfrs-sg .sg-badge{display:inline-flex;align-items:center;gap:5px;border-radius:9999px;padding:3px 10px;font-size:10px;font-weight:600;letter-spacing:.04em;border:1px solid;line-height:1.4;}

    /* Print */
    @media print{
      .cfrs-sg{background:#fff;}
      .cfrs-sg .sg-panel,.cfrs-sg .sg-score-card,.cfrs-sg .sg-tile{box-shadow:none;background:#fff;border:1px solid #ccc;}
      .cfrs-sg .sg-panel-hover:hover,.cfrs-sg .sg-btn,.cfrs-sg .sg-btn-primary,.cfrs-sg .sg-btn-danger{transform:none!important;box-shadow:none!important;}
      .cfrs-sg .sg-marker{animation:none;}
      .cfrs-sg .sg-enter{opacity:1;transform:none;animation:none;}
    }
    `}</style>
  );
}