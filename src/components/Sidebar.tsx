'use client';

import { useState } from 'react';
import { useApp, Page, PAGE_TITLES } from '@/contexts/AppContext';

const PLT_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  tiktok:    '#52c7cf',
  youtube:   '#FF0000',
  twitter:   '#1DA1F2',
  facebook:  '#1877F2',
};

// Logo SVG inline — Prancheta 19 (fauno + wordmark), fill #f2eee5
// Funciona tanto no dark sidebar (#0c0c0c) quanto no light sidebar (#343128)
function AntroLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="44 108 208 84"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <style>{'.cls-1{fill:#f2eee5}'}</style>
      </defs>
      <g>
        <g>
          <path className="cls-1" d="M127.04,174.95c-.82,0-1.57-.14-2.27-.43-.69-.29-1.29-.7-1.8-1.22-.51-.52-.91-1.15-1.19-1.87-.28-.72-.43-1.5-.43-2.35s.14-1.63.42-2.33c.28-.7.67-1.31,1.18-1.83.51-.52,1.11-.92,1.8-1.2.69-.28,1.45-.42,2.28-.42.93,0,1.78.18,2.53.54.75.36,1.36.87,1.84,1.53.48.66.77,1.43.87,2.31h-2.36c-.14-.81-.47-1.42-.99-1.83-.53-.41-1.15-.62-1.87-.62-.64,0-1.2.15-1.69.46-.49.3-.87.74-1.14,1.31-.27.57-.41,1.26-.41,2.07s.14,1.53.42,2.12c.28.59.66,1.05,1.16,1.37.49.32,1.06.48,1.7.48.68,0,1.29-.2,1.81-.61.53-.41.87-1.02,1.02-1.83h2.39c-.14.88-.45,1.65-.93,2.31-.48.66-1.1,1.16-1.84,1.52-.75.36-1.58.54-2.5.54Z"/>
          <path className="cls-1" d="M133.38,174.79v-11.34h5.07c.82,0,1.53.14,2.14.42.61.28,1.08.67,1.42,1.17.34.5.5,1.09.5,1.76s-.17,1.24-.5,1.74c-.34.5-.81.89-1.42,1.17-.61.28-1.32.42-2.14.42h-3.15v-1.78h3.09c.58,0,1.02-.13,1.33-.4.31-.27.46-.64.46-1.13s-.15-.87-.46-1.13c-.3-.26-.75-.39-1.34-.39h-2.58v9.48h-2.43ZM139.78,174.79l-4.55-5.89h2.57l5.26,5.89h-3.28Z"/>
          <path className="cls-1" d="M143.97,174.79v-11.34h2.43v11.34h-2.43ZM145.1,165.31v-1.86h7.12v1.86h-7.12ZM145.1,169.91v-1.83h6.76v1.83h-6.76ZM145.1,174.79v-1.86h7.31v1.86h-7.31Z"/>
          <path className="cls-1" d="M153.34,174.79l4.06-11.34h2.08l-3.73,11.34h-2.41ZM155.48,170.4h6.36v1.89h-6.36v-1.89ZM161.66,174.79l-3.72-11.34h2.17l4.06,11.34h-2.52Z"/>
          <path className="cls-1" d="M166.82,174.79v-9.48h-3.7v-1.86h9.83v1.86h-3.7v9.48h-2.43Z"/>
          <path className="cls-1" d="M174.11,174.79v-11.34h2.43v11.34h-2.43Z"/>
          <path className="cls-1" d="M181.77,174.79l-4.06-11.34h2.52l3.1,9.45h-.3l3.12-9.45h2.39l-4.06,11.34h-2.71Z"/>
          <path className="cls-1" d="M189.71,174.79v-11.34h2.43v11.34h-2.43ZM190.84,165.31v-1.86h7.12v1.86h-7.12ZM190.84,169.91v-1.83h6.76v1.83h-6.76ZM190.84,174.79v-1.86h7.31v1.86h-7.31Z"/>
          <path className="cls-1" d="M204.51,174.95c-.82,0-1.57-.14-2.27-.43-.69-.29-1.29-.7-1.8-1.22-.51-.52-.91-1.15-1.19-1.87-.28-.72-.43-1.5-.43-2.35s.14-1.63.42-2.33c.28-.7.67-1.31,1.18-1.83.51-.52,1.11-.92,1.8-1.2.69-.28,1.45-.42,2.28-.42.93,0,1.78.18,2.53.54.75.36,1.36.87,1.84,1.53.48.66.77,1.43.87,2.31h-2.36c-.14-.81-.47-1.42-.99-1.83-.53-.41-1.15-.62-1.87-.62-.64,0-1.2.15-1.69.46-.49.3-.87.74-1.14,1.31-.27.57-.41,1.26-.41,2.07s.14,1.53.42,2.12c.28.59.66,1.05,1.16,1.37.49.32,1.06.48,1.7.48.68,0,1.29-.2,1.81-.61.53-.41.87-1.02,1.02-1.83h2.39c-.14.88-.45,1.65-.93,2.31-.48.66-1.1,1.16-1.84,1.52-.75.36-1.58.54-2.5.54Z"/>
          <path className="cls-1" d="M210.95,174.79v-11.34h2.43v11.34h-2.43ZM212.09,174.79v-1.86h6.74v1.86h-6.74Z"/>
          <path className="cls-1" d="M224.22,174.95c-1.62,0-2.83-.44-3.63-1.33-.8-.89-1.21-2.18-1.21-3.88v-6.28h2.43v6.71c0,.99.22,1.71.65,2.17s1.02.69,1.78.69,1.35-.23,1.78-.69c.43-.46.65-1.18.65-2.16v-6.73h2.43v6.32c0,1.68-.4,2.96-1.21,3.85-.81.89-2.03,1.33-3.65,1.33Z"/>
          <path className="cls-1" d="M230.42,174.79v-11.34h2.43v11.34h-2.43ZM232.41,174.79v-1.73h2.93c.52,0,.92-.14,1.19-.43s.4-.69.4-1.2-.14-.94-.43-1.24c-.29-.3-.7-.46-1.24-.46h-2.85v-1.73h2.73c.49,0,.87-.12,1.13-.35s.39-.59.39-1.05-.12-.81-.37-1.05c-.25-.24-.61-.35-1.09-.35h-2.77v-1.73h3.29c1.01,0,1.82.26,2.44.77.62.51.93,1.21.93,2.09,0,.56-.13,1.03-.39,1.43-.26.4-.61.7-1.06.91-.44.21-.94.32-1.48.32l.08-.33c.59,0,1.12.13,1.6.38.48.25.86.61,1.14,1.06.28.46.43,1,.43,1.61s-.14,1.16-.43,1.63c-.29.47-.69.83-1.21,1.08-.52.25-1.13.38-1.83.38h-3.5Z"/>
        </g>
        <g>
          <path className="cls-1" d="M140.95,156.97v-6.43h-.49l-.16,1.21c-.49,3.57-4.73,5.77-9.57,5.77-5.72,0-9.73-2.86-9.84-8.19-.16-6.16,5.11-8.19,11.65-8.41,4.84-.16,8.19-.27,8.19-2.09,0-3.35-2.14-5.72-7.09-5.72-4.23,0-6.98,1.92-7.31,6.16h-5.06c.16-6.98,5.11-10.72,12.09-10.72,9.07,0,12.42,4.4,12.42,10.83v17.59h-4.84ZM131.66,152.9c4.4-.11,9.07-2.31,9.07-6.21v-5.06h-.44l-.11.77c-.22,1.26-1.48,1.98-3.35,2.14-2.03.28-4.18.44-5.83.6-3.57.33-5.22,1.7-5.11,4.07.16,2.47,2.47,3.79,5.77,3.68Z"/>
          <path className="cls-1" d="M152.38,129.1v8.14h.6l.11-1.26c.38-4.4,4.12-7.42,9.4-7.42,7.42.06,10.23,4.67,10.23,11.05v17.37h-5.06v-16.55c0-4.56-2.03-6.71-6.27-6.82-5.66-.11-9.02,3.46-9.02,9.46v13.91h-5v-27.87h5Z"/>
          <path className="cls-1" d="M173.19,134.05v-4.95h1.29c1.26,0,2.09-.71,2.14-2.75l.05-5.66h5.44l-.05,4.56c-.05,2.31-1.48,3.08-3.52,3.3l-.88.11v.44h12.09v4.95h-8.03v15.45c0,2.03,1.43,3.19,3.35,3.24,1.21,0,2.69-.33,3.79-1.26l1.98,4.34c-1.32.93-3.63,1.7-5.99,1.7-5.55,0-8.36-3.41-8.36-7.59v-15.89h-3.33Z"/>
          <path className="cls-1" d="M203.94,133.22c-2.42-.05-4.23.6-6.43,3.02l-.11,20.73h-5v-27.93h5.11v4.67c1.04-2.8,3.96-5.28,8.47-5.17,5.61.06,7.75,4.12,7.64,9.46l-4.89.05c-.27-3.41-2.58-4.78-4.78-4.84Z"/>
          <path className="cls-1" d="M225.84,157.41c-8.14,0-13.96-5.11-13.96-14.46s5.83-14.4,13.96-14.4,14.02,5.22,14.02,14.4-5.77,14.46-14.02,14.46ZM225.84,133.33c-5.55,0-8.8,3.68-8.8,9.62s2.97,9.57,8.8,9.57,8.8-3.35,8.8-9.57-3.13-9.62-8.8-9.62Z"/>
        </g>
        <g>
          <path className="cls-1" d="M237.64,115.36H74.22c.16.16.29.36.38.62.13.38.24.92.09,1.52h162.94c5.7,0,10.34,4.64,10.34,10.34v46.58c0,5.7-4.64,10.34-10.34,10.34H66.16c-.06.11-.12.22-.18.33-.29.58-.37,1.15-.22,1.8h171.88c6.88,0,12.48-5.6,12.48-12.48v-46.58c0-6.88-5.6-12.48-12.48-12.48Z"/>
          <path className="cls-1" d="M55.98,185.7c.24-.39.48-.77.73-1.15-4.75-.93-8.35-5.12-8.35-10.14v-46.58c0-1.33.26-2.59.72-3.76-1.15-1.29-.69-2.57-.16-3.55-.05-.08-.09-.18-.13-.27-1.61,2.1-2.57,4.73-2.57,7.57v46.58c0,5.83,4.02,10.73,9.43,12.1.08-.3.19-.58.33-.81Z"/>
        </g>
        <rect className="cls-1" x="111.73" y="135.36" width="2.14" height="31.53"/>
      </g>
      <g>
        <path className="cls-1" d="M63.88,109.45c.83-.33,1.13-.55,2.04-.21.32.12.76.51,1.02.57.21.04.46-.08.73-.05.63.07,1.56.78,1.78,1.38.09.25.02.59.2.78.15.16.74.24,1.03.45.65.46,1.1,2.04.15,2.21-.23.04-1.02-.25-.93.05l.86,1.34c.67.18,1.4-.76,1.74.2.44,1.25-.41,2.13-1.4,2.72-.09.29.26.63.17.95-.04.14-.27.26-.34.46-.07.21-.03.4-.13.66-.15.35-.87.8-.9,1.08.08,1,.82.8,1.38,1.19,1.03.71.49,1.92-.59,2.12l.46.8,10.64,2.95c-.02-.67,1.76-2.68,2.32-2.53.33.09.43.58.37.88-.07.38-1.46,1.98-1.36,2.05.68.17.67-.49,1.05-.77.59-.45,1.71-.39,1.72.53-.4.12-.79.24-.99.64l.58.09c.1-.38.77-1,1.14-.97s.75.31.63.72c-.01.03-.68.79-.23.56.18-.09.33-.63.55-.83s.7-.42.98-.6c.33-.22,1.25-1.15,1.39-.08.1.8-1.01,1.3-1.38,1.91.86-.15,2.31-.54,2.71.5.05.13-.09.32.11.38,1.28.35,2.51.86,3.77,1.27,1.43.47,2.9.83,4.34,1.28,1.25.39,3.64.96,4.69,1.53.91.5.29,2.91-.75,2.84-3.49-1.2-6.96-2.49-10.45-3.68-.54-.18-2.89-1.05-3.26-.94-.14.04-1.39,1.4-1.72,1.64-.57.43-2.08.93-2.28,1.13-.08.08-.26.57-.38.76-1.48,2.3-3.49,4.85-5.77,6.37-.18.12-1.34.82-1.44.83-.24.02-1.02-1.11-1.25-1.33-.32-.3-.74-.52-1.05-.82,2.24-.65,4.6-1.64,6.42-3.11.6-.48,1.49-1.28,2.03-1.82.11-.11.82-.9.74-.99-1.53,1.06-2.89,2.62-4.47,3.57-2.17,1.31-4.62,1.91-6.84,3.03-1.55.78-1.81.13-3.16.05-3.01-.17-4.8.06-7.81-.89-.42-.13-.84-.51-1.3-.37.44.32,1.01.67,1.53.84,2.24.78,4.6.87,6.91.99,1.53.08,2.56.47,4.03-.32.33-.18,1.48.08,1.76,0s1.53,1.02,1.78,1.27c1.06,1.02,1.4,1.37,2,2.7.29.65.62,2,.9,2.46.15.25.72.49.74.56.1.46-.29.37-.5.57-.32.31-.69,1.47-1.18,1.83.19.04.23-.1.35-.2,2.45-2.06,3.48-3.2,6.63-4.42,1.89-.73,3.44-1.04,5.48-.49.71.2.85.67,1.39.88.37.14.82.14,1.21.27,1.06.35,1.48.74,2.76.89.37.04,1.05-.24,1.14.35.11.73-1.05.61-1.48.69,1.67,1.02,1.76,3.19,2.96,4.54.56.62.99.68,1.67,1.09-.2.42-.79.51-1.23.54-.56.04-1.13,0-1.63-.29.27.74.79,2.12.57,2.89-.28.95-.68-.78-.97-.82.21.73-.11,1.76-.55,2.37-.35.48-.5.63-.85,1.22-.13.22-.36.34-.47.62-.27.68-.06,1.14.56,1.49,2.03,1.15,5.74,1.09,6.94,3.53.17.35.2.7.34,1.04.38.89,1.56,1.22,2.2,2.04.44.57.42,1.03.71,1.54.08.14.35.32.48.63.11.25.48,1.2.14,1.31-1.86.58-1.9-1.44-3.14-2.16l.99,1.87c.06.13.08.26-.05.35-.06.04-1.34-.05-1.51-.08-.77-.13-2.46-.7-3.03-1.22-.47-.43-.6-1.08-.68-1.68-.07-.45.22-1.02-.4-1.02-.05.23-.16.55-.43.57-.46-.04-.87-.79-1.13-.86-.31-.08-.49.32-1.02.14-.46-.16-.58-1.15-.86-1.34-.37-.24-2.13-.65-2.66-.77s-1.2-.06-1.8-.27c-.47-.16-.85-.45-1.23-.74-.07.43.44.78.83.8v.37c-1.26.6-2.3-.76-2.83-1.73-.89-1.62-.09-2.68.16-4.25.02-.1.11-.34-.07-.32-.1.43-.29.84-.51,1.21-.13.23-.93,1.48-1.26,1.15-.03-.33.04-.72,0-1.04-.02-.14-.06-.3-.2-.15,0,.15-.04.3-.11.43-.33.6-1.14,1.77-1.61,2.24-.06.06-.41.33-.45.29-.17-.4.29-.77.15-1.18-.2.34-.73.9-.86,1.21-.17.39.21,1.23.29,1.73.24,1.43.32,3.17,0,4.58-.03.12-.49,1.88-.76,1.56-.02-.36-.09-.88-.22-1.21-.05-.13-.14-.24-.23-.07-.1.18.02.38-.02.58-.2,1.11-.81,2.45-1.47,3.37-.09.13-.64.86-.83.7l-.15-1.28c-.25.62-.46,1.09-.82,1.65-.19.3-1.45,1.92-1.65,2-.19.08-.16-.1-.13-.23.11-.46.44-.95.33-1.45-.19.16-.14.42-.26.63-.49.83-3.01,2.36-3.96,2.66-1.09.34-2.32.28-3.39-.02-.23-.72.82-.67.94-1.29-.94.4-2.12.86-3.11.4-.18-.27.24-.75-.09-.7-2.52.38-3.88,1.76-5.01,3.98-.55,1.08-.46,2.09,0,3.2.64,1.54,2.2,1.39,3.13,2.5.45.54.89,1.29,1.29,1.87.26.39.78.67.62,1.28-1.84.71-2.45-1.59-4.13-1.86l2.07,1.92c-.28.39-.96.51-1.42.55-1.96.17-4.6-.5-4.98-2.73-.08-.45.07-.97-.06-1.32-.09-.25-.19.16-.42.18-.49.05-.88-1.16-1.02-1.56-.37-.35-.09.89-.09.94,0,.7-.99.26-1.27-.22-.48-.82-.44-2.55.05-3.37,1.19-1.98,2.67-3.67,3.7-5.88.62-1.33.66-2.52,1.71-3.62,1.16-1.22,2.03-.81,3.55-.99,2.16-.25,5.25-1.4,4.49-4.14-.7.72-1.37,1.57-2.44,1.75-.78.13-1.96-.06-2.71-.3-.52-.17-.96-.49-1.18-.99-.08-.19-.14-.67-.2-.73-.05-.05-.25-.05-.37-.17-.88-.81-1.25-2.2-.24-3.02.24,1.06.58,2,1.86,1.86,1.43-.15,1.78-1.77,1.58-2.96-.31-1.78-1.63-2.8-2.39-4.29-.67-1.32-1.2-3.35-1.1-4.82.09-1.25.94-2.45.4-3.66l-.45.06-.24-.17c-.02-.3.12-.57.13-.87.05-1.75-2.79-4.16-3.89-5.46-3.26-3.86-4.57-6.81-3.74-12,.28-1.74,1.28-2.66,1.77-4.15.12-.35.6-1.92-.05-1.93-.45,0-1.92,1.16-2.43.45-.12-.16-.06-.48-.25-.54-.62.27-2.23-.11-2.3-.85-.07-.7.8-.41,1.18-.68-.42-.3-.98-.07-1.48-.2-.64-.16-1.4-.92-1.14-1.64l.85-.14c.37-.74-.72-1.08-1.14-1.44-1.33-1.11-.95-2.09-.18-3.41-1.26-1.27-.54-4.7.62-5.82.33-.32.84-.47,1.07-.91-.3-1.46-.33-2.44.95-3.38.23-.17.83-.37.95-.53.23-.33-.08-.77.73-.75s1.52.69,1.54,1.48c.19.16,1.29-.9,1.55-1.07.56-.36,1.84-.92,2.48-.74s.74.69,1.1,1.06c.08.08.07.09.2.06.36-.91,1.32-2.07-.15-2.46-.27-.4.37-.65.7-.65.37,0,1.38.57,1.61.91.5.74.23,1.13.02,1.91Z"/>
        <path className="cls-1" d="M69.02,124.05l.28-.05s-.09-.07-.13-.1c-.05.05-.1.1-.15.15Z"/>
        <path className="cls-1" d="M81.78,131.07l.15,2.22s1.3-.33,2.34-1.8l.15-.36-2.09-.78-.61.39.06.32Z"/>
      </g>
    </svg>
  );
}

