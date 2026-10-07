import { useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { fetchCatalog, fetchUserBookmarks, fetchUserProgress, saveReadingProgress, signIn, signUp, signOut, toggleBookmark, semanticSearch, startProcessingJob, uploadVolumePdf, type CatalogBook, type UserBookmark, type SemanticSearchResult } from "./lib/lumen";
import { supabase } from "./lib/supabase";

type View = "home" | "search" | "reader" | "admin" | "library";
type IconName =
  | "home" | "compass" | "book" | "search" | "users" | "bell" | "settings"
  | "arrow" | "play" | "star" | "clock" | "bookmark" | "sparkles" | "menu"
  | "sun" | "moon" | "type" | "list" | "panel" | "upload" | "check" | "close"
  | "chevron" | "library" | "more" | "eye" | "filter";

const photos = {
  hero: "https://images.unsplash.com/photo-1760293887335-e58dd7bed957?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600",
  castle: "https://images.unsplash.com/photo-1785686460794-eb0f1f1b94d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=700",
  tower: "https://images.unsplash.com/photo-1550379964-cc8e907256a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=700",
  hill: "https://images.unsplash.com/photo-1606922849712-0cb6c47f9f92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=700",
  moon: "https://images.unsplash.com/photo-1642677674839-b9e5b94ea88c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=700",
};

type DisplayBook = { title:string; alt:string; author:string; image:string; rating:string; tag:string; volume:string; fresh:boolean };
let books: DisplayBook[] = [
  { title: "The Saint of Hollow Skies", alt: "Sora no Seijo", author: "Mina Kurosawa", image: photos.castle, rating: "4.9", tag: "Fantasy", volume: "Vol. 4", fresh: true },
  { title: "Asteria Academy", alt: "Mahō Gakuen Asteria", author: "Ren Ishikawa", image: photos.tower, rating: "4.8", tag: "Academy", volume: "Vol. 7", fresh: true },
  { title: "The Last Cartographer", alt: "Saigo no Chizu-shi", author: "Aya Mori", image: photos.hill, rating: "4.7", tag: "Adventure", volume: "Vol. 3", fresh: false },
  { title: "Letters Beyond the Moon", alt: "Tsuki no Tegami", author: "Haru Senda", image: photos.moon, rating: "4.9", tag: "Drama", volume: "Vol. 6", fresh: false },
];

function catalogToDisplayBooks(items: CatalogBook[]): DisplayBook[] {
  return items.map((book) => {
    const volume = book.volumes.at(-1);
    return {
      title: book.title,
      alt: book.alternate_title ?? "",
      author: book.author ?? "Unknown author",
      image: book.cover_path ?? photos.castle,
      rating: book.rating_avg?.toFixed(1) ?? "—",
      tag: book.genres[0] ?? "Novel",
      volume: volume ? `Vol. ${volume.volume_number}` : "Novel",
      fresh: Boolean(book.featured),
    };
  });
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></>,
    book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v16H7.5a3.5 3.5 0 0 0 0 7H20"/><path d="M4 5.5V21"/></>,
    library: <><path d="M4 4v16M9 4v16M14 5v15M18 4l2 16"/><path d="M2 20h20"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.38.3.73.6 1 .3.27.7.4 1.1.4h.1v4h-.1A1.7 1.7 0 0 0 19.4 15Z"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    play: <path d="m9 7 8 5-8 5V7Z"/>,
    star: <path d="m12 3 2.7 5.5 6 .9-4.35 4.2 1 6-5.35-2.85L6.65 19.6l1-6L3.3 9.4l6-.9L12 3Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z"/>,
    sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14ZM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>,
    type: <><path d="M4 7V4h16v3M9 20h6M12 4v16"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
    panel: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    filter: <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Button({ children, variant = "primary", icon, onClick, className = "", label }: { children?: ReactNode; variant?: "primary" | "secondary" | "ghost" | "icon"; icon?: IconName; onClick?: () => void; className?: string; label?: string }) {
  return <button type="button" aria-label={label} className={`btn btn-${variant} ${className}`} onClick={onClick}>{icon && <Icon name={icon} />}{children}</button>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="logo"><span className="logo-mark">L</span>{!compact && <span>Lumen</span>}</div>;
}

function Sidebar({ view, setView, onAuth }: { view: View; setView: (view: View) => void; onAuth: () => void }) {
  const items: { id: View | "library" | "community"; label: string; icon: IconName }[] = [
    { id: "home", label: "Home", icon: "home" }, { id: "search", label: "Explore", icon: "compass" },
    { id: "library", label: "My Library", icon: "library" }, { id: "community", label: "Community", icon: "users" },
  ];
  return <aside className="sidebar">
    <Logo />
    <nav className="side-nav" aria-label="Main navigation">
      {items.map((item) => <button type="button" key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id === "community" ? "home" : item.id)}><Icon name={item.icon}/><span>{item.label}</span></button>)}
    </nav>
    <div className="side-label">Workspace</div>
    <button type="button" className={`nav-item ${view === "admin" ? "active" : ""}`} onClick={() => setView("admin")}><Icon name="sparkles"/><span>AI Studio</span></button>
    <div className="reading-goal">
      <div className="goal-ring"><span>72%</span></div>
      <div><strong>Weekly goal</strong><small>5h 46m of 8h</small></div>
    </div>
    <div className="sidebar-user"><span className="avatar">AK</span><div><strong>Akira K.</strong><small>Premium Reader</small></div><Icon name="more"/></div>
  </aside>;
}

