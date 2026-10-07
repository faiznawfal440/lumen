import { useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { fetchCatalog, fetchUserBookmarks, fetchUserProgress, saveReadingProgress, signIn, signUp, signOut, toggleBookmark, semanticSearch, startProcessingJob, uploadVolumePdf, createNovel, fetchCurrentUserRole, fetchLatestProcessingJob, fetchProcessingStages, fetchProcessingLogs, type CatalogBook, type UserBookmark, type SemanticSearchResult, type ProcessingJob, type ProcessingStage, type ProcessingLog } from "./lib/lumen";
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

type DisplayBook = { title:string; alt:string; author:string; image:string; rating:string; tag:string; volume:string; fresh:boolean; novelSlug?:string; volumeId?:string; chapterId?:string; };
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
      novelSlug: book.slug,
      volumeId: volume?.id,
      chapterId: volume?.chapters[0]?.id,
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

function BookCard({ book, onRead }: { book: DisplayBook; onRead: (book: DisplayBook) => void }) {
  return <article className="book-card" onClick={() => onRead(book)}>
    <div className="cover-wrap"><img src={book.image} alt={`Cover of ${book.title}`} /><span className="cover-volume">{book.volume}</span>{book.fresh && <span className="new-dot">NEW</span>}<button type="button" className="cover-play" aria-label={`Read ${book.title}`} onClick={(e)=>{e.stopPropagation(); onRead(book);}}><Icon name="play"/></button></div>
    <div className="book-meta"><div className="rating"><Icon name="star" size={14}/>{book.rating}</div><span>{book.tag}</span></div>
    <h3>{book.title}</h3><p>{book.alt}</p><small>{book.author}</small>
  </article>;
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: string }) {
  return <div className="section-heading"><div>{eyebrow && <span>{eyebrow}</span>}<h2>{title}</h2></div>{action && <Button variant="ghost">{action}<Icon name="arrow"/></Button>}</div>;
}