export default function Sidebar() {
  const { page, setPage, brandIndex, setBrandIndex, brands } = useApp();
  const [brandOpen, setBrandOpen] = useState(false);

  const currentBrand = brands[brandIndex];

  function nav(p: Page) {
    setPage(p);
    setBrandOpen(false);
  }

  function item(p: Page, label: string) {
    const active = page === p;
    return (
      <div
        key={p}
        onClick={() => nav(p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 18px', cursor: 'pointer',
          color: 'var(--sb-text)',
          opacity: active ? 1 : 0.5,
          fontSize: 12,
          fontWeight: active ? 600 : 450,
          letterSpacing: '.01em',
          borderLeft: `2px solid ${active ? 'var(--sb-active-bd)' : 'transparent'}`,
          background: active ? 'var(--sb-active-bg)' : 'transparent',
          transition: 'all .15s', userSelect: 'none',
        }}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'var(--sb-hover)'; } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.opacity = '0.5'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
      >
        <span style={{
          width: 5, height: 5, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
          background: active ? 'var(--sb-active-bd)' : 'transparent',
          border: active ? 'none' : '1px solid var(--sb-muted)',
          transition: 'all .15s',
        }} />
        {label}
      </div>
    );
  }

  function platformItem(p: Page) {
    const active = page === p;
    return (
      <div
        key={p}
        onClick={() => nav(p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 18px', cursor: 'pointer',
          color: 'var(--sb-text)',
          opacity: active ? 1 : 0.5,
          fontSize: 12,
          fontWeight: active ? 600 : 450,
          letterSpacing: '.01em',
          borderLeft: `2px solid ${active ? 'var(--sb-active-bd)' : 'transparent'}`,
          background: active ? 'var(--sb-active-bg)' : 'transparent',
          transition: 'all .15s', userSelect: 'none',
        }}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.background = 'var(--sb-hover)'; } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.opacity = '0.5'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: PLT_COLORS[p], flexShrink: 0, display: 'inline-block', opacity: .8 }} />
        {PAGE_TITLES[p]}
      </div>
    );
  }

  function sectionLabel(label: string) {
    return (
      <div style={{
        fontSize: 8.5, fontWeight: 600, letterSpacing: '1.6px',
        textTransform: 'uppercase', color: 'var(--sb-muted)',
        padding: '18px 18px 5px', opacity: .7,
      }}>
        {label}
      </div>
    );
  }

  function footerItem(p: Page, label: string) {
    const active = page === p;
    return (
      <div
        onClick={() => nav(p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 18px', cursor: 'pointer',
          color: active ? 'var(--sb-text)' : 'var(--sb-muted)',
          fontSize: 12, fontWeight: 450,
          opacity: active ? 1 : 0.7,
          borderLeft: `2px solid ${active ? 'var(--sb-active-bd)' : 'transparent'}`,
          background: active ? 'var(--sb-active-bg)' : 'transparent',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = 'var(--sb-text)'; (e.currentTarget as HTMLElement).style.background = 'var(--sb-hover)'; }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.opacity = '0.7'; (e.currentTarget as HTMLElement).style.color = 'var(--sb-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
      >
        <span style={{
          width: 5, height: 5, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
          background: active ? 'var(--sb-active-bd)' : 'transparent',
          border: active ? 'none' : '1px solid var(--sb-muted)',
          transition: 'all .15s',
        }} />
        {label}
      </div>
    );
  }

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      background: 'var(--sb-bg)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', flexShrink: 0,
      overflowY: 'auto', overflowX: 'hidden',
      borderRight: '1px solid var(--border)',
      zIndex: 20,
    }}>

      {/* Logo — SVG inline, ocupa largura total com padding */}
      <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <AntroLogo />
      </div>

      {/* Brand switcher */}
      <div
        onClick={() => setBrandOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px',
          borderBottom: '1px solid rgba(255,255,255,.05)',
          cursor: 'pointer', position: 'relative',
          background: 'transparent', transition: 'background .15s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--sb-hover)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        {/* Avatar da marca */}
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, flexShrink: 0,
          background: `linear-gradient(135deg,${currentBrand.gradient[0]},${currentBrand.gradient[1]})`,
          color: currentBrand.textColor,
        }}>
          {currentBrand.initial}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 550, color: 'var(--sb-text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: '.01em',
          }}>
            {currentBrand.name}
          </div>
          <div style={{ fontSize: 9, color: 'var(--sb-muted)', fontWeight: 400, marginTop: 2, letterSpacing: '.04em' }}>
            Conta ativa
          </div>
        </div>
        <span style={{ fontSize: 10, color: 'var(--sb-muted)', flexShrink: 0 }}>▾</span>

        {/* Dropdown */}
        {brandOpen && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border2)',
              borderRadius: `0 0 var(--radius) var(--radius)`,
              zIndex: 50, overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {brands.map((b, i) => (
              <div
                key={b.id}
                onClick={() => { setBrandIndex(i); setBrandOpen(false); }}
                style={{
                  padding: '10px 16px', fontSize: 11.5, fontWeight: i === brandIndex ? 600 : 450,
                  color: i === brandIndex ? 'var(--text)' : 'var(--text-muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all .12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = i === brandIndex ? 'var(--text)' : 'var(--text-muted)'; }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                {b.name}
              </div>
            ))}
            <div
              onClick={() => { nav('contas'); setBrandOpen(false); }}
              style={{
                padding: '10px 16px', fontSize: 11, fontWeight: 450,
                color: 'var(--text-muted)', cursor: 'pointer',
                borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
            >
              ⚙ Gerenciar contas
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {item('overview', 'Overview')}
        {item('content',  'Conteúdo')}
        {item('goals',    'Metas')}
        {item('insights', 'Insights')}

        {sectionLabel('Plataformas')}
        {platformItem('instagram')}
        {platformItem('tiktok')}
        {platformItem('youtube')}
        {platformItem('twitter')}
        {platformItem('facebook')}

        {sectionLabel('Dados')}
        {item('importacoes', 'Importações')}

        {sectionLabel('Comercial')}
        {item('entregas', 'Entregas')}
        {item('marcas',   'Marcas')}
      </nav>

      {/* Footer */}
      <div style={{ padding: '4px 0', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        {footerItem('contas',   'Contas')}
        {footerItem('settings', 'Configurações')}
        <div style={{
          padding: '8px 18px 14px',
          fontSize: 8.5, color: 'var(--sb-muted)',
          fontWeight: 400, opacity: 0.35,
          letterSpacing: '.12em',
        }}>
          ANTRO · 2026
        </div>
      </div>
    </aside>
  );
}