function Topbar({ title, setView, user, onAuth }: { title?: string; setView: (view: View) => void; user: User | null; onAuth: () => void }) {
  return <header className="topbar">
    <div className="mobile-logo"><Logo compact /></div>
    {title && <strong className="page-title">{title}</strong>}
    <button type="button" className="search-trigger" onClick={() => setView("search")}><Icon name="search"/><span>Search stories, scenes, characters...</span><kbd>⌘ K</kbd></button>
    <div className="top-actions"><Button variant="icon" icon="bell" label="Notifications"/><button type="button" className="avatar small" onClick={onAuth} aria-label="Account">{user ? ((user.user_metadata?.full_name as string | undefined)?.slice(0,2).toUpperCase() || user.email?.slice(0,2).toUpperCase() || "LR") : "LR"}</button></div>
  </header>;
}

function BottomNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  return <nav className="bottom-nav" aria-label="Mobile navigation">
    {([["home","home","Home"],["search","compass","Explore"],["reader","book","Reading"],["library","library","Library"]] as [View,IconName,string][]).map(([id,icon,label]) =>
      <button type="button" key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon name={icon}/><span>{label}</span></button>)}
  </nav>;
}

function BookCard({ book, onRead }: { book: typeof books[number]; onRead: () => void }) {
  return <article className="book-card" onClick={onRead}>
    <div className="cover-wrap"><img src={book.image} alt={`Cover of ${book.title}`} /><span className="cover-volume">{book.volume}</span>{book.fresh && <span className="new-dot">NEW</span>}<button type="button" className="cover-play" aria-label={`Read ${book.title}`}><Icon name="play"/></button></div>
    <div className="book-meta"><div className="rating"><Icon name="star" size={14}/>{book.rating}</div><span>{book.tag}</span></div>
    <h3>{book.title}</h3><p>{book.alt}</p><small>{book.author}</small>
  </article>;
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: string }) {
  return <div className="section-heading"><div>{eyebrow && <span>{eyebrow}</span>}<h2>{title}</h2></div>{action && <Button variant="ghost">{action}<Icon name="arrow"/></Button>}</div>;
}

