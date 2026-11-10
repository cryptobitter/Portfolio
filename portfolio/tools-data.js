/**
 * tools-data.js
 * Single source of truth for the Heraldic Tech Stack Castle.
 * 
 * To add or move a tool:
 * 1. Find or add an entry in the TECH_CASTLE_TOOLS array.
 * 2. Set 'gridArea' to the desired "rowStart / colStart / rowEnd / colEnd" (1-indexed, 7 columns x 6 rows).
 * 3. Set 'layer' for build-up animation order:
 *      1 = Foundation (Row 5 & Plinth)
 *      2 = Curtain Wall & Gate (Row 4)
 *      3 = Upper Wall & Towers (Row 3)
 *      4 = Turrets (Row 2)
 *      5 = Pinnacle & Dashed block (Row 1 & Row 2 Col 7)
 * 4. Set 'category': 'Language' | 'Frontend' | 'Backend' | 'LLM / RAG' | 'Database' | 'Deployment' | 'IoT'.
 * 5. Set 'catClass': 'cat-lang' | 'cat-frontend' | 'cat-backend' | 'cat-ai' | 'cat-db' | 'cat-devops' | 'cat-iot'.
 */

window.TECH_CASTLE_TOOLS = [
  // --- ROW 1: TOWER PINNACLE ---
  {
    id: 'groq',
    name: 'Groq API',
    category: 'LLM / RAG',
    catClass: 'cat-ai',
    layer: 5,
    gridArea: '1 / 1 / 2 / 2', // Row 1, Col 1 (tallest left tower peak, with pennant atop)
    mobileGroup: 'towers',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#F55036" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" fill="rgba(245,80,54,0.18)"/><path d="M9 9h6v6H9z"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>'
  },

  // --- ROW 2: TURRETS & PEAKS ---
  {
    id: 'rag',
    name: 'RAG Pipelines',
    category: 'LLM / RAG',
    catClass: 'cat-ai',
    layer: 4,
    gridArea: '2 / 1 / 3 / 2', // Row 2, Col 1 (left tower)
    mobileGroup: 'towers',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#E88B3A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h6"/><circle cx="18" cy="15" r="3" fill="rgba(232,139,58,0.3)"/><path d="M18 12v-2M15 15h-2"/></svg>'
  },
  {
    id: 'esp32',
    name: 'ESP32',
    category: 'IoT',
    catClass: 'cat-iot',
    layer: 4,
    gridArea: '2 / 4 / 3 / 5', // Row 2, Col 4 (central watchtower turret)
    mobileGroup: 'towers',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#E0784B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2" fill="rgba(224,120,75,0.25)"/><path d="M9 9h6v6H9z"/><path d="M2 9h3M2 15h3M19 9h3M19 15h3M9 2v3M15 2v3M9 19v3M15 19v3"/></svg>'
  },
  {
    id: 'langchain',
    name: 'LangChain',
    category: 'LLM / RAG',
    catClass: 'cat-ai',
    layer: 4,
    gridArea: '2 / 7 / 3 / 8', // Row 2, Col 7 (right tower turret)
    mobileGroup: 'towers',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none"><path d="M19 11c-.5-3.5-3.5-6-7-6-3.9 0-7 3.1-7 7 0 2.2 1 4.2 2.6 5.5L7 21l3.5-1.5c.5.3 1 .4 1.5.5v-3c-.8-.2-1.5-.7-2-1.4-.8-1.1-1-2.5-.5-3.8.7-1.8 2.6-3 4.5-3h.5l3.5-2v3.2c.7.6 1.2 1.5 1.4 2.5.4 1.9-.3 3.9-1.8 5.1-.6.5-1.3.8-2.1.9v3c4-.6 7-4 7-8.5z" fill="#00A67E" fill-opacity="0.25" stroke="#00A67E" stroke-width="1.5" stroke-linejoin="round"/><path d="M17 9.5l3.5 2.5-3.5 2.5" stroke="#E2B855" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11.5" cy="9.5" r="1.5" fill="#E2B855"/></svg>'
  },
  {
    id: 'next-block',
    name: '+ Next Block',
    category: 'Future',
    catClass: 'cat-empty',
    layer: 5,
    gridArea: '1 / 7 / 2 / 8', // Row 1, Col 7 (right tower peak dashed block)
    mobileGroup: 'towers',
    isDashed: true,
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  },

  // --- ROW 3: UPPER WALL & MID TOWERS ---
  {
    id: 'embeddings',
    name: 'Embeddings',
    category: 'LLM / RAG',
    catClass: 'cat-ai',
    layer: 3,
    gridArea: '3 / 1 / 4 / 2', // Row 3, Col 1 (left tower)
    mobileGroup: 'towers',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#38BDF8" stroke-width="2"><circle cx="6" cy="6" r="2.5" fill="#38BDF8"/><circle cx="18" cy="6" r="2.5" fill="#38BDF8"/><circle cx="12" cy="18" r="2.5" fill="#38BDF8"/><path d="M8 7.5l8 0M7 8l4 8M17 8l-4 8" stroke="rgba(56,189,248,0.4)" stroke-dasharray="2 2"/></svg>'
  },
  {
    id: 'python',
    name: 'Python',
    category: 'Language',
    catClass: 'cat-lang',
    layer: 3,
    gridArea: '3 / 2 / 4 / 3', // Row 3, Col 2 (curtain wall left)
    mobileGroup: 'wall',
    icon: '<svg viewBox="0 0 128 128" width="24" height="24"><path fill="#387EB8" d="M63.5 13c-27.2 0-25.5 11.8-25.5 11.8l.1 12.2h26.1v3.7H27.9S13 39 13 66.2c0 27.2 13 26.3 13 26.3h7.7V81.7s-.4-12.8 12.6-12.8h25.8s12.2.2 12.2-11.8V25.2s1.7-12.2-20.8-12.2zm-14 7.6c2.4 0 4.4 2 4.4 4.4 0 2.4-2 4.4-4.4 4.4s-4.4-2-4.4-4.4c0-2.4 2-4.4 4.4-4.4z"/><path fill="#FFE052" d="M64.5 115c27.2 0 25.5-11.8 25.5-11.8l-.1-12.2H63.8v-3.7h36.3s14.9 1.7 14.9-25.5c0-27.2-13-26.3-13-26.3h-7.7v10.8s.4 12.8-12.6 12.8H55.9s-12.2-.2-12.2 11.8v31.9s-1.7 12.2 20.8 12.2zm14-7.6c-2.4 0-4.4-2-4.4-4.4 0-2.4 2-4.4 4.4-4.4s4.4 2 4.4 4.4c0 2.4-2 4.4-4.4 4.4z"/></svg>'
  },
  {
    id: 'sql',
    name: 'SQL',
    category: 'Language',
    catClass: 'cat-lang',
    layer: 3,
    gridArea: '3 / 6 / 4 / 7', // Row 3, Col 6 (curtain wall right)
    mobileGroup: 'wall',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#E2B855" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>'
  },
  {
    id: 'react',
    name: 'React',
    category: 'Frontend',
    catClass: 'cat-frontend',
    layer: 3,
    gridArea: '3 / 7 / 4 / 8', // Row 3, Col 7 (right tower high)
    mobileGroup: 'towers',
    icon: '<svg viewBox="-11.5 -10.23174 23 20.46348" width="24" height="24"><circle cx="0" cy="0" r="2.05" fill="#61DAFB"/><g stroke="#61DAFB" stroke-width="1" fill="none"><ellipse rx="11" ry="4.2"/><ellipse rx="11" ry="4.2" transform="rotate(60)"/><ellipse rx="11" ry="4.2" transform="rotate(120)"/></g></svg>'
  },

  // --- ROW 4: MAIN CURTAIN WALL & GATEHOUSE LINTEL ---
  {
    id: 'opencv',
    name: 'OpenCV',
    category: 'LLM / RAG',
    catClass: 'cat-ai',
    layer: 2,
    gridArea: '4 / 1 / 5 / 2', // Row 4, Col 1 (left tower base)
    mobileGroup: 'towers',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="7" r="3.5" fill="none" stroke="#EA4335" stroke-width="2.2"/><circle cx="7" cy="15.5" r="3.5" fill="none" stroke="#4285F4" stroke-width="2.2"/><circle cx="17" cy="15.5" r="3.5" fill="none" stroke="#34A853" stroke-width="2.2"/></svg>'
  },
  {
    id: 'fastapi',
    name: 'FastAPI',
    category: 'Backend',
    catClass: 'cat-backend',
    layer: 2,
    gridArea: '4 / 2 / 5 / 3', // Row 4, Col 2 (curtain wall)
    mobileGroup: 'wall',
    icon: '<svg viewBox="0 0 128 128" width="24" height="24"><circle cx="64" cy="64" r="64" fill="#05998B"/><path fill="#FFF" d="M72.2 14L28 70h30.2L50 114l50-56H68.8L72.2 14z"/></svg>'
  },
  {
    id: 'render',
    name: 'Render',
    category: 'Deployment',
    catClass: 'cat-devops',
    layer: 2,
    gridArea: '4 / 3 / 5 / 4', // Row 4, Col 3 (curtain wall / gate flank)
    mobileGroup: 'gate',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#46E3B7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="rgba(70,227,183,0.3)"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="rgba(70,227,183,0.3)"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="rgba(70,227,183,0.3)"/><path d="M3 14h7v7H3z"/></svg>'
  },
  {
    id: 'vercel',
    name: 'Vercel',
    category: 'Deployment',
    catClass: 'cat-devops',
    layer: 2,
    gridArea: '4 / 4 / 5 / 5', // Row 4, Col 4 (gatehouse arch lintel)
    mobileGroup: 'gate',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="#FFFFFF"><path d="M12 1L24 22H0L12 1Z"/></svg>'
  },
  {
    id: 'git-github',
    name: 'Git / GitHub',
    category: 'Deployment',
    catClass: 'cat-devops',
    layer: 2,
    gridArea: '4 / 5 / 5 / 6', // Row 4, Col 5 (curtain wall / gate flank)
    mobileGroup: 'gate',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="#F05032"><path d="M21.6 10.9L13.1 2.4c-.8-.8-2-.8-2.8 0L8.5 4.2l3.6 3.6c.9-.3 1.9 0 2.5.6.7.7.9 1.7.6 2.5l3.4 3.4c.9-.3 1.9 0 2.5.6 1 .9 1 2.5 0 3.5s-2.5 1-3.5 0c-.8-.8-1-2-.4-3l-3.2-3.2v6.2c.5.3.8.9.8 1.5 0 1.1-.9 2-2 2s-2-.9-2-2c0-.7.4-1.3 1-1.7V9.7c-.6-.4-1-1-1-1.7 0-.4.1-.7.3-1L4.2 10.5c-.8.8-.8 2 0 2.8l8.5 8.5c.8.8 2 .8 2.8 0l6.1-6.1c.8-.8.8-2 0-2.8z"/></svg>'
  },
  {
    id: 'docker',
    name: 'Docker',
    category: 'Deployment',
    catClass: 'cat-devops',
    layer: 2,
    gridArea: '4 / 6 / 5 / 7', // Row 4, Col 6 (curtain wall)
    mobileGroup: 'wall',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="#2496ED"><path d="M13.9 8.5h-1.8v1.8h1.8V8.5zm-2.4 0H9.7v1.8h1.8V8.5zm-2.4 0H7.3v1.8h1.8V8.5zm7.2 0h-1.8v1.8h1.8V8.5zm-4.8-2.4H9.7v1.8h1.8V6.1zm2.4 0h-1.8v1.8h1.8V6.1zm2.4 0h-1.8v1.8h1.8V6.1zm-7.2 4.8H7.3v1.8h1.8v-1.8zm2.4 0H9.7v1.8h1.8v-1.8zm2.4 0h-1.8v1.8h1.8v-1.8zm2.4 0h-1.8v1.8h1.8v-1.8z"/><path d="M23.8 11.8c-.5-.4-1.6-.6-2.4-.2-.2-.8-.7-1.4-1.5-1.7l-.6-.2-.4.5c-.7 1-1 2.2-.9 3.5 0 .2.1.4.1.6H1.1c-.6 0-1 .4-1 1 0 3.3 2.1 6.3 5.4 7.6 5.8 2.3 12.8 1.1 17.1-3 1.1-1.1 1.7-2.6 1.8-4.2.1-.8-.1-2.6-.6-3.6z"/></svg>'
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    category: 'Language',
    catClass: 'cat-lang',
    layer: 2,
    gridArea: '4 / 7 / 5 / 8', // Row 4, Col 7 (right tower mid)
    mobileGroup: 'towers',
    icon: '<svg viewBox="0 0 128 128" width="24" height="24"><rect width="128" height="128" rx="16" fill="#F7DF1E"/><path fill="#000" d="M34 102c4.4 2.8 10 4.5 15.3 4.5 14.2 0 23.3-7.2 23.3-25.1V22H53v59.3c0 9.2-4.6 13.5-11.8 13.5-4 0-6.7-.8-8.7-1.8L34 102zm46.5 2.8c7.3 4.2 17.5 7 26.7 7 15.6 0 25.5-7.8 25.5-20 0-11.3-7.2-17.5-20.5-23.2-9-3.8-12.2-6.6-12.2-11.2 0-4.4 3.7-7.6 10.4-7.6 6.3 0 11.7 2 15.2 4.2l3.8-14.7c-4.4-2.2-11.5-4-19.4-4-15.6 0-25.3 8.6-25.3 20.4 0 11.8 8.1 18.2 20.8 23.5 8.7 3.7 11.8 6.8 11.8 11.5 0 4.7-4.4 8.2-11.5 8.2-7.5 0-14.4-2.8-19-6l-5.7 11.9z"/></svg>'
  },

  // --- ROW 5: FOUNDATION STONES ---
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'Database',
    catClass: 'cat-db',
    layer: 1,
    gridArea: '5 / 1 / 6 / 2', // Row 5, Col 1 (foundation base left tower)
    mobileGroup: 'foundation',
    icon: '<svg viewBox="0 0 128 128" width="24" height="24"><path fill="#336791" d="M64 8C33.1 8 8 33.1 8 64c0 30.9 25.1 56 56 56s56-25.1 56-56c0-30.9-25.1-56-56-56zm28.8 81.6c-4.4 2.2-11.4 3.5-16.7 3.5-12.7 0-16.4-6.3-16.4-15.6V56.2h-9.7v-9.6h9.7v-9.8l11.4-3.5v13.3h14v9.6h-14v18.7c0 4.6 1.8 7 6.4 7 3.1 0 6.6-.9 8.7-2.2l.6 10.4z"/></svg>'
  },
  {
    id: 'neon',
    name: 'Neon',
    category: 'Database',
    catClass: 'cat-db',
    layer: 1,
    gridArea: '5 / 2 / 6 / 3', // Row 5, Col 2 (foundation)
    mobileGroup: 'foundation',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#00E599" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="rgba(0,229,153,0.25)"/></svg>'
  },
  {
    id: 'supabase',
    name: 'Supabase',
    category: 'Database',
    catClass: 'cat-db',
    layer: 1,
    gridArea: '5 / 3 / 6 / 4', // Row 5, Col 3 (foundation left flank of gate)
    mobileGroup: 'foundation',
    icon: '<svg viewBox="0 0 109 113" width="24" height="24" fill="none"><path d="M63.7 110.3c-2.3 3.1-7.4 1.7-7.7-2.2L52 57.3H98c5.4 0 8.3 6.3 4.8 10.4L63.7 110.3z" fill="#3ECF8E"/><path d="M45.3 2.7c2.3-3.1 7.4-1.7 7.7 2.2l4 50.8H11c-5.4 0-8.3-6.3-4.8-10.4L45.3 2.7z" fill="#3ECF8E" fill-opacity=".75"/></svg>'
  },
  // (Col 4 is the Arched Gate opening)
  {
    id: 'vectordb',
    name: 'Vector Database',
    category: 'Database',
    secondaryCategory: 'LLM / RAG',
    catClass: 'cat-db',
    layer: 1,
    gridArea: '5 / 5 / 6 / 6', // Row 5, Col 5 (foundation right flank of gate)
    mobileGroup: 'foundation',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#3ECF8E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="2.5" fill="rgba(62,207,142,0.25)"/><path d="M4 5v14c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5"/><path d="M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/><circle cx="12" cy="12" r="1.5" fill="#3ECF8E"/></svg>'
  },
  {
    id: 'redis',
    name: 'Redis',
    category: 'Backend',
    catClass: 'cat-backend',
    layer: 1,
    gridArea: '5 / 6 / 6 / 8', // Row 5, Cols 6-7 (spans 2 columns under right tower!)
    mobileGroup: 'foundation',
    icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#D82C20" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="rgba(216,44,32,0.25)"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>'
  }
];
