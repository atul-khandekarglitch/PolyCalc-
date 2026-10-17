/* ==========================================================
   DATA STRUCTURE: a polynomial is a plain JavaScript array.
   The coefficient of x^k is stored at index k.
     3x^2 + 2x + 5   ->   [5, 2, 3]
   Index = exponent, so array length = degree + 1.
   ========================================================== */
const MAX_DEG = 10;
const $ = id => document.getElementById(id);
const MINUS = '\u2212';
let currentOp = null;   // last operation chosen, so edits recalculate live

/* ---------- Polynomial algorithms (pure functions) ---------- */

// Pad an array with trailing zeros (highest powers) up to a given length.
function pad(arr, len) {
  const out = arr.slice();
  while (out.length < len) out.push(0);
  return out;
}

// Addition: align lengths, then R[k] = P[k] + Q[k]. Time O(max(n, m)).
function addPoly(P, Q) {
  const n = Math.max(P.length, Q.length);
  const A = pad(P, n), B = pad(Q, n), R = [];
  for (let k = 0; k < n; k++) R[k] = A[k] + B[k];
  return R;
}

// Subtraction: same alignment, R[k] = P[k] - Q[k].
function subPoly(P, Q) {
  const n = Math.max(P.length, Q.length);
  const A = pad(P, n), B = pad(Q, n), R = [];
  for (let k = 0; k < n; k++) R[k] = A[k] - B[k];
  return R;
}

// Multiplication (convolution): result has size deg(P) + deg(Q) + 1.
// x^i * x^j = x^(i+j), so each product P[i]*Q[j] is added at index i+j.
// Time O(n * m).
function mulPoly(P, Q) {
  const R = new Array(P.length + Q.length - 1).fill(0);
  for (let i = 0; i < P.length; i++)
    for (let j = 0; j < Q.length; j++)
      R[i + j] += P[i] * Q[j];
  return R;
}

// Remove leading zeros (highest powers) but keep at least one element.
function trim(arr) {
  const out = arr.slice();
  while (out.length > 1 && out[out.length - 1] === 0) out.pop();
  return out;
}

/* ---------- Formatting ---------- */

// Round away floating-point noise such as 0.30000000000000004.
const clean = v => Math.round(v * 1e9) / 1e9;
// Show whole numbers as-is and fractions with up to 4 decimals.
const show = v => Number.isInteger(v) ? String(v) : String(+v.toFixed(4));

// Turn an array into readable notation. Zero terms are skipped and a
// coefficient of 1 is hidden unless it is the constant term.
function format(arr) {
  let html = '';
  for (let k = arr.length - 1; k >= 0; k--) {
    const c = clean(arr[k]);
    if (c === 0) continue;
    const abs = Math.abs(c);
    const sign = c < 0 ? MINUS : '+';
    const coef = (abs !== 1 || k === 0) ? show(abs) : '';
    const variable = k === 0 ? '' : (k === 1 ? 'x' : 'x<sup>' + k + '</sup>');
    const term = coef + variable;
    if (html === '') html = (c < 0 ? MINUS : '') + term;
    else html += ' ' + sign + ' ' + term;
  }
  return html === '' ? '0' : html;
}

const plain = html => html.replace(/<sup>(\d+)<\/sup>/g, '^$1');
const sup = k => k === 0 ? '1' : (k === 1 ? 'x' : 'x<sup>' + k + '</sup>');

/* ---------- Input handling ---------- */

// Build coefficient inputs from highest power to lowest, keeping typed values.
function buildInputs(which) {
  const deg = parseInt($('deg' + which).value, 10);
  const box = $('c' + which);
  const old = {};
  box.querySelectorAll('input').forEach(i => old[i.dataset.pow] = i.value);
  box.innerHTML = '';
  for (let k = deg; k >= 0; k--) {
    const wrap = document.createElement('div');
    const lab = document.createElement('label');
    lab.htmlFor = 'in' + which + k;
    lab.innerHTML = k === 0 ? 'const' : sup(k);
    const inp = document.createElement('input');
    inp.type = 'number'; inp.step = 'any'; inp.id = 'in' + which + k;
    inp.dataset.pow = k; inp.placeholder = '0';
    inp.value = old[k] !== undefined ? old[k] : '';
    inp.addEventListener('input', recalc);
    wrap.append(lab, inp);
    box.appendChild(wrap);
  }
}