function Home({ setView }: { setView: (view: View) => void }) {
  return <main className="page home-page">
    <section className="hero">
      <img src={photos.hero} alt="" />
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <span className="hero-kicker"><Icon name="sparkles" size={16}/> Editor’s selection</span>
        <h1>Every world begins<br/>with a single page.</h1>
        <p>Discover extraordinary light novels, enhanced with spoiler-safe AI and crafted for immersive reading.</p>
        <div className="hero-actions"><Button onClick={() => setView("reader")} icon="play">Start reading</Button><Button variant="secondary" icon="compass" onClick={() => setView("search")}>Explore collection</Button></div>
      </div>
      <div className="hero-feature"><span>FEATURED SERIES</span><strong>The Saint of Hollow Skies</strong><small>Volume 4 · The Palace Above the Clouds</small><div className="hero-stats"><span><Icon name="star" size={15}/> 4.9</span><span><Icon name="clock" size={15}/> 7h 20m</span></div></div>
    </section>

    <section className="continue-section">
      <SectionHeading eyebrow="YOUR JOURNEY" title="Continue reading" action="View history"/>
      <article className="continue-card">
        <img src={photos.tower} alt="Asteria Academy cover"/>
        <div className="continue-info"><div><span className="status-pill">READING</span><small> Asteria Academy · Volume 3</small></div><h2>The Crownless Heir</h2><p>Chapter 7 — The Duel Beneath Violet Rain</p><div className="progress-row"><div className="progress"><i style={{width:"62%"}}></i></div><strong>62%</strong></div><div className="continue-footer"><span>Last read 2 hours ago · 2h 14m remaining</span><Button onClick={() => setView("reader")}>Resume chapter <Icon name="arrow"/></Button></div></div>
        <div className="quote">“Magic remembers the shape of every promise.”</div>
      </article>
    </section>

    <section>
      <SectionHeading eyebrow="FRESH FROM THE ARCHIVE" title="Recently updated" action="See all updates"/>
      <div className="book-grid">{books.map((book) => <BookCard key={book.title} book={book} onRead={() => setView("reader")}/>)}</div>
    </section>

    <section className="discovery-grid">
      <div className="trending-panel"><SectionHeading eyebrow="COMMUNITY PULSE" title="Trending this week"/>
        {[["01","The Alchemist’s Second Dawn","12.8k readers"],["02","Asteria Academy","10.4k readers"],["03","Letters Beyond the Moon","9.1k readers"],["04","The Last Cartographer","7.8k readers"]].map((row, i) =>
          <div className="rank-row" key={row[0]}><strong>{row[0]}</strong><img src={books[i].image} alt=""/><div><b>{row[1]}</b><small>{row[2]}</small></div><span className={i < 2 ? "up" : ""}>{i < 2 ? "↑" : "—"} {4-i}</span></div>)}
      </div>
      <div className="ai-discover"><Icon name="sparkles"/><span>DISCOVER WITH LUMEN AI</span><h2>Not sure what to read next?</h2><p>Tell us the mood, scene, or feeling you’re looking for. We’ll find the exact story for you.</p><button type="button" onClick={() => setView("search")}>“A quiet fantasy about found family...”<Icon name="arrow"/></button><small>Semantic search · Spoiler-safe results</small></div>
    </section>
  </main>;
}

