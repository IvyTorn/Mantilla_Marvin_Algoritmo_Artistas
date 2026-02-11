// =====================
// 1) Datos (edítalos)
// =====================

// Artistas #1 a #30 (según tu selección)
const estrellas = [
  "Meryl Streep",
  "Robert De Niro",
  "Al Pacino",
  "Denzel Washington",
  "Leonardo DiCaprio",
  "Brad Pitt",
  "Tom Hanks",
  "Johnny Depp",
  "Matt Damon",
  "Christian Bale",
  "Joaquin Phoenix",
  "Jake Gyllenhaal",
  "Ryan Gosling",
  "George Clooney",
  "Will Smith",
  "Samuel L. Jackson",
  "Morgan Freeman",
  "Kevin Spacey",
  "Russell Crowe",
  "Hugh Jackman",
  "Keanu Reeves",
  "Nicolas Cage",
  "Mark Ruffalo",
  "Robert Downey Jr.",
  "Chris Evans",
  "Chris Hemsworth",
  "Benedict Cumberbatch",
  "Michael Fassbender",
  "Daniel Day-Lewis",
  "Anthony Hopkins"
];

// Segmentos = “quién está votando” (público/perfil)
const segmentos = {
  "G": "Público general",
  "C": "Cinéfilos (premios/autor)",
  "B": "Fans de blockbusters",
  "I": "Fans de cine indie",
  "F": "Fans de fantasía / sci-fi"
};

// Contextos = “con qué criterio evalúas” (pregunta)
const contextos = {
  "A": "¿Quién consideras mejor en ACTUACIÓN (interpretación pura)?",
  "V": "¿Quién es más VERSÁTIL (rango de géneros/personajes)?",
  "M": "¿Quién es más MEMORABLE/ICÓNICO (impacto cultural)?"
};

// Elo
const RATING_INICIAL = 1000;
const K = 32;

// =====================
// 2) Estado + storage
// =====================
const STORAGE_KEY = "cinemash_state_v1";

function defaultState(){
  const buckets = {};
  for (const seg of Object.keys(segmentos)){
    for (const ctx of Object.keys(contextos)){
      const key = `${seg}__${ctx}`;
      buckets[key] = {};
      estrellas.forEach(e => buckets[key][e] = RATING_INICIAL);
    }
  }
  return { buckets, votes: [] };
}

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try { return JSON.parse(raw); }
  catch { return defaultState(); }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// =====================
// 3) Utilidades Elo
// =====================
function expectedScore(ra, rb){
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function updateElo(bucket, estrellaA, estrellaB, winner){ // winner: "A" o "B"
  const ra = bucket[estrellaA], rb = bucket[estrellaB];
  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);

  const sa = (winner === "A") ? 1 : 0;
  const sb = (winner === "B") ? 1 : 0;

  bucket[estrellaA] = ra + K * (sa - ea);
  bucket[estrellaB] = rb + K * (sb - eb);
}

function randomPair(){
  const a = estrellas[Math.floor(Math.random() * estrellas.length)];
  let b = a;
  while (b === a){
    b = estrellas[Math.floor(Math.random() * estrellas.length)];
  }
  return [a, b];
}

function bucketKey(seg, ctx){ return `${seg}__${ctx}`; }

function topN(bucket, n=10){
  const arr = Object.entries(bucket).map(([estrella, rating]) => ({estrella, rating}));
  arr.sort((x,y) => y.rating - x.rating);
  return arr.slice(0, n);
}

// “Rating de estrellas” (★) como visualización del Elo dentro del bucket
function bucketMinMax(bucket){
  let min = Infinity, max = -Infinity;
  for (const v of Object.values(bucket)){
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) { min = 0; max = 0; }
  return { min, max };
}