// Validate degree box; returns true if valid and shows a friendly message if not.
function checkDegree(which) {
  const el = $('deg' + which), err = $('err' + which);
  const raw = el.value.trim();
  const d = Number(raw);
  err.textContent = '';
  if (raw === '' || !Number.isInteger(d)) { err.textContent = 'Enter a whole number for the degree.'; return false; }
  if (d < 0) { err.textContent = 'Degree cannot be negative. Use 0 for a constant.'; return false; }
  if (d > MAX_DEG) { err.textContent = 'Degree is limited to ' + MAX_DEG + ' to keep results readable.'; return false; }
  return true;
}

// Read inputs into a constant-first array. Returns null if anything is empty.
function readPoly(which) {
  const arr = [];
  let ok = true;
  $('c' + which).querySelectorAll('input').forEach(i => {
    if (i.value.trim() === '' || !isFinite(Number(i.value))) { ok = false; i.style.borderColor = '#dc2626'; }
    else { i.style.borderColor = ''; arr[Number(i.dataset.pow)] = Number(i.value); }
  });
  if (!ok) { $('err' + which).textContent = 'Fill every coefficient, using 0 for missing terms.'; return null; }
  return arr;
}

/* ---------- Calculation and result display ---------- */

function calculate(op) {
  $('errGlobal').textContent = '';
  const okP = checkDegree('P'), okQ = checkDegree('Q');
  if (!okP || !okQ) { $('result').hidden = true; return; }
  const P = readPoly('P'), Q = readPoly('Q');
  if (!P || !Q) { $('result').hidden = true; $('errGlobal').textContent = 'Some coefficients are missing. Fill them in to calculate.'; return; }
  $('errP').textContent = ''; $('errQ').textContent = '';

  let R, name, sym, extra = '', suffix = '';
  const steps = [];
  if (op.length === 2) {   // calculus on one polynomial: dP, dQ, iP, iQ
    const src = op[1] === 'P' ? P : Q, nm = op[1] + '(x)';
    if (op[0] === 'd') {
      name = 'Derivative of ' + nm; R = derive(src);
      steps.push('Rule: d/dx (c·x^k) = k·c·x^(k−1). The coefficient at index k moves to index k−1 and is multiplied by k.');
      for (let k = 1; k < src.length; k++) steps.push('Index ' + (k - 1) + ': ' + k + ' × ' + src[k] + ' = ' + clean(k * src[k]));
      if (src.length === 1) steps.push('A constant has derivative 0.');
    } else {
      name = 'Integral of ' + nm; R = integrate(src); suffix = ' + C';
      steps.push('Rule: ∫ c·x^k dx = c/(k+1)·x^(k+1). The coefficient at index k moves to index k+1 and is divided by k+1.');
      for (let k = 0; k < src.length; k++) steps.push('Index ' + (k + 1) + ': ' + src[k] + ' ÷ ' + (k + 1) + ' = ' + show(clean(src[k] / (k + 1))));
      steps.push('Index 0 holds the constant of integration C.');
    }
  } else if (op === 'div') {
    name = 'Division'; sym = '÷';
    const D = trim(Q);
    if (D.length === 1 && D[0] === 0) { $('result').hidden = true; $('errGlobal').textContent = 'Cannot divide by the zero polynomial. Give Q(x) a non-zero coefficient.'; return; }
    const qr = divPoly(P, D);
    R = qr.q; extra = qr.r;
    steps.push(...qr.steps);
  } else if (op === 'mul') {
    name = 'Multiplication'; sym = '×';
    R = mulPoly(P, Q);
    steps.push('Result array has size ' + (P.length - 1) + ' + ' + (Q.length - 1) + ' + 1 = ' + R.length + '.');
    for (let k = 0; k < R.length; k++) {
      const parts = [];
      for (let i = 0; i < P.length; i++) {
        const j = k - i;
        if (j >= 0 && j < Q.length) parts.push('(' + P[i] + ')(' + Q[j] + ')');
      }
      steps.push('Index ' + k + ' (' + sup(k) + '): ' + parts.join(' + ') + ' = ' + clean(R[k]));
    }
  } else {
    const isAdd = op === 'add';
    name = isAdd ? 'Addition' : 'Subtraction'; sym = isAdd ? '+' : MINUS;
    R = isAdd ? addPoly(P, Q) : subPoly(P, Q);
    const n = R.length;
    steps.push('P has ' + P.length + ' coefficients and Q has ' + Q.length + '. Pad the shorter with zeros to length ' + n + '.');
    steps.push('P = [' + pad(P, n).join(', ') + ']   Q = [' + pad(Q, n).join(', ') + ']');
    const A = pad(P, n), B = pad(Q, n);
    for (let k = 0; k < n; k++)
      steps.push('Index ' + k + ' (' + sup(k) + '): ' + A[k] + ' ' + sym + ' (' + B[k] + ') = ' + clean(R[k]));
  }
  const T = trim(R.map(clean));
  steps.push('Drop leading zeros and format. Zero terms are omitted.');

  $('resOp').textContent = name;
  $('resP').innerHTML = '<b>P(x)</b> = ' + format(P);
  $('resQ').innerHTML = '<b>Q(x)</b> = ' + format(Q);
  $('resMain').innerHTML = op === 'div'
    ? 'Quotient: ' + format(T) + '<br>Remainder: ' + format(trim(extra.map(clean)))
    : format(T) + suffix;
  $('resSteps').innerHTML = steps.map(s => '<li>' + s + '</li>').join('');
  $('resArr').textContent = '[' + T.map(show).join(', ') + ']'
    + (op === 'div' ? '  remainder [' + trim(extra.map(clean)).map(show).join(', ') + ']' : '');
  $('result').hidden = false;
  last = { P, Q, T, name };
  refreshExtras();
}