function SearchView({ setView, user, onAuth }: { setView: (view: View) => void; user: User | null; onAuth: () => void }) {
  const [query, setQuery] = useState("momen duel sihir di festival akademi");
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function runSearch() {
    if (!user) { setMessage("Masuk dulu untuk memakai semantic search."); onAuth(); return; }
    setLoading(true); setMessage("");
    try {
      const response = await semanticSearch({ query });
      if (response.error) throw response.error;
      const next = response.data?.results ?? [];
      setResults(next);
      setSearched(true);
      if (!next.length) setMessage("Belum ada scene terindeks yang cocok. Proses volume terlebih dahulu di AI Studio.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Semantic search gagal.");
      setResults([]);
      setSearched(true);
    } finally { setLoading(false); }
  }

  return <main className="page search-page">
    <div className="search-intro"><span className="hero-kicker dark"><Icon name="sparkles" size={16}/> Lumen semantic search</span><h1>Find the moment you remember.</h1><p>Search by plot, mood, dialogue, or a scene you can’t quite name.</p></div>
    <div className="semantic-box"><Icon name="sparkles"/><input aria-label="Semantic search query" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter") void runSearch();}} /><Button onClick={()=>void runSearch()}>{loading ? "Searching…" : "Search worlds"}</Button></div>
    {message && <div className="upload-message search-message">{message}</div>}
    <div className="filter-row"><Button variant="secondary" icon="filter">All filters</Button>{["Academy","Magic duel","Festival","Rating 4.5+"].map(x=><button type="button" className="filter-chip" key={x}>{x}<Icon name="close" size={14}/></button>)}<span className="result-count">{searched ? `${results.length} semantic scenes found` : "Semantic search ready"}</span></div>
    <div className="results-layout">
      <aside className="search-filters"><h3>Refine results</h3>{["Content type","Genre","Publication status","Language","AI confidence"].map((x,i)=><div className="filter-block" key={x}><button type="button">{x}<span>{i===0?"Scenes":i===1?"Fantasy":"Any"}</span><Icon name="chevron" size={16}/></button></div>)}</aside>
      <section className="results"><div className="results-head"><div><span>BEST MATCHES</span><h2>Scenes matching your memory</h2></div><button type="button">Relevance <Icon name="chevron" size={15}/></button></div>
        {!searched && <div className="result-placeholder"><Icon name="sparkles"/><strong>Describe the scene you remember.</strong><p>Lumen will search indexed chapters by meaning instead of exact keywords.</p></div>}
        {searched && results.length === 0 && <div className="result-placeholder"><Icon name="search"/><strong>No semantic matches yet.</strong><p>Upload and process a volume in AI Studio to populate the scene index.</p></div>}
        {results.map((r,i)=><article className="result-card" key={r.chapter_id}><div className="score-ring">{r.score}%</div><div className="result-body"><div className="result-label"><span>{r.chapter}</span><small>{r.book}</small></div><h3>{r.title}</h3><blockquote>“{r.excerpt}”</blockquote><div className="ai-reason"><Icon name="sparkles" size={17}/><p><strong>Why this matches</strong>{r.why}</p></div><div className="result-actions"><Button onClick={() => setView("reader")}>Jump to scene <Icon name="arrow"/></Button><Button variant="ghost" icon="bookmark">Save</Button></div></div><img src={books[i % books.length].image} alt="Novel cover"/></article>)}
      </section>
    </div>
  </main>;
}
function Reader({ setView, user, onAuth, syncVolumeId, syncChapterId }: { setView: (view: View) => void; user: User | null; onAuth: () => void; syncVolumeId: string | null; syncChapterId: string | null }) {
  const [theme, setTheme] = useState<"light"|"sepia"|"dark"|"amoled">("sepia");
  const [panel, setPanel] = useState<"toc"|"info"|null>("info");
  const [saved, setSaved] = useState(false);
  const [pageNumber, setPageNumber] = useState(142);
  useEffect(() => {
    if (!user || !syncVolumeId) return;
    fetchUserBookmarks(user.id).then((items) => setSaved(items.some((item) => item.volume_id === syncVolumeId && item.page_number === pageNumber))).catch(() => undefined);
  }, [user, syncVolumeId, pageNumber]);
  async function persistProgress(nextPage: number) {
    if (!user || !syncVolumeId) return;
    const pct = Math.max(0, Math.min(100, (nextPage / 228) * 100));
    try { await saveReadingProgress({ user, volumeId: syncVolumeId, chapterId: syncChapterId, pageNumber: nextPage, progressPercent: pct }); } catch (error) { console.debug(error); }
  }
  async function handleBookmark() {
    if (!user) { onAuth(); return; }
    if (!syncVolumeId) return;
    try { const next = await toggleBookmark({ user, volumeId: syncVolumeId, chapterId: syncChapterId, pageNumber }); setSaved(next); } catch { /* keep reader responsive */ }
  }
  return <div className={`reader theme-${theme}`}>
    <header className="reader-top">
      <Button variant="icon" icon="close" label="Close reader" onClick={() => setView("home")}/>
      <div className="reader-title"><strong>Asteria Academy — Volume 3</strong><small>Chapter 7 · The Duel Beneath Violet Rain</small></div>
      <div className="reader-tools"><Button variant="icon" icon="search" label="Search in book"/><Button variant="icon" icon="type" label="Typography settings"/><Button variant="icon" icon="list" label="Table of contents" onClick={()=>setPanel(panel==="toc"?null:"toc")}/><Button variant="icon" icon="panel" label="Knowledge panel" onClick={()=>setPanel(panel==="info"?null:"info")}/><Button variant="icon" icon={saved?"check":"bookmark"} label="Bookmark" onClick={handleBookmark}/></div>
    </header>
    <div className="reader-progress"><i style={{width:"62%"}}></i></div>
    <div className="reader-shell">
      <aside className="reader-rail"><Button variant="icon" icon="chevron" label="Previous page" onClick={() => { const n = Math.max(1, pageNumber - 1); setPageNumber(n); void persistProgress(n); }}/><span>{pageNumber}</span><div className="vertical-track"><i style={{height:`${Math.min(100, (pageNumber / 228) * 100)}%`}}></i></div><span>228</span><Button variant="icon" icon="chevron" label="Next page" onClick={() => { const n = Math.min(228, pageNumber + 1); setPageNumber(n); void persistProgress(n); }}/></aside>
      <article className="reading-page">
        <div className="chapter-mark"><span>CHAPTER SEVEN</span><i></i></div>
        <h1>The Duel Beneath<br/>Violet Rain</h1>
        <p className="dropcap">The first bell rang at noon, though no one in the eastern courtyard heard it over the roar of the crowd. Three thousand students stood beneath banners of silver and indigo, their faces turned toward the circle of white stone at the academy’s heart.</p>
        <p>Kael waited inside it alone.</p>
        <p>His wand was broken. Not cracked, not chipped—broken cleanly through the middle, with a pale thread of light still trembling between the two halves.</p>
        <p>Across the arena, Lady Seraphine removed one white glove finger by finger. The gesture was so calm that the crowd fell silent.</p>
        <blockquote>“You may yield,” she said. “There is no shame in choosing tomorrow.”</blockquote>
        <p>Kael looked past her, toward the high balcony where the Council sat behind their mirrored masks. Somewhere among them was the person who had erased his sister’s name from the academy records.</p>
        <p>He closed his hand around the broken wand.</p>
        <p>“Tomorrow,” he said, “is precisely what I’m fighting for.”</p>
        <div className="scene-break">✦</div>
        <p>The rain began upward. Violet droplets lifted from the stone and drifted into the open sky, each one holding the reflection of a different memory.</p>
        <footer><span>ASTERIA ACADEMY</span><b>— 142 —</b><span>VOLUME THREE</span></footer>
      </article>
      {panel && <aside className="knowledge-panel">
        <div className="panel-tabs"><button type="button" className={panel==="info"?"active":""} onClick={()=>setPanel("info")}>Knowledge</button><button type="button" className={panel==="toc"?"active":""} onClick={()=>setPanel("toc")}>Contents</button></div>
        {panel === "info" ? <><div className="safe-badge"><Icon name="eye" size={15}/> Safe for Volume 3</div><h2>In this scene</h2><div className="character"><span className="avatar lavender">K</span><div><strong>Kael Avenhart</strong><small>Disgraced heir · 34 appearances</small></div><Icon name="chevron" size={16}/></div><div className="character"><span className="avatar rose">S</span><div><strong>Lady Seraphine</strong><small>Student council · 21 appearances</small></div><Icon name="chevron" size={16}/></div><h3>Glossary</h3><div className="glossary"><strong>Violet Rain</strong><p>An advanced mnemonic spell that manifests fragments of nearby memories.</p><span>First appeared · Chapter 4</span></div><div className="glossary"><strong>Mirrored Council</strong><p>The academy’s anonymous governing body.</p><span>First appeared · Volume 1</span></div></> :
        <><h2>Table of contents</h2>{["A Crown of Ash","The Seventh Bell","Letters Unsent","Founding Festival","The Duel Beneath Violet Rain","What the Rain Remembered"].map((x,i)=><button type="button" className={`chapter-link ${i===4?"active":""}`} key={x}><span>{String(i+3).padStart(2,"0")}</span>{x}{i<4&&<Icon name="check" size={15}/>}</button>)}</>}
      </aside>}
    </div>
    <div className="reader-bottom">
      <div className="themes">{(["light","sepia","dark","amoled"] as const).map(t=><button type="button" aria-label={`${t} reading theme`} className={`${t} ${theme===t?"active":""}`} key={t} onClick={()=>setTheme(t)}></button>)}</div>
      <div className="page-nav"><Button variant="ghost" onClick={() => { const n = Math.max(1, pageNumber - 1); setPageNumber(n); void persistProgress(n); }}>Previous</Button><span>{Math.round((pageNumber / 228) * 100)}% · {Math.max(0, 228 - pageNumber)} pages left</span><Button variant="primary" onClick={() => { const n = Math.min(228, pageNumber + 1); setPageNumber(n); void persistProgress(n); }}>Next page <Icon name="arrow"/></Button></div>
      <Button variant="ghost" icon="settings">Reading settings</Button>
    </div>
    {saved && <div className="toast"><Icon name="check"/><div><strong>Bookmark added</strong><small>Page 142 · Chapter 7</small></div></div>}
  </div>;
}