function ratingToStars(rating, min, max){
  if ((max - min) < 1e-9) return "★★★☆☆";
  const norm = (rating - min) / (max - min);
  const s = Math.min(5, Math.max(1, 1 + Math.round(norm * 4)));
  return "★".repeat(s) + "☆".repeat(5 - s);
}

// =====================
// 4) UI Wiring
// =====================
const segmentSelect = document.getElementById("segmentSelect");
const contextSelect = document.getElementById("contextSelect");
const questionEl = document.getElementById("question");

const labelA = document.getElementById("labelA");
const labelB = document.getElementById("labelB");

const btnA = document.getElementById("btnA");
const btnB = document.getElementById("btnB");
const btnNewPair = document.getElementById("btnNewPair");

const btnShowTop = document.getElementById("btnShowTop");
const topBox = document.getElementById("topBox");

const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");

let currentA = null;
let currentB = null;

function fillSelect(selectEl, obj){
  selectEl.innerHTML = "";
  for (const [k, v] of Object.entries(obj)){
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} — ${v}`;
    selectEl.appendChild(opt);
  }
}

fillSelect(segmentSelect, segmentos);
fillSelect(contextSelect, contextos);

// defaults
segmentSelect.value = "G";
contextSelect.value = "A";

function refreshQuestion(){
  questionEl.textContent = contextos[contextSelect.value];
}

function newDuel(){
  [currentA, currentB] = randomPair();
  labelA.textContent = currentA;
  labelB.textContent = currentB;
  refreshQuestion();
}

function renderTop(){
  const seg = segmentSelect.value;
  const ctx = contextSelect.value;
  const bucket = state.buckets[bucketKey(seg, ctx)];
  const rows = topN(bucket, 10);
  const { min, max } = bucketMinMax(bucket);

  topBox.innerHTML = rows.map((r, idx) => `
    <div class="toprow">
      <div><b>${idx+1}.</b> ${r.estrella}</div>
      <div class="score">
        <span class="stars">${ratingToStars(r.rating, min, max)}</span>
        <span class="num">${r.rating.toFixed(1)}</span>
      </div>
    </div>
  `).join("");
}

function vote(winner){ // "A" o "B"
  const seg = segmentSelect.value;
  const ctx = contextSelect.value;
  const key = bucketKey(seg, ctx);
  const bucket = state.buckets[key];

  updateElo(bucket, currentA, currentB, winner);

  const ganador = (winner === "A") ? currentA : currentB;
  const perdedor = (winner === "A") ? currentB : currentA;

  state.votes.push({
    ts: new Date().toISOString(),
    segmento: segmentos[seg],
    contexto: contextos[ctx],
    A: currentA,
    B: currentB,
    ganador,
    perdedor
  });

  saveState();
  renderTop();
  newDuel();
}

btnA.addEventListener("click", () => vote("A"));
btnB.addEventListener("click", () => vote("B"));
btnNewPair.addEventListener("click", () => newDuel());
btnShowTop.addEventListener("click", () => renderTop());

segmentSelect.addEventListener("change", () => { renderTop(); refreshQuestion(); });
contextSelect.addEventListener("change", () => { renderTop(); refreshQuestion(); });

btnReset.addEventListener("click", () => {
  if (!confirm("Esto borrará rankings y votos guardados en este navegador. ¿Continuar?")) return;
  state = defaultState();
  saveState();
  renderTop();
  newDuel();
});

btnExport.addEventListener("click", () => {
  if (state.votes.length === 0){
    alert("Aún no hay votos para exportar.");
    return;
  }

  const headers = ["ts","segmento","contexto","A","B","ganador","perdedor"];
  const lines = [headers.join(",")];

  for (const v of state.votes){
    const row = headers.map(h => {
      const val = String(v[h] ?? "").replaceAll('"','""');
      return `"${val}"`;
    }).join(",");
    lines.push(row);
  }

  const blob = new Blob([lines.join("\n")], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "cinemash_votos.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
});

// init
newDuel();
renderTop();
refreshQuestion();
