// Exportar como no app: Word (.docx, uma coluna) e imagem PNG (fundo branco,
// 2 colunas se a cifra for comprida). Gera o arquivo e baixa.
import type { Song } from './types';
import { isRefrao } from './core';
import { corForte, corForteHex } from './tema';
import { prefs } from './nav';

// ---------- linhas da cifra (mesmo ChartLayout do app) ----------
interface Linha { text: string; kind: 0 | 1 | 2 | 3; refrao?: boolean } // 0 seção, 1 acorde, 2 letra, 3 branco
const unidades = (r: Linha) => (r.kind === 0 ? 1.7 : r.kind === 3 ? 0.8 : 1);

function linhaAcordes(l: Song['sections'][0]['lines'][0]): string {
  let s = '';
  for (const c of [...l.chords].sort((a, b) => a.idx - b.idx)) {
    const at = Math.max(0, c.idx);
    if (s.length < at) s = s.padEnd(at);
    else if (s.length) s += ' ';
    s += c.sym;
  }
  return s;
}

function blocos(song: Song): Linha[][] {
  const out: Linha[][] = [];
  let b: Linha[] = [];
  const fecha = () => { if (b.some((r) => r.kind !== 3)) out.push(b); b = []; };
  for (const sec of song.sections) {
    const refrao = isRefrao(sec.name);
    fecha();
    if (out.length) b.push({ text: '', kind: 3 });
    if (sec.name) b.push({ text: sec.name.toUpperCase(), kind: 0 });
    for (const l of sec.lines) {
      if (!l.chords.length && !l.lyric.trim()) { fecha(); b.push({ text: '', kind: 3 }); continue; }
      if (l.chords.length) b.push({ text: linhaAcordes(l), kind: 1 });
      b.push({ text: l.lyric || ' ', kind: 2, refrao });
    }
  }
  fecha();
  return out;
}
const linhas = (s: Song) => blocos(s).flat();