const stages = ["Validate file","Extract text & OCR","Analyze structure","Detect chapters","Extract metadata","Generate summaries","Characters & glossary","Generate embeddings","Human review","Publish"];

function AdminView({ catalog, user, onAuth }: { catalog: CatalogBook[]; user: User | null; onAuth: () => void }) {
  const [selectedStage, setSelectedStage] = useState(5);
  const [selectedVolumeId, setSelectedVolumeId] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const volumes = catalog.flatMap((book) => book.volumes.map((volume) => ({
    ...volume,
    novelTitle: book.title,
  })));
  useEffect(() => {
    if (!selectedVolumeId && volumes[0]?.id) setSelectedVolumeId(volumes[0].id);
  }, [selectedVolumeId, volumes]);

  const selectedVolume = volumes.find((volume) => volume.id === selectedVolumeId);
  const selectedNovel = catalog.find((book) => book.volumes.some((volume) => volume.id === selectedVolumeId));

  async function handlePdf(file: File | undefined) {
    if (!file) return;
    if (!user) { setUploadMessage("Sign in first. Only editor/admin accounts can upload volumes."); onAuth(); return; }
    if (!selectedVolumeId) { setUploadMessage("Select a volume first."); return; }
    setUploading(true); setUploadMessage("");
    try {
      const jobId = await uploadVolumePdf({ user, volumeId: selectedVolumeId, file });
      setUploadMessage("PDF uploaded. Starting AI processing…");
      const started = await startProcessingJob(jobId);
      if (started.error) {
        setUploadMessage(`Job ${jobId.slice(0, 8)} created, but worker did not start: ${started.error.message}`);
      } else {
        setUploadMessage("Processing started. OpenAI intake will move the job into Human review when the first pass completes.");
      }
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "PDF upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return <main className="page admin-page">
    <div className="admin-head">
      <div><span className="eyebrow">AI PROCESSING STUDIO</span><h1>Volume processing</h1><p>Review extraction quality, generated metadata, and publishing readiness.</p></div>
      <div className="admin-upload-actions">
        <select aria-label="Select volume" value={selectedVolumeId} onChange={(e)=>setSelectedVolumeId(e.target.value)}>
          {volumes.map((volume)=><option key={volume.id} value={volume.id}>{volume.novelTitle} · Vol. {volume.volume_number}</option>)}
        </select>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e)=>{ void handlePdf(e.target.files?.[0]); e.currentTarget.value=""; }} />
        <Button icon="upload" onClick={()=>fileRef.current?.click()}>{uploading ? "Uploading…" : "Upload new PDF"}</Button>
      </div>
    </div>
    {uploadMessage && <div className="upload-message">{uploadMessage}</div>}
    <div className="job-summary"><img src={selectedNovel?.cover_path ?? photos.castle} alt="Volume cover"/><div className="job-title"><span className="processing-badge"><i></i> PROCESSING</span><h2>{selectedNovel?.title ?? "Select a volume"}</h2><p>{selectedVolume ? `Volume ${selectedVolume.volume_number} · ${selectedVolume.subtitle ?? selectedVolume.title}` : "Choose a volume above"}</p></div><div className="job-stat"><span>Overall progress</span><strong>68%</strong><div className="progress"><i style={{width:"68%"}}></i></div></div><div className="job-stat"><span>Estimated remaining</span><strong>08:42</strong><small>Started 14 min ago</small></div><Button variant="secondary" icon="close">Cancel job</Button></div>
    <div className="admin-layout">
      <section className="pipeline-card"><div className="card-head"><div><span>LIVE PIPELINE</span><h2>AI processing stages</h2></div><span className="live"><i></i> Live</span></div>
        <div className="pipeline">{stages.map((stage,i)=><button type="button" key={stage} className={`${i<5?"done":i===5?"current":""} ${selectedStage===i?"selected":""}`} onClick={()=>setSelectedStage(i)}><span className="stage-icon">{i<5?<Icon name="check" size={15}/>:i===5?<Icon name="sparkles" size={16}/>:i+1}</span><div><strong>{stage}</strong><small>{i<5?"Completed":i===5?"Generating chapter summaries…":"Waiting"}</small></div>{i<5&&<b>{["00:08","04:21","00:47","01:12","02:34"][i]}</b>}{i===5&&<em>68%</em>}</button>)}</div>
      </section>
      <section className="console-card"><div className="card-head"><div><span>PROCESSING CONSOLE</span><h2>Live activity</h2></div><div><button type="button">Auto-scroll</button><Button variant="icon" icon="more" label="Console options"/></div></div>
        <div className="console">
          <p><time>14:38:22</time><span className="info">INFO</span> Chapter 8 summary generated <b>confidence: 0.94</b></p>
          <p><time>14:38:26</time><span className="info">INFO</span> Processing Chapter 9: “The Glass Observatory”</p>
          <p><time>14:38:31</time><span className="ai">AI</span> Identified 4 key events and 7 character references</p>
          <p><time>14:38:34</time><span className="warn">WARN</span> Low confidence paragraph boundary on page 184</p>
          <p><time>14:38:37</time><span className="info">INFO</span> Applied contextual paragraph repair</p>
          <p><time>14:38:41</time><span className="ai">AI</span> Generating spoiler-safe summary…</p>
          <p className="typing"><time>14:38:48</time><span className="active">RUN</span> <i></i></p>
        </div>
        <div className="quality-grid"><div><span>Extraction confidence</span><strong>97.4%</strong><small className="good">Excellent</small></div><div><span>Pages processed</span><strong>218 / 324</strong><small>67.3%</small></div><div><span>Warnings</span><strong>3</strong><small className="warning">Review later</small></div></div>
      </section>
    </div>
    <section className="review-strip"><div><Icon name="sparkles"/><span>UP NEXT</span><h2>Human review</h2><p>Compare the original PDF with extracted web content and resolve 3 flagged formatting issues.</p></div><div className="review-preview"><div className="pdf-mini">PDF<span>184</span></div><Icon name="arrow"/><div className="web-mini"><span></span><span></span><span></span></div></div><Button variant="secondary">Open review workspace <Icon name="arrow"/></Button></section>
  </main>;
}


