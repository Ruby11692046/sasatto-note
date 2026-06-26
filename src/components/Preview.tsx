import React, { useMemo } from 'react';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import { Clock, BookOpen, List } from 'lucide-react';

interface PreviewProps {
  title: string;
  content: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

// Instantiate and configure custom Marked renderer to assign IDs to headings
const customMarked = new Marked();

customMarked.use({
  renderer: {
    heading({ text, depth, raw }: { text: string; depth: number; raw: string }) {
      // Create a URL-friendly anchor ID
      const cleanId = encodeURIComponent(
        raw
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '') // remove non-word characters except spaces and hyphens
          .replace(/\s+/g, '-')     // replace spaces with hyphens
      );
      // marked v5+ heading renderer returns HTML string
      return `<h${depth} id="${cleanId}">${text}</h${depth}>`;
    }
  }
});

export const Preview: React.FC<PreviewProps> = ({ title, content }) => {
  // Parse Markdown to HTML securely
  const htmlContent = useMemo(() => {
    if (!content) return '<p style="color: var(--text-muted); font-style: italic;">本文が入力されていません。左側のエディタで執筆してください。</p>';
    const parsed = customMarked.parse(content) as string;
    return DOMPurify.sanitize(parsed);
  }, [content]);

  // Extract Table of Contents (TOC) from markdown headers
  const tocList = useMemo((): TocItem[] => {
    const lines = content.split('\n');
    const items: TocItem[] = [];
    
    // Track headers to avoid duplicate IDs
    const seenIds = new Map<string, number>();

    lines.forEach((line) => {
      // Match #, ##, or ### headings
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawText = match[2].trim();
        
        // Remove simple Markdown formatting like bold/italic from TOC text
        const cleanText = rawText.replace(/[\*_`~]/g, '');

        let cleanId = encodeURIComponent(
          rawText
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
        );

        // Deduplicate IDs
        if (seenIds.has(cleanId)) {
          const count = seenIds.get(cleanId)! + 1;
          seenIds.set(cleanId, count);
          cleanId = `${cleanId}-${count}`;
        } else {
          seenIds.set(cleanId, 0);
        }

        items.push({
          id: cleanId,
          text: cleanText,
          level,
        });
      }
    });

    return items;
  }, [content]);

  const displayTitle = title.trim() || '無題の投稿';

  const stats = useMemo(() => {
    const count = content.length;
    const readTime = Math.max(1, Math.ceil(count / 600));
    return { count, readTime };
  }, [content]);

  // Handle smooth scrolling for TOC links
  const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update browser URL hash without jump reload
      window.history.pushState(null, '', `#${window.location.hash.split('?')[0] || ''}?heading=${id}`);
    }
  };

  return (
    <div className="preview-container">
      <article className="article-layout">
        {/* WordPress Style Post Category */}
        <span className="wp-post-category">擬似記事 / Markdown</span>
        
        {/* Title */}
        <h1 className="wp-post-title">{displayTitle}</h1>
        
        {/* Meta Info */}
        <div className="wp-post-meta">
          <div className="wp-meta-item">
            <Clock size={14} />
            <span>読了目安: {stats.readTime}分</span>
          </div>
          <div className="wp-meta-item">
            <BookOpen size={14} />
            <span>{stats.count}文字</span>
          </div>
        </div>

        {/* Table of Contents (TOC) */}
        {tocList.length > 0 && (
          <div className="toc-container">
            <div className="toc-title">
              <List size={16} />
              <span>目次</span>
            </div>
            <ul className="toc-list">
              {tocList.map((item, index) => (
                <li key={index} className={`toc-item toc-h${item.level}`}>
                  <a
                    href={`#${item.id}`}
                    className="toc-link"
                    onClick={(e) => handleTocClick(e, item.id)}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rendered Markdown Body */}
        <div 
          className="wp-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </article>
    </div>
  );
};