function Home({ setView, catalog, progress, onRead }: { setView: (view: View) => void; catalog: CatalogBook[]; progress: Map<string, number>; onRead: (book: DisplayBook) => void }) {
  return <main className="page home-page">
    <section className="hero">
      <img src={photos.hero} alt="" />
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <span className="hero-kicker"><Icon name="sparkles" size={16}/> Editor’s selection</span>
        <h1>Every world begins<br/>with a single page.</h1>
        <p>Discover extraordinary light novels, enhanced with spoiler-safe AI and crafted for immersive reading.</p>
        <div className="hero-actions"><Button onClick={() => onRead(books[0])} icon="play">Start reading</Button><Button variant="secondary" icon="compass" onClick={() => setView("search")}>Explore collection</Button></div>
      </div>
      <div className="hero-feature"><span>FEATURED SERIES</span><strong>The Saint of Hollow Skies</strong><small>Volume 4 · The Palace Above the Clouds</small><div className="hero-stats"><span><Icon name="star" size={15}/> 4.9</span><span><Icon name="clock" size={15}/> 7h 20m</span></div></div>
    </section>

    <section className="continue-section">
      <SectionHeading eyebrow="YOUR JOURNEY" title="Continue reading" action="View history"/>
      {(() => {
        const activeProgress = Array.from(progress.entries()).find(([, value]) => value > 0);
        const volumeId = activeProgress?.[0];
        const activeBook = catalog.find((book) => book.volumes.some((volume) => volume.id === volumeId)) ?? catalog[0];
        const activeVolume = activeBook?.volumes.find((volume) => volume.id === volumeId) ?? activeBook?.volumes.at(-1);
        const activeChapter = activeVolume?.chapters[0];
        const display = books.find((book) => book.volumeId === activeVolume?.id) ?? books[0];
        const pct = activeVolume ? Math.round(progress.get(activeVolume.id) ?? 0) : 0;
        return <article className="continue-card">
          <img src={display.image} alt={`Cover of ${activeBook?.title ?? display.title}`}/>
          <div className="continue-info"><div><span className="status-pill">{pct > 0 ? "READING" : "READY"}</span><small> {activeBook?.title ?? display.title} · {activeVolume?.title ?? display.volume}</small></div><h2>{activeChapter?.title ?? "Choose your next chapter"}</h2><p>{activeChapter ? `Chapter ${activeChapter.chapter_number}` : "Explore the collection to start reading."}</p><div className="progress-row"><div className="progress"><i style={{width:`${pct}%`}}></i></div><strong>{pct}%</strong></div><div className="continue-footer"><span>{pct > 0 ? "Synced to your latest reading position" : "Your reading progress will appear here"}</span><Button onClick={() => activeVolume?.id && activeChapter?.id ? onRead({ ...display, title: activeBook?.title ?? display.title, volumeId: activeVolume.id, chapterId: activeChapter.id }) : setView("search")}>{pct > 0 ? "Resume chapter" : "Browse stories"} <Icon name="arrow"/></Button></div></div>
          <div className="quote">“Every world begins with a single page.”</div>
        </article>;
      })()}
    </section>

    <section>
      <SectionHeading eyebrow="FRESH FROM THE ARCHIVE" title="Recently updated" action="See all updates"/>
      <div className="book-grid">{books.map((book) => <BookCard key={book.title} book={book} onRead={onRead}/>)}</div>
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

function SearchView({ setView, user, onAuth, onRead }: { setView: (view: View) => void; user: User | null; onAuth: () => void; onRead: (target: { volumeId: string; chapterId: string | null }) => void }) {
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
        {results.map((r,i)=><article className="result-card" key={r.chapter_id}><div className="score-ring">{r.score}%</div><div className="result-body"><div className="result-label"><span>{r.chapter}</span><small>{r.book}</small></div><h3>{r.title}</h3><blockquote>“{r.excerpt}”</blockquote><div className="ai-reason"><Icon name="sparkles" size={17}/><p><strong>Why this matches</strong>{r.why}</p></div><div className="result-actions"><Button onClick={() => onRead({ volumeId: r.volume_id, chapterId: r.chapter_id })}>Jump to scene <Icon name="arrow"/></Button><Button variant="ghost" icon="bookmark">Save</Button></div></div><img src={books[i % books.length].image} alt="Novel cover"/></article>)}
      </section>
    </div>
  </main>;
}
function Reader({
  setView,
  user,
  onAuth,
  syncVolumeId,
  syncChapterId,
  volume,
  chapter,
  onSelectChapter,
}: {
  setView: (view: View) => void;
  user: User | null;
  onAuth: () => void;
  syncVolumeId: string | null;
  syncChapterId: string | null;
  volume: CatalogBook["volumes"][number] | undefined;
  chapter: CatalogBook["volumes"][number]["chapters"][number] | undefined;
  onSelectChapter: (chapterId: string) => void;
}) {
  const [theme, setTheme] = useState<"light"|"sepia"|"dark"|"amoled">("sepia");
  const [panel, setPanel] = useState<"toc"|"info"|null>("info");
  const [saved, setSaved] = useState(false);
  const [pageNumber, setPageNumber] = useState(chapter?.start_page ?? 1);
  const [pages, setPages] = useState<import("./lib/lumen").ChapterPage[]>([]);
  const [pageLoading, setPageLoading] = useState(false);

  const pageCount = Math.max(
    (chapter?.end_page ?? 0) - (chapter?.start_page ?? 0) + 1,
    pages.at(-1)?.page_number ?? 0,
    1
  );
  const currentPage = pages.find((page) => page.page_number === pageNumber);
  const fallbackTitle = chapter?.title ?? "Chapter";
  const chapterNumber = chapter?.chapter_number ?? 1;

  useEffect(() => {
    let active = true;
    if (!syncChapterId) {
      setPages([]);
      return () => { active = false; };
    }
    setPageLoading(true);
    import("./lib/lumen").then(({ fetchChapterPages }) =>
      fetchChapterPages(syncChapterId)
        .then((items) => {
          if (active) {
            setPages(items);
            const firstAvailable = items[0]?.page_number;
            if (firstAvailable && pageNumber < firstAvailable) setPageNumber(firstAvailable);
          }
        })
        .catch(() => {
          if (active) setPages([]);
        })
        .finally(() => {
          if (active) setPageLoading(false);
        })
    );
    return () => { active = false; };
  }, [syncChapterId]);

  useEffect(() => {
    if (!user || !syncVolumeId) return;
    import("./lib/lumen").then(({ fetchUserBookmarks, fetchUserProgress }) => {
      fetchUserBookmarks(user.id)
        .then((items) => setSaved(items.some((item) => item.volume_id === syncVolumeId && item.page_number === pageNumber)))
        .catch(() => undefined);
      fetchUserProgress(user.id)
        .then((items) => {
          const savedProgress = items.find((item) => item.volume_id === syncVolumeId);
          if (savedProgress?.page_number) setPageNumber(savedProgress.page_number);
        })
        .catch(() => undefined);
    });
  }, [user, syncVolumeId]);

  async function persistProgress(nextPage: number) {
    if (!user || !syncVolumeId) return;
    const pct = Math.max(0, Math.min(100, (nextPage / pageCount) * 100));
    const { saveReadingProgress } = await import("./lib/lumen");
    try {
      await saveReadingProgress({
        user,
        volumeId: syncVolumeId,
        chapterId: syncChapterId,
        pageNumber: nextPage,
        progressPercent: pct
      });
    } catch (error) {
      console.debug(error);
    }
  }

  async function goToPage(nextPage: number) {
    const next = Math.max(1, Math.min(pageCount, nextPage));
    setPageNumber(next);
    void persistProgress(next);
  }

  async function handleBookmark() {
    if (!user) { onAuth(); return; }
    if (!syncVolumeId) return;
    const { toggleBookmark } = await import("./lib/lumen");
    try {
      const next = await toggleBookmark({
        user,
        volumeId: syncVolumeId,
        chapterId: syncChapterId,
        pageNumber
      });
      setSaved(next);
    } catch {
      /* keep reader responsive */
    }
  }

  const paragraphs = (currentPage?.content ?? "").split(/\\n\\s*\\n|\\n/).map((text) => text.trim()).filter(Boolean);

  return <div className={`reader theme-${theme}`}>
    <header className="reader-top">
      <Button variant="icon" icon="close" label="Close reader" onClick={() => setView("home")}/>
      <div className="reader-title">
        <strong>{volume ? `${volume.title ?? `Volume ${volume.volume_number}`} — ${volume.subtitle ?? ""}` : "Lumen Reader"}</strong>
        <small>{`Chapter ${chapterNumber} · ${fallbackTitle}`}</small>
      </div>
      <div className="reader-tools">
        <Button variant="icon" icon="search" label="Search in book"/>
        <Button variant="icon" icon="type" label="Typography settings"/>
        <Button variant="icon" icon="list" label="Table of contents" onClick={()=>setPanel(panel==="toc"?null:"toc")}/>
        <Button variant="icon" icon="panel" label="Knowledge panel" onClick={()=>setPanel(panel==="info"?null:"info")}/>
        <Button variant="icon" icon={saved?"check":"bookmark"} label="Bookmark" onClick={handleBookmark}/>
      </div>
    </header>
    <div className="reader-progress"><i style={{width:`${Math.round((pageNumber / pageCount) * 100)}%`}}></i></div>
    <div className="reader-shell">
      <aside className="reader-rail">
        <Button variant="icon" icon="chevron" label="Previous page" onClick={() => void goToPage(pageNumber - 1)}/>
        <span>{pageNumber}</span>
        <div className="vertical-track"><i style={{height:`${Math.min(100, (pageNumber / pageCount) * 100)}%`}}></i></div>
        <span>{pageCount}</span>
        <Button variant="icon" icon="chevron" label="Next page" onClick={() => void goToPage(pageNumber + 1)}/>
      </aside>
      <article className="reading-page">
        <div className="chapter-mark"><span>CHAPTER {String(chapterNumber).padStart(2, "0")}</span><i></i></div>
        <h1>{fallbackTitle}</h1>
        {pageLoading && <div className="reader-inline-status">Loading extracted page…</div>}
        {!pageLoading && paragraphs.length === 0 && (
          <div className="reader-inline-status">
            <strong>Page {pageNumber} has not been extracted yet.</strong>
            <span>The PDF processing pipeline needs to finish this page before Lumen can display its text.</span>
          </div>
        )}
        {paragraphs.map((paragraph, index) =>
          <p className={index === 0 ? "dropcap" : ""} key={`${pageNumber}-${index}`}>{paragraph}</p>
        )}
        <div className="scene-break">✦</div>
        <footer><span>{volume?.title ?? "LUMEN"}</span><b>— {pageNumber} —</b><span>VOLUME {volume?.volume_number ?? ""}</span></footer>
      </article>
      {panel && <aside className="knowledge-panel">
        <div className="panel-tabs">
          <button type="button" className={panel==="info"?"active":""} onClick={()=>setPanel("info")}>Knowledge</button>
          <button type="button" className={panel==="toc"?"active":""} onClick={()=>setPanel("toc")}>Contents</button>
        </div>
        {panel === "info" ? <div className="reader-context-empty">
          <div className="safe-badge"><Icon name="eye" size={15}/> Safe for current volume</div>
          <h2>In this scene</h2>
          <p>Character and glossary extraction will appear here as the AI processing pipeline completes the volume.</p>
          <div className="glossary"><strong>Chapter summary</strong><p>{chapter?.spoiler_safe_summary ?? "No spoiler-safe summary has been generated yet."}</p></div>
        </div> :
        <><h2>Table of contents</h2>{(volume?.chapters ?? []).map((item)=>(
          <button type="button" className={item.id===syncChapterId?"chapter-link active":"chapter-link"} key={item.id} onClick={()=>onSelectChapter(item.id)}>
            <span>{String(item.chapter_number).padStart(2,"0")}</span>{item.title}
            {item.id===syncChapterId&&<Icon name="check" size={15}/>}
          </button>
        ))}</>}
      </aside>}
    </div>
    <div className="reader-bottom">
      <div className="themes">{(["light","sepia","dark","amoled"] as const).map(t=><button type="button" aria-label={`${t} reading theme`} className={`${t} ${theme===t?"active":""}`} key={t} onClick={()=>setTheme(t)}></button>)}</div>
      <div className="page-nav">
        <Button variant="ghost" onClick={() => void goToPage(pageNumber - 1)}>Previous</Button>
        <span>{Math.round((pageNumber / pageCount) * 100)}% · {Math.max(0, pageCount - pageNumber)} pages left</span>
        <Button variant="primary" onClick={() => void goToPage(pageNumber + 1)}>Next page <Icon name="arrow"/></Button>
      </div>
      <Button variant="ghost" icon="settings">Reading settings</Button>
    </div>
    {saved && <div className="toast"><Icon name="check"/><div><strong>Bookmark added</strong><small>Page {pageNumber} · Chapter {chapterNumber}</small></div></div>}
  </div>;
}


const stages = ["Validate file","Extract text & OCR","Analyze structure","Detect chapters","Extract metadata","Generate summaries","Characters & glossary","Generate embeddings","Human review","Publish"];

function AdminView({ catalog, user, onAuth, onCatalogChanged }: { catalog: CatalogBook[]; user: User | null; onAuth: () => void; onCatalogChanged: () => Promise<void> }) {
  const [selectedStage, setSelectedStage] = useState(5);
  const [selectedVolumeId, setSelectedVolumeId] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [jobStages, setJobStages] = useState<ProcessingStage[]>([]);
  const [jobLogs, setJobLogs] = useState<ProcessingLog[]>([]);
  const [novelOpen, setNovelOpen] = useState(false);
  const [novelMessage, setNovelMessage] = useState("");
  const [novelSaving, setNovelSaving] = useState(false);
  const [novelTitle, setNovelTitle] = useState("");
  const [novelAlternateTitle, setNovelAlternateTitle] = useState("");
  const [novelAuthor, setNovelAuthor] = useState("");
  const [novelDescription, setNovelDescription] = useState("");
  const [novelGenres, setNovelGenres] = useState("");
  const [novelLanguage, setNovelLanguage] = useState("en");
  const [novelVolumeNumber, setNovelVolumeNumber] = useState("1");
  const [novelVolumeTitle, setNovelVolumeTitle] = useState("Volume 1");
  const [novelVolumeSubtitle, setNovelVolumeSubtitle] = useState("");
  const [role, setRole] = useState<"reader"|"editor"|"admin">("reader");
  const fileRef = useRef<HTMLInputElement>(null);

  const volumes = catalog.flatMap((book) => book.volumes.map((volume) => ({
    ...volume,
    novelTitle: book.title,
  })));
  useEffect(() => {
    if (!selectedVolumeId && volumes[0]?.id) setSelectedVolumeId(volumes[0].id);
  }, [selectedVolumeId, catalog]);

  useEffect(() => {
    if (!user) { setRole("reader"); return; }
    fetchCurrentUserRole().then(setRole).catch(() => setRole("reader"));
  }, [user?.id]);

  async function refreshJob(volumeId = selectedVolumeId) {
    if (!volumeId || !user) {
      setJob(null); setJobStages([]); setJobLogs([]);
      return;
    }
    try {
      const nextJob = await fetchLatestProcessingJob(volumeId);
      setJob(nextJob);
      if (!nextJob) { setJobStages([]); setJobLogs([]); return; }
      const [nextStages, nextLogs] = await Promise.all([
        fetchProcessingStages(nextJob.id),
        fetchProcessingLogs(nextJob.id),
      ]);
      setJobStages(nextStages);
      setJobLogs(nextLogs);
    } catch {
      /* Keep the operations screen usable when policies are restrictive. */
    }
  }

  useEffect(() => {
    void refreshJob();
    if (!selectedVolumeId || !user) return;
    const interval = window.setInterval(() => void refreshJob(), 2500);
    return () => window.clearInterval(interval);
  }, [selectedVolumeId, user?.id]);

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
        setUploadMessage("Processing started. This screen now follows the live job state.");
      }
      await refreshJob(selectedVolumeId);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "PDF upload failed.");
      await refreshJob(selectedVolumeId);
    } finally {
      setUploading(false);
    }
  }

  async function handleCreateNovel() {
    if (!user) { setNovelMessage("Sign in first. Only editor/admin accounts can add titles."); onAuth(); return; }
    if (!novelTitle.trim()) { setNovelMessage("Novel title is required."); return; }
    const volumeNumber = Number.parseInt(novelVolumeNumber, 10);
    if (!Number.isInteger(volumeNumber) || volumeNumber < 1) { setNovelMessage("Volume number must be 1 or higher."); return; }
    setNovelSaving(true); setNovelMessage("");
    try {
      const response = await createNovel({
        user,
        title: novelTitle.trim(),
        alternateTitle: novelAlternateTitle.trim() || undefined,
        author: novelAuthor.trim() || undefined,
        description: novelDescription.trim() || undefined,
        genres: novelGenres.split(",").map((item)=>item.trim()).filter(Boolean),
        language: novelLanguage.trim() || "en",
        volumeNumber,
        volumeTitle: novelVolumeTitle.trim() || "Volume " + volumeNumber,
        volumeSubtitle: novelVolumeSubtitle.trim() || undefined,
      });
      if (response.error) throw response.error;
      await onCatalogChanged();
      setNovelMessage("Novel created as Draft. You can now select its volume and upload the PDF.");
      setNovelTitle(""); setNovelAlternateTitle(""); setNovelAuthor(""); setNovelDescription(""); setNovelGenres(""); setNovelLanguage("en"); setNovelVolumeNumber("1"); setNovelVolumeTitle("Volume 1"); setNovelVolumeSubtitle("");
      setNovelOpen(false);
    } catch (error) {
      setNovelMessage(error instanceof Error ? error.message : "Novel creation failed.");
    } finally {
      setNovelSaving(false);
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
        <Button variant="secondary" icon="book" onClick={()=>{setNovelOpen(true);setNovelMessage("");}} disabled={role==="reader"}>Add novel title</Button>
        <Button icon="upload" onClick={()=>fileRef.current?.click()} disabled={role==="reader"}>{uploading ? "Uploading…" : "Upload new PDF"}</Button>
      </div>
    </div>
    {uploadMessage && <div className="upload-message">{uploadMessage}</div>}
    {role==="reader" && <div className="upload-message permission-message"><strong>Reader access only.</strong> Your current account is a Reader. Content management requires the Editor or Admin role.</div>}
    {novelMessage && !novelOpen && <div className="upload-message">{novelMessage}</div>}
    {novelOpen && <div className="modal-backdrop" role="presentation" onMouseDown={()=>!novelSaving && setNovelOpen(false)}><section className="auth-modal novel-modal" role="dialog" aria-modal="true" onMouseDown={(e)=>e.stopPropagation()}>
      <button type="button" className="modal-close" onClick={()=>!novelSaving && setNovelOpen(false)} aria-label="Close">×</button>
      <div className="auth-brand"><span className="logo-mark">L</span><div><strong>Add novel title</strong><small>Create a new series and its first volume.</small></div></div>
      <div className="novel-form-grid">
        <label>Title<input value={novelTitle} onChange={(e)=>setNovelTitle(e.target.value)} placeholder="The Name of the Novel" autoFocus/></label>
        <label>Alternate title<input value={novelAlternateTitle} onChange={(e)=>setNovelAlternateTitle(e.target.value)} placeholder="Japanese / original title"/></label>
        <label>Author<input value={novelAuthor} onChange={(e)=>setNovelAuthor(e.target.value)} placeholder="Author name"/></label>
        <label>Language<input value={novelLanguage} onChange={(e)=>setNovelLanguage(e.target.value)} placeholder="en"/></label>
        <label>Genres<input value={novelGenres} onChange={(e)=>setNovelGenres(e.target.value)} placeholder="Fantasy, Adventure, Romance"/></label>
        <label>First volume number<input type="number" min="1" value={novelVolumeNumber} onChange={(e)=>{setNovelVolumeNumber(e.target.value); if(!novelVolumeTitle || /^Volume \d+$/.test(novelVolumeTitle)) setNovelVolumeTitle("Volume " + e.target.value)}}/></label>
        <label>Volume title<input value={novelVolumeTitle} onChange={(e)=>setNovelVolumeTitle(e.target.value)} placeholder="Volume 1"/></label>
        <label>Volume subtitle<input value={novelVolumeSubtitle} onChange={(e)=>setNovelVolumeSubtitle(e.target.value)} placeholder="Optional subtitle"/></label>
      </div>
      <label>Description<textarea value={novelDescription} onChange={(e)=>setNovelDescription(e.target.value)} placeholder="Short spoiler-safe description..." rows={4}/></label>
      {novelMessage && <div className="auth-message">{novelMessage}</div>}
      <button type="button" className="btn btn-primary auth-submit" onClick={()=>void handleCreateNovel()} disabled={novelSaving || role==="reader"}>{novelSaving ? "Creating…" : "Create draft novel"}</button>
      <small className="auth-note">The title starts as Draft. Upload and process a PDF from AI Studio before publishing it.</small>
    </section></div>}
    <div className="job-summary"><img src={selectedNovel?.cover_path ?? photos.castle} alt="Volume cover"/><div className="job-title"><span className="processing-badge"><i></i> {(job?.status ?? "idle").toUpperCase()}</span><h2>{selectedNovel?.title ?? "Select a volume"}</h2><p>{selectedVolume ? "Volume " + selectedVolume.volume_number + " · " + (selectedVolume.subtitle ?? selectedVolume.title) : "Choose a volume above"}</p></div><div className="job-stat"><span>Overall progress</span><strong>{Math.round(Number(job?.progress_percent ?? 0))}%</strong><div className="progress"><i style={{width:(Math.round(Number(job?.progress_percent ?? 0)) + "%")}}></i></div><small>{job?.current_stage ?? "No processing job yet"}</small></div><div className="job-stat"><span>Job</span><strong>{job ? job.id.slice(0,8) : "—"}</strong><small>{job?.started_at ? "Started " + new Date(job.started_at).toLocaleTimeString() : "Upload a PDF to create one"}</small></div><Button variant="secondary" onClick={()=>void refreshJob()}>{job ? "Refresh" : "Check status"}</Button></div>
    {job?.error_message && <div className="upload-message">{job.error_message}</div>}
    <div className="admin-layout">
      <section className="pipeline-card"><div className="card-head"><div><span>LIVE PIPELINE</span><h2>AI processing stages</h2></div><span className="live"><i></i> Live</span></div>
        <div className="pipeline">{(jobStages.length ? jobStages : stages.map((stage,i)=>({id:"placeholder-"+i,stage_order:i+1,stage_key:stage.toLowerCase().replace(/ /g,"_"),status:"waiting" as const,progress_percent:0,job_id:"",started_at:null,finished_at:null,error_message:null,metadata:{}}))).map((stage,i)=>{ const label=stage.stage_key.replace(/_/g," "); return <button type="button" key={stage.id} className={(stage.status==="completed"?"done ":"")+(stage.status==="running"?"current ":"")+(selectedStage===i?"selected":"")} onClick={()=>setSelectedStage(i)}><span className="stage-icon">{stage.status==="completed"?<Icon name="check" size={15}/>:stage.status==="running"?<Icon name="sparkles" size={16}/>:stage.status==="failed"?<Icon name="close" size={15}/>:i+1}</span><div><strong>{label}</strong><small>{stage.status === "waiting" ? "Waiting" : stage.status === "running" ? "Running" : stage.status === "completed" ? "Completed" : stage.status === "failed" ? "Failed" : "Skipped"}</small></div>{stage.status==="running"&&<em>{Math.round(Number(stage.progress_percent))}%</em>}</button>; })}</div>
      </section>
      <section className="console-card"><div className="card-head"><div><span>PROCESSING CONSOLE</span><h2>Live activity</h2></div><div><button type="button">Auto-scroll</button><Button variant="icon" icon="more" label="Console options"/></div></div>
        <div className="console">{jobLogs.length ? jobLogs.map((log)=><p key={log.id}><time>{new Date(log.created_at).toLocaleTimeString()}</time><span className={log.level}>{log.level.toUpperCase()}</span> {log.message}</p>) : <div className="result-placeholder"><Icon name="clock"/><strong>No live logs yet.</strong><p>Logs from the worker will appear here.</p></div>}</div>
        <div className="quality-grid"><div><span>Current stage</span><strong>{job?.current_stage ?? "—"}</strong><small>{job?.status ?? "No job"}</small></div><div><span>Progress</span><strong>{Math.round(Number(job?.progress_percent ?? 0))}%</strong><small>{job?.file_size_bytes ? (job.file_size_bytes / 1024 / 1024).toFixed(1) + " MB input" : "—"}</small></div><div><span>Warnings / errors</span><strong>{jobLogs.filter((log)=>log.level==="warn"||log.level==="error").length}</strong><small className="good">{job?.error_message ? "Needs attention" : "Tracking"}</small></div></div>
      </section>
    </div>
    <section className="review-strip"><div><Icon name="sparkles"/><span>UP NEXT</span><h2>{job?.status === "failed" ? "Processing failed" : "Human review"}</h2><p>{job?.status === "failed" ? (job.error_message ?? "The worker reported an error.") : "Review becomes actionable after the live ingestion stages finish."}</p></div><div className="review-preview"><div className="pdf-mini">PDF<span>{selectedVolume?.page_count ?? "—"}</span></div><Icon name="arrow"/><div className="web-mini"><span></span><span></span><span></span></div></div><Button variant="secondary" onClick={()=>void refreshJob()}>{job ? "Refresh job" : "Check job"} <Icon name="arrow"/></Button></section>
  </main>;
}


function LibraryView({ user, progress, bookmarks, onAuth, catalog, onRead }: { user: User | null; progress: Map<string, number>; bookmarks: UserBookmark[]; onAuth: () => void; catalog: CatalogBook[]; onRead: (target: { volumeId: string; chapterId: string | null }) => void }) {
  if (!user) return <main className="page"><section className="empty-state"><div className="library-icon">◫</div><h1>Your library</h1><p>Sign in to sync reading progress and bookmarks across devices.</p><Button onClick={onAuth}>Sign in to continue</Button></section></main>;
  const tracked = catalog.filter((book) => book.volumes.some((volume) => progress.has(volume.id)));
  const displayBooks = tracked.map((book) => ({
    book,
    volume: book.volumes.find((volume) => progress.has(volume.id)) ?? book.volumes.at(-1),
    display: books.find((item) => item.novelSlug === book.slug),
  })).filter((item) => item.display && item.volume);
  return <main className="page library-page"><div className="search-intro"><span className="hero-kicker dark">YOUR LIBRARY</span><h1>Everything you’re reading.</h1><p>Your reading activity is synced with your Lumen account.</p></div><section><div className="section-heading"><div><span>YOUR TITLES</span><h2>Recent library</h2></div></div>{displayBooks.length ? <div className="book-grid">{displayBooks.map(({book,volume,display}) => <article className="book-card" key={book.id} onClick={()=>onRead({volumeId:volume!.id, chapterId:volume!.chapters[0]?.id ?? null})}><div className="cover-wrap"><img src={display!.image} alt={`Cover of ${book.title}`} /><span className="cover-volume">Vol. {volume!.volume_number}</span></div><div className="book-meta"><div className="rating"><Icon name="star" size={14}/>{display!.rating}</div><span>{book.genres[0] ?? "Novel"}</span></div><h3>{book.title}</h3><p>{book.alternate_title ?? ""}</p><small>{book.author ?? "Unknown author"} · {Math.round(progress.get(volume!.id) ?? 0)}% synced</small></article>)}</div> : <div className="result-placeholder"><Icon name="library"/><strong>Your library is empty.</strong><p>Open a story and start reading; it will appear here automatically after progress sync.</p></div>}</section><section className="library-stats"><div><span>Bookmarks</span><strong>{bookmarks.length}</strong></div><div><span>Synced titles</span><strong>{displayBooks.length}</strong></div><div><span>Cloud sync</span><strong>Live</strong></div></section></main>;
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
  const initialReader = typeof window !== "undefined" && window.location.hash.startsWith("#reader?") ? new URLSearchParams(window.location.hash.slice(8)) : null;
  const [view, setView] = useState<View>(initialReader ? "reader" : "home");
  const [user, setUser] = useState<User | null>(null);
  const [catalog, setCatalog] = useState<CatalogBook[]>([]);
  const [progress, setProgress] = useState<Map<string, number>>(new Map());
  const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [readerTarget, setReaderTarget] = useState<{volumeId:string; chapterId:string|null}>(
    initialReader?.get("volume") ? { volumeId: initialReader.get("volume")!, chapterId: initialReader.get("chapter") } : { volumeId: "", chapterId: null }
  );
  const [, forceCatalogRefresh] = useState(0);

  async function refreshCatalog() {
    const items = await fetchCatalog();
    setCatalog(items);
    if (items.length) {
      books = catalogToDisplayBooks(items);
      forceCatalogRefresh((v) => v + 1);
    } else {
      books = [];
      forceCatalogRefresh((v) => v + 1);
    }
  }

  useEffect(() => {
    let active = true;
    refreshCatalog().catch(() => undefined);
    if (!active) return () => { active = false; };
    
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
      if (!readerTarget.volumeId && items[0]?.volume_id) {
        setReaderTarget({ volumeId: items[0].volume_id, chapterId: items[0].chapter_id });
      }
    }).catch(() => undefined);
  }, [user]);

  function openReader(target?: { volumeId?: string | null; chapterId?: string | null; book?: DisplayBook }) {
    const volumeId = target?.volumeId ?? target?.book?.volumeId;
    const chapterId = target?.chapterId ?? target?.book?.chapterId ?? null;
    const fallbackVolume = catalog.find((book) => book.volumes.some((volume) => progress.has(volume.id)))?.volumes.find((volume) => progress.has(volume.id))
      ?? catalog.find((book) => book.featured)?.volumes.at(-1)
      ?? catalog[0]?.volumes.at(-1);
    const finalVolumeId = volumeId ?? fallbackVolume?.id ?? "";
    const finalChapterId = chapterId ?? fallbackVolume?.chapters[0]?.id ?? null;
    if (!finalVolumeId) { setView("search"); return; }
    setReaderTarget({ volumeId: finalVolumeId, chapterId: finalChapterId });
    setView("reader");
    if (typeof window !== "undefined") {
      const params = new URLSearchParams({ volume: finalVolumeId });
      if (finalChapterId) params.set("chapter", finalChapterId);
      window.history.replaceState(null, "", `#reader?${params.toString()}`);
    }
  }

  const targetBook = catalog.find((book) => book.volumes.some((volume) => volume.id === readerTarget.volumeId));
  const targetVolume = targetBook?.volumes.find((volume) => volume.id === readerTarget.volumeId) ?? targetBook?.volumes.at(-1);
  const targetChapter = targetVolume?.chapters.find((chapter) => chapter.id === readerTarget.chapterId) ?? targetVolume?.chapters[0];

  function selectReaderChapter(chapterId:string) {
    if (!targetVolume) return;
    setReaderTarget({ volumeId: targetVolume.id, chapterId });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams({ volume: targetVolume.id, chapter: chapterId });
      window.history.replaceState(null, "", `#reader?${params.toString()}`);
    }
  }

  async function handleSignOut() { await signOut(); setUser(null); setReaderTarget({volumeId:"",chapterId:null}); setView("home"); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname + window.location.search); }

  return <><div className="app-shell"><Sidebar view={view} setView={setView} onAuth={() => setAuthOpen(true)}/><div className="main-shell"><Topbar title={view === "admin" ? "Content operations" : view === "library" ? "My library" : undefined} setView={setView} user={user} onAuth={() => setAuthOpen(true)}/>{view === "home" && <Home setView={setView} catalog={catalog} progress={progress} onRead={(book)=>openReader({book})}/>} {view === "search" && <SearchView setView={setView} user={user} onAuth={() => setAuthOpen(true)} onRead={(target)=>openReader(target)}/>} {view === "admin" && <AdminView catalog={catalog} user={user} onAuth={() => setAuthOpen(true)} onCatalogChanged={refreshCatalog}/>} {view === "library" && <LibraryView user={user} progress={progress} bookmarks={bookmarks} catalog={catalog} onAuth={() => setAuthOpen(true)} onRead={openReader}/>}</div><BottomNav view={view} setView={(next)=> next === "reader" ? openReader() : setView(next)}/></div>{view === "reader" && <Reader setView={(next)=>{if(next !== "reader") { setView(next); if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname + window.location.search); }}} user={user} onAuth={() => setAuthOpen(true)} syncVolumeId={targetVolume?.id ?? null} syncChapterId={targetChapter?.id ?? null} volume={targetVolume} chapter={targetChapter} onSelectChapter={selectReaderChapter}/>}<AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onSignedIn={(nextUser) => setUser(nextUser)}/>{user && <button type="button" className="signout-fab" onClick={handleSignOut}>Sign out</button>}</>;
}