// ---------- arquivo ----------
const limpa = (s: string) => s.replace(/[^\p{L}\p{N}\s.-]/gu, '').trim() || 'cifra';
function baixar(blob: Blob, nome: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------- zip sem compressão (o .docx é um zip de XMLs) ----------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array) {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zip(arquivos: [string, string][]): Blob {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let off = 0;
  for (const [nome, txt] of arquivos) {
    const n = enc.encode(nome), d = enc.encode(txt), crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true);
    h.setUint16(26, n.length, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, d.length, true);
    c.setUint32(24, d.length, true); c.setUint16(28, n.length, true); c.setUint32(42, off, true);
    partes.push(new Uint8Array(h.buffer), n, d);
    central.push(new Uint8Array(c.buffer), n);
    off += 30 + n.length + d.length;
  }
  const tam = central.reduce((a, x) => a + x.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true);
  fim.setUint16(10, arquivos.length, true); fim.setUint32(12, tam, true); fim.setUint32(16, off, true);
  return new Blob([...partes, ...central, new Uint8Array(fim.buffer)] as BlobPart[],
    { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

// ---------- Word ----------
const PAG_W = 595, PAG_H = 842, MARGEM = 12, BASE = 13, CHAR_W = 0.56, LINHA_H = 1.2, TRACK = -0.04;
const tw = (pt: number) => Math.round(pt * 20);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONO = '<w:rFonts w:ascii="JetBrains Mono" w:hAnsi="JetBrains Mono" w:cs="Consolas"/>';

function fonteDocx(song: Song) {
  const len = linhas(song).filter((r) => r.kind === 1 || r.kind === 2).reduce((m, r) => Math.max(m, r.text.length), 1);
  return Math.min(BASE, (PAG_W - 2 * MARGEM) / (len * CHAR_W));
}

function paragrafo(r: Linha, font: number, cor: string) {
  const sp = `<w:spacing w:before="0" w:after="0" w:line="${tw(font * unidades(r) * LINHA_H)}" w:lineRule="exact"/>`;
  if (r.kind === 3) return `<w:p><w:pPr>${sp}</w:pPr></w:p>`;
  const size = r.kind === 0 ? font * 0.85 : font;
  const negrito = r.kind !== 2 || r.refrao;
  const colorido = r.kind === 0 || r.kind === 1;
  const hp = Math.round(size * 2);
  const rPr = `<w:rPr>${MONO}${negrito ? '<w:b/>' : ''}${colorido ? `<w:color w:val="${cor}"/>` : ''}`
    + `<w:sz w:val="${hp}"/><w:szCs w:val="${hp}"/><w:spacing w:val="${tw(size * TRACK)}"/></w:rPr>`;
  const keep = r.kind === 0 || r.kind === 1 ? '<w:keepNext/>' : '';
  return `<w:p><w:pPr>${sp}${keep}</w:pPr><w:r>${rPr}<w:t xml:space="preserve">${esc(r.text)}</w:t></w:r></w:p>`;
}

function corpoMusica(song: Song, titulo: string, cor: string) {
  const font = fonteDocx(song);
  const sub = [song.artist, `Tom: ${song.key}`, song.capo ? `Capo ${song.capo}` : ''].filter(Boolean).join('   •   ');
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr>${MONO}<w:b/><w:sz w:val="28"/></w:rPr>`
    + `<w:t xml:space="preserve">${esc(titulo)}</w:t></w:r></w:p>`
    + `<w:p><w:pPr><w:spacing w:before="0" w:after="60"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="999999"/></w:pBdr></w:pPr>`
    + `<w:r><w:rPr>${MONO}<w:sz w:val="18"/><w:color w:val="666666"/></w:rPr><w:t xml:space="preserve">${esc(sub)}</w:t></w:r></w:p>`
    + linhas(song).map((r) => paragrafo(r, font, cor)).join('');
}

function docx(corpo: string): Blob {
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + corpo
    + `<w:sectPr><w:pgSz w:w="${tw(PAG_W)}" w:h="${tw(PAG_H)}"/><w:pgMar w:top="${tw(MARGEM)}" w:right="${tw(MARGEM)}" `
    + `w:bottom="${tw(MARGEM)}" w:left="${tw(MARGEM)}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', doc],
  ]);
}

export function wordMusica(song: Song, prefixo = '') {
  baixar(docx(corpoMusica(song, song.title, corForteHex(prefs.cor))), `${limpa(prefixo + song.title)}.docx`);
}

/** Repertório: capa com a lista numerada + uma cifra por página. */
export function wordRepertorio(nome: string, songs: Song[]) {
  const cor = corForteHex(prefs.cor);
  let b = `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr>${MONO}<w:b/><w:sz w:val="52"/><w:color w:val="${cor}"/></w:rPr>`
    + `<w:t xml:space="preserve">${esc(nome)}</w:t></w:r></w:p>`;
  songs.forEach((s, i) => {
    b += `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr><w:r><w:rPr>${MONO}<w:sz w:val="28"/></w:rPr>`
      + `<w:t xml:space="preserve">${i + 1}.  ${esc(s.title)}</w:t></w:r></w:p>`;
  });
  songs.forEach((s, i) => {
    b += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' + corpoMusica(s, `${i + 1}. ${s.title}`, cor);
  });
  baixar(docx(b), `${limpa(nome)}.docx`);
}

// ---------- imagem ----------
const ESCALA = 3, PRETO = '#111111';

async function fontes(px: number) {
  try {
    await Promise.all([
      document.fonts.load(`${px}px "JetBrains Mono"`),
      document.fonts.load(`700 ${px}px "JetBrains Mono"`),
      document.fonts.load(`800 ${px}px "JetBrains Mono"`),
    ]);
  } catch { /* usa a monoespaçada do sistema */ }
}

interface Op { x: number; y: number; t: string; font: string; cor: string }
interface Bloco { ops: Op[]; h: number; w: number; sec: number; junto?: boolean }

function salvarPng(cv: HTMLCanvasElement, nome: string) {
  cv.toBlob((b) => b && baixar(b, `${limpa(nome)}.png`), 'image/png');
}

function desenhar(ops: Op[], w: number, h: number, extra?: (g: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w * ESCALA); cv.height = Math.ceil(h * ESCALA);
  const g = cv.getContext('2d')!;
  g.scale(ESCALA, ESCALA);
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  extra?.(g);
  g.textBaseline = 'top';
  for (const o of ops) { g.font = o.font; g.fillStyle = o.cor; g.fillText(o.t, o.x, o.y); }
  return cv;
}

export async function imagemMusica(song: Song, prefixo = '') {
  const fs = 22, cor = corForte(prefs.cor);
  await fontes(fs);
  const mono = (peso: number, px: number) => `${peso} ${px}px "JetBrains Mono", Consolas, monospace`;
  const fLetra = mono(400, fs), fAc = mono(700, fs * 0.92), fSec = mono(800, fs * 0.72);
  const g = document.createElement('canvas').getContext('2d')!;
  const larg = (t: string, f: string) => { g.font = f; return g.measureText(t).width; };
  const charW = larg('M', fLetra), acH = fs * 0.92 * 1.18, letraH = fs * 1.25 * 1.05;
  const padX = 32, padY = 28, gapCol = 44;

  const bl: Bloco[] = [];
  song.sections.forEach((sec, si) => {
    if (sec.name) {
      const t = sec.name.toUpperCase();
      bl.push({ ops: [{ x: 0, y: fs * 0.5, t, font: fSec, cor }], h: fs * 0.5 + fs * 0.72 * 1.5, w: larg(t, fSec), sec: si, junto: true });
    }
    for (const l of sec.lines) {
      const ops: Op[] = [];
      let h = 0, w = 0, dir = -1e9;
      if (l.chords.length) {
        for (const c of [...l.chords].sort((a, b) => a.idx - b.idx)) {
          let x = Math.min(Math.max(0, c.idx), l.lyric.length) * charW;
          if (x < dir + 8) x = dir + 8;
          const cw = larg(c.sym, fAc);
          ops.push({ x, y: 0, t: c.sym, font: fAc, cor });
          w = Math.max(w, x + cw);
          dir = x + cw + charW * 0.3;
        }
        h = acH + 2;
      }
      ops.push({ x: 0, y: h, t: l.lyric || ' ', font: fLetra, cor: PRETO });
      w = Math.max(w, larg(l.lyric || ' ', fLetra));
      bl.push({ ops, h: h + letraH, w, sec: si });
    }
  });

  const altura = bl.reduce((a, b) => a + b.h, 0);
  const largura = bl.reduce((a, b) => Math.max(a, b.w), 0);
  const cols = altura > largura * 1.8 && bl.length > 6 ? 2 : 1;
  let corte = bl.length;
  if (cols === 2) {
    const alvo = altura / 2;
    let melhor = Infinity, acc = 0;
    corte = -1;
    for (let i = 0; i < bl.length - 1; i++) {
      acc += bl[i].h;
      if (bl[i + 1].sec !== bl[i].sec && Math.abs(acc - alvo) < melhor) { melhor = Math.abs(acc - alvo); corte = i + 1; }
    }
    if (corte < 0 || melhor > altura * 0.35) {
      acc = 0; corte = bl.length;
      for (let i = 0; i < bl.length; i++) { acc += bl[i].h; if (acc >= alvo) { corte = i + 1; break; } }
      while (corte > 1 && bl[corte - 1].junto) corte--;
    }
  }
  const colunas = cols === 2 ? [bl.slice(0, corte), bl.slice(corte)] : [bl];

  const ops: Op[] = [];
  let y = padY;
  const fTit = mono(800, fs * 1.25), fSub = mono(400, fs * 0.6);
  ops.push({ x: padX, y, t: song.title, font: fTit, cor: PRETO });
  let dirCab = padX + larg(song.title, fTit);
  y += fs * 1.25 * 1.3;
  const sub = [song.artist, `Tom: ${song.key}`, song.capo ? `Capo ${song.capo}` : ''].filter(Boolean).join('   •   ');
  ops.push({ x: padX, y, t: sub, font: fSub, cor: '#666666' });
  dirCab = Math.max(dirCab, padX + larg(sub, fSub));
  y += fs * 0.6 * 1.6;
  const topo = y;
  let fundo = topo, x = padX;
  const largs = colunas.map((c) => c.reduce((a, b) => Math.max(a, b.w), 0));
  colunas.forEach((c, i) => {
    let cy = topo;
    for (const b of c) { for (const o of b.ops) ops.push({ ...o, x: x + o.x, y: cy + o.y }); cy += b.h; }
    fundo = Math.max(fundo, cy);
    x += largs[i] + gapCol;
  });
  const w = Math.max(dirCab, x - gapCol) + padX, h = fundo + padY;
  salvarPng(desenhar(ops, w, h, (g2) => {
    if (cols !== 2) return;
    const dx = padX + largs[0] + gapCol / 2;
    g2.strokeStyle = '#dddddd'; g2.lineWidth = 1.5;
    g2.beginPath(); g2.moveTo(dx, topo); g2.lineTo(dx, fundo); g2.stroke();
  }), prefixo + song.title);
}

/** Imagem da lista do repertório (título + lista numerada). */
export async function imagemRepertorio(nome: string, titulos: string[]) {
  const fs = 26, cor = corForte(prefs.cor);
  await fontes(fs);
  const mono = (peso: number, px: number) => `${peso} ${px}px "JetBrains Mono", Consolas, monospace`;
  const fTit = mono(800, fs * 1.3), fItem = mono(400, fs), fNum = mono(800, fs);
  const g = document.createElement('canvas').getContext('2d')!;
  const larg = (t: string, f: string) => { g.font = f; return g.measureText(t).width; };
  const padX = 36, padY = 32;
  const ops: Op[] = [{ x: padX, y: padY, t: nome, font: fTit, cor }];
  let dir = padX + larg(nome, fTit), y = padY + fs * 1.3 * 1.7;
  const numW = larg(`${titulos.length}.  `, fNum);
  titulos.forEach((t, i) => {
    ops.push({ x: padX, y, t: `${i + 1}.`, font: fNum, cor });
    ops.push({ x: padX + numW, y, t: t || ' ', font: fItem, cor: PRETO });
    dir = Math.max(dir, padX + numW + larg(t, fItem));
    y += fs * 1.55;
  });
  salvarPng(desenhar(ops, dir + padX, y + padY - fs * 0.4), nome);
}