function LibraryView({ user, progress, bookmarks, onAuth }: { user: User | null; progress: Map<string, number>; bookmarks: UserBookmark[]; onAuth: () => void }) {
  if (!user) return <main className="page"><section className="empty-state"><div className="library-icon">◫</div><h1>Your library</h1><p>Sign in to sync reading progress and bookmarks across devices.</p><Button onClick={onAuth}>Sign in to continue</Button></section></main>;
  const tracked = books.filter((book) => book.volume);
  return <main className="page library-page"><div className="search-intro"><span className="hero-kicker dark">YOUR LIBRARY</span><h1>Everything you’re reading.</h1><p>Your reading activity is synced with your Lumen account.</p></div><section><div className="section-heading"><div><span>YOUR TITLES</span><h2>Recent library</h2></div></div><div className="book-grid">{tracked.map((book) => <article className="book-card" key={book.title}><div className="cover-wrap"><img src={book.image} alt={`Cover of ${book.title}`} /></div><div className="book-meta"><div className="rating"><Icon name="star" size={14}/>{book.rating}</div><span>{book.tag}</span></div><h3>{book.title}</h3><p>{book.alt}</p><small>{book.author} · {Math.round(progress.size ? Math.max(...progress.values()) : 0)}% synced</small></article>)}</div></section><section className="library-stats"><div><span>Bookmarks</span><strong>{bookmarks.length}</strong></div><div><span>Synced titles</span><strong>{tracked.length}</strong></div><div><span>Cloud sync</span><strong>Live</strong></div></section></main>;
}

