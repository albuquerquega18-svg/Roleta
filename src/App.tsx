import { useEffect, useRef, useState } from 'react';
import Confetti from './Confetti';
import { useWheelFullscreen } from './useWheelFullscreen';
import { COLORS, MAX_ENTRIES, MAX_LABEL, createEntries, loadState, randomIndex, targetRotation, type Entry, type Winner } from './roulette';

const STORAGE_KEY = 'roleta:v1';
const SPIN_MS = 4200;

function Icon({ name, size = 20 }: { name: 'arrow' | 'plus' | 'trash' | 'shuffle' | 'clock' | 'check' | 'spark' | 'expand' | 'collapse'; size?: number }) {
  const paths = {
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7" /></>,
    shuffle: <><path d="m17 3 4 4-4 4m0 2 4 4-4 4M3 7h3c6 0 6 10 12 10h3M3 17h3c2 0 3-1 4-3m4-4c1-2 2-3 4-3h3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /></>,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    collapse: <path d="M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Wheel({ entries, rotation, spinning, duration }: { entries: Entry[]; rotation: number; spinning: boolean; duration: number }) {
  const n = entries.length;
  const point = (angle: number, radius = 190) => `${200 + Math.cos(angle * Math.PI / 180) * radius},${200 + Math.sin(angle * Math.PI / 180) * radius}`;
  return <div className={`wheel-stage ${spinning ? 'is-spinning' : ''}`}>
    <div className="wheel-pointer" aria-hidden="true" />
    <svg className="wheel" viewBox="0 0 400 400" role="img" aria-label={`Roleta com ${n} opções`} style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${spinning ? duration : 0}ms` }}>
      <circle cx="200" cy="200" r="195" fill="#fff" />
      {!n && <circle cx="200" cy="200" r="190" fill="#e8ede4" />}
      {entries.map((entry, i) => {
        const start = i * 360 / n - 90;
        const end = (i + 1) * 360 / n - 90;
        const mid = (start + end) / 2;
        return <g key={entry.id}>
          {n === 1 ? <circle cx="200" cy="200" r="190" fill={COLORS[i % COLORS.length]} /> : <path d={`M200,200 L${point(start)} A190,190 0 ${360 / n > 180 ? 1 : 0} 1 ${point(end)} Z`} fill={COLORS[i % COLORS.length]} stroke="#ffffff80" strokeWidth="1" />}
          {n <= 24 && <text transform={`translate(${point(mid, n > 12 ? 133 : 120).replace(',', ' ')}) rotate(${mid + 180})`} textAnchor="middle" dominantBaseline="middle" fontSize={n > 12 ? 10 : 15} fill="#203b34" fontWeight="600">{entry.label.length > 14 ? entry.label.slice(0, 12) + '…' : entry.label}</text>}
        </g>;
      })}
    </svg>
    <div className="wheel-hub" aria-hidden="true"><Icon name="spark" size={25} /></div>
    {n === 0 && <span className="wheel-empty">Adicione suas opções</span>}
  </div>;
}

export default function App() {
  const [initial] = useState(() => { try { return loadState(localStorage.getItem(STORAGE_KEY)); } catch { return loadState(null); } });
  const [entries, setEntries] = useState(initial.entries);
  const [history, setHistory] = useState(initial.history);
  const [removeWinner, setRemoveWinner] = useState(initial.removeWinner);
  const [draft, setDraft] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [duration, setDuration] = useState(SPIN_MS);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinningRef = useRef(false);
  const { panel, toggleButton, fullscreen, toggleFullscreen } = useWheelFullscreen();

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, history, removeWinner })); setStorageError(false); }
    catch { setStorageError(true); }
  }, [entries, history, removeWinner]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function addEntries(event: React.FormEvent) {
    event.preventDefault();
    const labels = draft.split(/[\n,;]+/).map(label => label.trim()).filter(Boolean);
    if (!labels.length) return;
    if (entries.length + labels.length > MAX_ENTRIES) { setNotice(`Você pode adicionar até ${MAX_ENTRIES} opções.`); return; }
    if (labels.some(label => label.length > MAX_LABEL)) { setNotice(`Use até ${MAX_LABEL} caracteres por opção.`); return; }
    setEntries(current => [...current, ...createEntries(labels)]);
    setDraft(''); setNotice(''); setWinner(null); setRotation(0);
  }

  function spin() {
    if (spinningRef.current || entries.length < 2) return;
    spinningRef.current = true;
    const picked = entries[randomIndex(entries.length)];
    const index = entries.findIndex(entry => entry.id === picked.id);
    const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : SPIN_MS;
    setDuration(ms); setSpinning(true); setWinner(null); setNotice('');
    setRotation(current => targetRotation(current, index, entries.length));
    timer.current = setTimeout(() => {
      const result = { id: crypto.randomUUID(), label: picked.label, date: new Date().toISOString() };
      setWinner(result);
      setHistory(current => [result, ...current].slice(0, 50));
      if (removeWinner) { setEntries(current => current.filter(entry => entry.id !== picked.id)); setRotation(0); }
      setSpinning(false); spinningRef.current = false;
    }, ms + 80);
  }

  function shuffle() {
    const next = [...entries];
    for (let i = next.length - 1; i > 0; i--) { const j = randomIndex(i + 1); [next[i], next[j]] = [next[j], next[i]]; }
    setEntries(next); setRotation(0); setWinner(null);
  }

  return <>
    <header className="site-header" inert={fullscreen}><div className="header-inner">
      <a href="/" className="brand" aria-label="Roleta, início"><img src="/favicon.svg" width="35" height="35" alt="" />roleta<span>.</span></a>
      <span className="header-note"><span className="status-dot" />Um pouco de sorte, muitas possibilidades.</span>
      <a className="how-link" href="#como-funciona">Como funciona <Icon name="arrow" size={16} /></a>
    </div></header>
    <main>
      <section className="intro" inert={fullscreen}><div className="eyebrow"><Icon name="spark" size={14} /> PARA DECIDIR SEM COMPLICAR</div>
        <h1>Deixe a <span>sorte</span> escolher.</h1>
        <p>Nomes, prêmios ou aquela decisão difícil. Adicione suas opções e dê um giro.</p>
      </section>
      <div className="workspace">
        <section ref={panel} className={`wheel-card${fullscreen ? ' is-fullscreen' : ''}`} aria-label="Sorteador" role={fullscreen ? 'dialog' : undefined} aria-modal={fullscreen ? true : undefined}>
          <Confetti celebrationId={winner?.id ?? null} />
          <div className="card-top"><span className="section-label">SUA ROLETA</span><div className="wheel-tools"><span className="live-badge"><span className="status-dot" />{spinning ? 'Sorteando' : 'Tudo pronto'}</span><button ref={toggleButton} className="fullscreen-button" onClick={toggleFullscreen} aria-expanded={fullscreen}><Icon name={fullscreen ? 'collapse' : 'expand'} size={16} />{fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</button></div></div>
          <Wheel entries={entries} rotation={rotation} spinning={spinning} duration={duration} />
          <div className="result" aria-live="polite" aria-atomic="true">
            {winner ? <><span className="result-caption">A SORTE ESCOLHEU</span><strong className="winner-label">{winner.label} <Icon name="spark" size={22} /></strong></> : <><strong>{spinning ? 'Quem será que vai ganhar?' : 'Sua próxima escolha está a um giro.'}</strong><span>{spinning ? 'Aguarde a roleta parar…' : 'Todas as opções têm a mesma chance.'}</span></>}
          </div>
          <button className="spin-button" onClick={spin} disabled={spinning || entries.length < 2}><Icon name="spark" />{spinning ? 'Girando…' : winner ? 'Girar novamente' : 'Girar a roleta'}{!spinning && <Icon name="arrow" />}</button>
          <p className="wheel-footnote">{entries.length < 2 ? 'Adicione pelo menos 2 opções para sortear.' : `${entries.length} opções · ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(100 / entries.length)}% de chance para cada uma`}</p>
        </section>
        <aside className="options-card" aria-labelledby="options-title" inert={fullscreen}>
          <div className="options-heading"><div><h2 id="options-title">Suas opções <span className="count">{entries.length}</span></h2><p>Quem vai participar da rodada?</p></div><span className="little-spark" aria-hidden="true">✳</span></div>
          <form onSubmit={addEntries} className="add-form"><label className="sr-only" htmlFor="entry">Adicionar nomes ou prêmios</label><textarea id="entry" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Digite nomes ou prêmios…" rows={2} disabled={spinning} /><div className="add-form-bottom"><span>Separe por vírgula ou linha.</span><button type="submit" className="add-button" disabled={spinning || !draft.trim()} aria-label="Adicionar opções"><Icon name="plus" size={18} />Adicionar</button></div></form>
          <p className="validation-message" role="status">{notice}</p>
          <div className="list-header"><span>PARTICIPANTES</span><button className="text-button" onClick={() => { setEntries([]); setWinner(null); setRotation(0); }} disabled={spinning || !entries.length}>Limpar lista</button></div>
          <ul className="entry-list">{entries.map((entry, i) => <li key={entry.id}><span className="entry-number">{String(i + 1).padStart(2, '0')}</span><span className="entry-dot" style={{ background: COLORS[i % COLORS.length] }} /><span className="entry-label">{entry.label}</span><button className="delete-button" onClick={() => { setEntries(current => current.filter(e => e.id !== entry.id)); setRotation(0); setWinner(null); }} disabled={spinning} aria-label={`Remover ${entry.label}`}><span aria-hidden="true">×</span></button></li>)}</ul>
          {!entries.length && <div className="empty-list"><Icon name="plus" size={25} /><p>Sua lista começa aqui.</p><span>Adicione nomes ou prêmios acima.</span></div>}
          <button className="shuffle-button" onClick={shuffle} disabled={spinning || entries.length < 2}><Icon name="shuffle" size={16} />Embaralhar opções</button>
          <div className="options-divider" />
          <label className="toggle-row"><span><strong>Remover quem ganhar</strong><small>Uma nova chance para os demais.</small></span><input type="checkbox" checked={removeWinner} onChange={e => setRemoveWinner(e.target.checked)} disabled={spinning} /><span className="toggle" aria-hidden="true" /></label>
          <p className="local-note"><Icon name="check" size={14} />{storageError ? 'O navegador não permitiu salvar seus dados.' : 'Sua lista fica salva neste navegador.'}</p>
        </aside>
      </div>
      <section className="history-card" aria-labelledby="history-title" inert={fullscreen}><div className="history-heading"><h2 id="history-title"><Icon name="clock" size={18} />Últimos resultados <span className="count">{history.length}</span></h2><button className="text-button" disabled={spinning || !history.length} onClick={() => { setHistory([]); setWinner(null); }}>Limpar histórico</button></div>
        {history.length ? <ol className="history-list">{history.map((item, index) => <li key={item.id}><span className="history-index">{String(history.length - index).padStart(2, '0')}</span><strong>{item.label}</strong><time dateTime={item.date}>{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.date))}</time>{index === 0 && <span className="latest-badge">Mais recente</span>}</li>)}</ol> : <div className="history-empty"><span className="history-empty-icon"><Icon name="clock" size={22} /></span><div><strong>A próxima escolha pode surpreender.</strong><p>Gire a roleta e seus resultados aparecerão aqui.</p></div><span className="history-dash"><Icon name="arrow" size={24} /></span></div>}
      </section>
      <section id="como-funciona" className="how-it-works" aria-label="Como funciona" inert={fullscreen}><div><span>01</span><p><strong>Adicione suas opções</strong>Nomes, prêmios ou ideias. Você escolhe.</p></div><div><span>02</span><p><strong>Dê um giro</strong>Uma chance igual para cada opção.</p></div><div><span>03</span><p><strong>Descubra o resultado</strong>Deixe a sorte resolver por você.</p></div></section>
    </main>
    <footer inert={fullscreen}><a href="/" className="footer-brand">roleta.</a><p>Decisões mais leves. Feito para todo mundo.</p><span>Grátis e sem cadastro <Icon name="spark" size={14} /></span></footer>
  </>;
}