// Re-run the last operation whenever an input changes (live update).
function recalc() { if (currentOp) calculate(currentOp); }

function setOp(op) {
  currentOp = op;
  document.querySelectorAll('.btn-op').forEach(b => b.setAttribute('aria-pressed', b.dataset.op === op));
  calculate(op);
  if (!$('result').hidden) pushHistory();
  if (!$('result').hidden) $('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ---------- Wiring ---------- */

function setPoly(which, coeffsHighFirst) {
  $('deg' + which).value = coeffsHighFirst.length - 1;
  $('c' + which).innerHTML = '';
  buildInputs(which);
  coeffsHighFirst.forEach((v, idx) => $('in' + which + (coeffsHighFirst.length - 1 - idx)).value = v);
}

['P', 'Q'].forEach(w => {
  $('deg' + w).addEventListener('input', () => {
    if (checkDegree(w)) { buildInputs(w); recalc(); }
  });
});
document.querySelectorAll('.btn-op').forEach(b => b.addEventListener('click', () => setOp(b.dataset.op)));
$('presetBtn').addEventListener('click', () => {
  setPoly('P', [2, 3, 4]);   // 2x^2 + 3x + 4
  setPoly('Q', [1, 5, 2]);   // x^2 + 5x + 2
  ['errP', 'errQ', 'errGlobal'].forEach(id => $(id).textContent = '');
  recalc();
});
$('clearBtn').addEventListener('click', () => {
  currentOp = null;
  $('degP').value = 2; $('degQ').value = 2;
  $('cP').innerHTML = ''; $('cQ').innerHTML = '';
  buildInputs('P'); buildInputs('Q');
  ['errP', 'errQ', 'errGlobal'].forEach(id => $(id).textContent = '');
  document.querySelectorAll('.btn-op').forEach(b => b.setAttribute('aria-pressed', 'false'));
  $('result').hidden = true;
});

// Draw an array diagram: box = value, below it the index and power.
function drawCells(id, arr) {
  $(id).innerHTML = arr.map((v, k) =>
    '<div class="cell"><div class="box">' + v + '</div><div class="idx">index ' + k +
    '</div><div class="pw">' + sup(k).replace('1', 'x<sup>0</sup>') + '</div></div>').join('');
}
/* ---------- Advanced features ---------- */
let last = null;   // latest result {P, Q, T, name}, used by evaluate, graph and history
const hist = [];

// Division: long division on arrays, from the highest index down.
// Each step finds one quotient coefficient t = r[k] / lead(Q), then subtracts t*Q shifted to index k.
function divPoly(P, D) {
  const steps = [], dd = D.length - 1, lead = D[dd];
  const r = trim(P.map(clean));
  if (r.length - 1 < dd) {
    steps.push('deg(P) < deg(Q), so the quotient is 0 and the remainder is P.');
    return { q: [0], r, steps };
  }
  const q = new Array(r.length - dd).fill(0);
  for (let k = r.length - 1; k >= dd; k--) {
    const pos = k - dd, t = r[k] / lead;
    q[pos] = t;
    steps.push('Index ' + k + ': ' + show(clean(r[k])) + ' ÷ ' + show(lead) + ' = ' + show(clean(t)) + ' → quotient[' + pos + ']. Subtract ' + show(clean(t)) + '·Q(x)·x^' + pos + '.');
    for (let j = 0; j <= dd; j++) r[pos + j] -= t * D[j];
    r[k] = 0;
  }
  return { q, r: dd === 0 ? [0] : r.slice(0, dd), steps };
}

// Derivative: coefficient at index k moves to k-1 and is multiplied by k.
const derive = a => a.length === 1 ? [0] : a.slice(1).map((c, i) => c * (i + 1));
// Integral: coefficient at index k moves to k+1 and is divided by k+1 (index 0 is the constant C).
const integrate = a => [0].concat(a.map((c, k) => c / (k + 1)));
// Horner's method: P(x) = a0 + x(a1 + x(a2 + ...)), n multiplications.
function horner(a, x) { let r = 0; for (let k = a.length - 1; k >= 0; k--) r = r * x + a[k]; return r; }

function refreshExtras() {
  const raw = $('evalX').value.trim(), x = Number(raw);
  if (raw === '' || !isFinite(x)) $('evalOut').textContent = 'Enter a number for x.';
  else {
    const f = a => show(clean(horner(a, x)));
    $('evalOut').innerHTML = 'P = <b>' + f(last.P) + '</b> &nbsp; Q = <b>' + f(last.Q) + '</b> &nbsp; Result = <b>' + f(last.T) + '</b>';
  }
  drawGraph();
}

// Plot P, Q and the result. Y scale ignores extreme spikes so high degrees stay readable.
function drawGraph() {
  const cv = $('graph'), c = cv.getContext('2d'), W = cv.width, H = cv.height;
  const a = Math.min(50, Math.max(1, Number($('graphR').value) || 5));
  const S = [[last.P, '#6366f1'], [last.Q, '#16a34a'], [last.T, '#dc2626']];
  const xs = Array.from({ length: 241 }, (_, i) => -a + 2 * a * i / 240);
  const ys = S.map(s => xs.map(x => horner(s[0], x)));
  const mags = ys.flat().filter(isFinite).map(Math.abs).sort((p, q) => p - q);
  const ym = Math.max(1, (mags[Math.floor(mags.length * 0.9)] || 1) * 1.3);
  const X = x => (x + a) / (2 * a) * W, Y = y => H / 2 - y / ym * (H / 2);
  c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
  c.font = '12px sans-serif'; c.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    const gx = X(i * a / 4), gy = Y(i * ym / 4);
    c.strokeStyle = i === 0 ? '#475569' : '#e2e8f0';
    c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, H); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke();
    if (i) { c.fillStyle = '#64748b'; c.fillText(show(+(i * a / 4).toFixed(2)), gx + 3, H / 2 + 14); c.fillText(show(+(i * ym / 4).toFixed(1)), 4, gy - 3); }
  }
  S.forEach((s, n) => {
    c.strokeStyle = s[1]; c.lineWidth = 2.5; c.beginPath();
    xs.forEach((x, i) => i ? c.lineTo(X(x), Y(ys[n][i])) : c.moveTo(X(x), Y(ys[n][i])));
    c.stroke();
  });
}

function pushHistory() {
  hist.unshift('<b>' + last.name + ':</b> ' + $('resMain').innerHTML.replace(/<br>/g, ' ; '));
  if (hist.length > 8) hist.pop();
  $('hist').innerHTML = hist.map(h => '<li>' + h + '</li>').join('');
}

$('evalX').addEventListener('input', () => last && refreshExtras());
$('graphR').addEventListener('input', () => last && drawGraph());
$('copyBtn').addEventListener('click', () => {
  const t = last.name + ': ' + plain($('resMain').innerHTML).replace(/<br>/g, '; ').replace(/\u2212/g, '-');
  const done = () => { $('copyBtn').textContent = 'Copied'; setTimeout(() => $('copyBtn').textContent = 'Copy result', 1500); };
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); };
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
});

drawCells('heroCells', [5, 2, 3]);
drawCells('howCells', [5, 2, 3]);
buildInputs('P'); buildInputs('Q');