function AuthDialog({ open, onClose, onSignedIn }: { open: boolean; onClose: () => void; onSignedIn: (user: User) => void }) {
  const [mode,setMode]=useState<"signin"|"signup">("signin");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [message,setMessage]=useState(""); const [loading,setLoading]=useState(false);
  if (!open) return null;
  async function submit() {
    setLoading(true); setMessage("");
    try {
      if (mode==="signin") {
        const result=await signIn(email.trim(),password); if(result.error) throw result.error;
        if(result.data.user){onSignedIn(result.data.user);onClose();}
      } else {
        const result=await signUp(email.trim(),password,name.trim()||"Lumen Reader"); if(result.error) throw result.error;
        if(result.data.session?.user){onSignedIn(result.data.session.user);onClose();} else setMessage("Account created. Check your email to confirm the account.");
      }
    } catch(error) { setMessage(error instanceof Error ? error.message : "Authentication failed."); }
    finally { setLoading(false); }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="auth-modal" role="dialog" aria-modal="true" onMouseDown={(e)=>e.stopPropagation()}><button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="auth-brand"><span className="logo-mark">L</span><div><strong>Lumen</strong><small>{mode==="signin"?"Welcome back, reader.":"Create your reader account."}</small></div></div><div className="auth-tabs"><button type="button" className={mode==="signin"?"active":""} onClick={()=>setMode("signin")}>Sign in</button><button type="button" className={mode==="signup"?"active":""} onClick={()=>setMode("signup")}>Create account</button></div>{mode==="signup"&&<label>Display name<input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your reader name"/></label>}<label>Email<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password"/></label>{message&&<div className="auth-message">{message}</div>}<button type="button" className="btn btn-primary auth-submit" onClick={submit} disabled={loading}>{loading?"Working…":mode==="signin"?"Sign in":"Create account"}</button><small className="auth-note">Your account syncs progress and bookmarks across devices.</small></section></div>;
}


export default function App() {
  const [view, setView] = useState<View>("home");
  const [user, setUser] = useState<User | null>(null);
  const [catalog, setCatalog] = useState<CatalogBook[]>([]);
  const [progress, setProgress] = useState<Map<string, number>>(new Map());
  const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [, forceCatalogRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    fetchCatalog().then((items) => {
      if (!active) return;
      setCatalog(items);
      if (items.length) { books = catalogToDisplayBooks(items); forceCatalogRefresh((v) => v + 1); }
    }).catch(() => undefined);
    if (!supabase) return () => { active = false; };
    supabase.auth.getSession().then(({ data }) => { if (active) setUser(data.session?.user ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) { setProgress(new Map()); setBookmarks([]); return; }
    Promise.all([fetchUserProgress(user.id), fetchUserBookmarks(user.id)]).then(([items, saved]) => {
      setProgress(new Map(items.map((item) => [item.volume_id, Number(item.progress_percent)])));
      setBookmarks(saved);
    }).catch(() => undefined);
  }, [user]);

  const targetBook = catalog.find((book) => book.slug === "asteria-academy") ?? catalog.find((book) => book.featured) ?? catalog[0];
  const targetVolume = targetBook?.volumes.at(-1);
  const targetChapter = targetVolume?.chapters[0];

  async function handleSignOut() { await signOut(); setUser(null); setView("home"); }

  return <><div className="app-shell"><Sidebar view={view} setView={setView} onAuth={() => setAuthOpen(true)}/><div className="main-shell"><Topbar title={view === "admin" ? "Content operations" : view === "library" ? "My library" : undefined} setView={setView} user={user} onAuth={() => setAuthOpen(true)}/>{view === "home" && <Home setView={setView}/>} {view === "search" && <SearchView setView={setView} user={user} onAuth={() => setAuthOpen(true)}/>} {view === "admin" && <AdminView catalog={catalog} user={user} onAuth={() => setAuthOpen(true)}/>}  {view === "library" && <LibraryView user={user} progress={progress} bookmarks={bookmarks} onAuth={() => setAuthOpen(true)}/>}</div><BottomNav view={view} setView={setView}/></div>{view === "reader" && <Reader setView={setView} user={user} onAuth={() => setAuthOpen(true)} syncVolumeId={targetVolume?.id ?? null} syncChapterId={targetChapter?.id ?? null}/>}<AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onSignedIn={(nextUser) => setUser(nextUser)}/>{user && <button type="button" className="signout-fab" onClick={handleSignOut}>Sign out</button>}</>;
}
