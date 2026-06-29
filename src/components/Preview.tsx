import React, { useMemo, useEffect } from 'react';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import { Clock, BookOpen, List } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Automatically turn raw URLs in their own lines into images, YouTube embeds, or Bluesky placeholders
const autoPreviewUrls = (text: string): string => {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      const urlRegex = /^(https?:\/\/[^\s]+)$/i;
      const match = trimmed.match(urlRegex);
      
      if (match) {
        const url = match[1];
        
        // 1. Image preview
        let isImage = false;
        try {
          const parsed = new URL(url);
          // Check pathname for image extension
          if (parsed.pathname.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i)) {
            isImage = true;
          }
          // Special case: Unsplash images
          else if (parsed.hostname.includes('unsplash.com')) {
            isImage = true;
          }
          // Special case: Query parameters indicating image format (e.g., fm=webp, format=png)
          else {
            const format = parsed.searchParams.get('format') || parsed.searchParams.get('fm') || parsed.searchParams.get('ext');
            if (format && format.match(/^(jpeg|jpg|gif|png|webp|svg|bmp)$/i)) {
              isImage = true;
            }
          }
        } catch (e) {
          // If URL parsing fails, fallback to simple regex
          if (url.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i)) {
            isImage = true;
          }
        }

        if (isImage) {
          return `[${url}](${url})\n\n![自動画像プレビュー](${url})`;
        }
        
        // 2. YouTube preview
        const ytMatch = url.match(
          /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
        );
        if (ytMatch) {
          const videoId = ytMatch[1];
          return `[${url}](${url})\n\n<div class="youtube-preview-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 1rem 0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"><iframe src="https://www.youtube.com/embed/${videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        }

        // 3. Bluesky post preview placeholder
        const bskyMatch = url.match(/^https?:\/\/bsky\.app\/profile\/([^\/]+)\/post\/([^\/]+)$/i);
        if (bskyMatch) {
          const handle = bskyMatch[1];
          const rkey = bskyMatch[2];
          return `[${url}](${url})\n\n<div class="bluesky-preview-container" data-handle="${handle}" data-rkey="${rkey}"></div>`;
        }

        // 4. General link preview placeholder
        if (url.startsWith('http://') || url.startsWith('https://')) {
          try {
            const domain = new URL(url).hostname;
            return `[${url}](${url})\n\n<div class="link-preview-container" data-url="${url}" data-domain="${domain}"></div>`;
          } catch {
            // If URL parsing fails, fall through
          }
        }
      }
      return line;
    })
    .join('\n');
};

// Preprocess markdown text for Discord subtext and URL previews (math is handled separately during render)
const preprocessMarkdownWithoutMath = (text: string): string => {
  let processed = text;

  // 1. Process Discord subtext: -# Text
  processed = processed
    .split('\n')
    .map((line) => {
      const match = line.match(/^-\#\s+(.+)$/);
      if (match) {
        const content = match[1];
        return `<small class="discord-subtext" style="font-size: 0.85em; color: var(--text-secondary); opacity: 0.8; display: inline-block; margin: 0.2rem 0;">${content}</small>`;
      }
      return line;
    })
    .join('\n');

  // 2. Process URL auto-previews
  processed = autoPreviewUrls(processed);

  return processed;
};

interface PreviewProps {
  title: string;
  content: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

// Helper to generate consistent, URL-friendly IDs for headings (supports Japanese and other multibytes)
const generateHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    // Remove punctuation and special symbols, keeping alphanumeric and CJK/multibyte characters
    .replace(/[!"#$%&'()*+,./:;<=>?@\[\\\]^`{|}~]/g, '')
    // Replace whitespace (including full-width ideographic space) with hyphens
    .replace(/[\s\u3000]+/g, '-');
};

// Instantiate and configure custom Marked renderer to assign IDs to headings
const customMarked = new Marked();

customMarked.use({
  breaks: true,
  renderer: {
    heading({ text, depth, raw }: { text: string; depth: number; raw: string }) {
      const cleanId = generateHeadingId(raw);
      // marked v5+ heading renderer returns HTML string
      return `<h${depth} id="${cleanId}">${text}</h${depth}>`;
    },
    link({ href, title, text }: { href: string; title?: string | null; text: string }) {
      const isInternal = href.startsWith('#');
      const targetAttr = isInternal ? '' : ' target="_blank" rel="noopener noreferrer"';
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}"${targetAttr}${titleAttr}>${text}</a>`;
    }
  }
});

export const Preview: React.FC<PreviewProps> = ({ title, content }) => {
  // Parse Markdown to HTML securely
  const htmlContent = useMemo(() => {
    if (!content) return '<p style="color: var(--text-muted); font-style: italic;">本文が入力されていません。左側のエディタで執筆してください。</p>';
    
    // Array to store math HTML components temporarily
    const mathBlocks: string[] = [];
    let tempContent = content;

    // 1. Temporary replace LaTeX math with placeholders before marked & DOMPurify
    // Block math: $$ ... $$
    tempContent = tempContent.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, expr) => {
      try {
        const rendered = `<div class="math-block" style="overflow-x: auto; padding: 0.8rem 0; text-align: center;">${katex.renderToString(expr, { displayMode: true, throwOnError: false })}</div>`;
        const placeholder = `<div class="math-placeholder-block" data-index="${mathBlocks.length}"></div>`;
        mathBlocks.push(rendered);
        return placeholder;
      } catch (err) {
        console.error('KaTeX block error:', err);
        return match;
      }
    });

    // Inline math: $ ... $
    tempContent = tempContent.replace(/\$([^\s\$\n](?:[^\$\n]*?[^\s\$\n])?)\$/g, (match, expr) => {
      try {
        const rendered = `<span class="math-inline" style="padding: 0 0.15rem;">${katex.renderToString(expr, { displayMode: false, throwOnError: false })}</span>`;
        const placeholder = `<span class="math-placeholder-inline" data-index="${mathBlocks.length}"></span>`;
        mathBlocks.push(rendered);
        return placeholder;
      } catch (err) {
        console.error('KaTeX inline error:', err);
        return match;
      }
    });

    // 2. Preprocess Discord subtext and URL previews
    const processedContent = preprocessMarkdownWithoutMath(tempContent);
    const parsed = customMarked.parse(processedContent) as string;

    // 3. Sanitize with DOMPurify
    let sanitized = DOMPurify.sanitize(parsed, {
      ADD_TAGS: ['iframe', 'small'],
      ADD_ATTR: [
        'allowfullscreen', 'frameborder', 'allow', 'target', 'rel', 
        'data-handle', 'data-rkey', 'data-url', 'data-domain', 
        'data-index', 'style', 'class'
      ]
    });

    // 4. Restore math HTML from placeholders
    sanitized = sanitized.replace(/<(div|span) class="math-placeholder-(block|inline)" data-index="(\d+)"><\/\1>/g, (match, _tag, _type, indexStr) => {
      const index = parseInt(indexStr, 10);
      return mathBlocks[index] !== undefined ? mathBlocks[index] : match;
    });

    return sanitized;
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

        let cleanId = generateHeadingId(rawText);

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

  // Render Bluesky and general link OGP previews dynamically after HTML content is loaded
  useEffect(() => {
    // 1. HTML escape helper
    const escapeHtml = (unsafe: string): string => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // 2. Process Bluesky embeds
    const bskyContainers = document.querySelectorAll('.bluesky-preview-container');
    bskyContainers.forEach(async (container) => {
      if (container.classList.contains('loaded')) return;
      
      const handle = container.getAttribute('data-handle');
      const rkey = container.getAttribute('data-rkey');
      if (!handle || !rkey) return;
      
      container.classList.add('loaded');
      
      const originalLink = container.querySelector('a')?.href || `https://bsky.app/profile/${handle}/post/${rkey}`;
      
      try {
        container.innerHTML = `
          <div class="bsky-loading" style="padding: 1rem; color: var(--text-secondary); font-style: italic; border: 1px solid var(--border-color); border-radius: 12px; font-size: 0.85rem; max-width: 550px; margin: 16px 0;">
            Blueskyの投稿を読み込み中...
          </div>
        `;
        
        const uri = `at://${handle}/app.bsky.feed.post/${rkey}`;
        const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}`);
        if (!response.ok) throw new Error('Failed to fetch post');
        
        const data = await response.json();
        const post = data.thread?.post;
        if (!post) throw new Error('Post not found');
        
        const author = post.author || {};
        const record = post.record || {};
        const embed = post.embed || {};
        
        const avatar = author.avatar || '';
        const displayName = author.displayName || author.handle || 'Blueskyユーザー';
        const bskyHandle = author.handle;
        const text = record.text || '';
        const createdAt = new Date(record.createdAt).toLocaleString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        let imagesHtml = '';
        if (embed.images && embed.images.length > 0) {
          imagesHtml = `<div class="bsky-embed-images" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-top: 12px;">`;
          embed.images.forEach((img: any) => {
            imagesHtml += `<img src="${img.thumb}" alt="${img.alt || ''}" style="width: 100%; border-radius: 8px; cursor: pointer; border: 1px solid var(--border-color); object-fit: cover; max-height: 200px;" onclick="window.open('${img.fullsize}', '_blank')" />`;
          });
          imagesHtml += `</div>`;
        }
        
        container.innerHTML = `
          <div class="bsky-card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; background-color: var(--bg-secondary, rgba(255,255,255,0.02)); max-width: 550px; margin: 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.04); transition: transform 0.2s ease;">
            <div class="bsky-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
               <a href="https://bsky.app/profile/${bskyHandle}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; text-decoration: none; color: inherit; gap: 10px;">
                 ${avatar ? `<img src="${avatar}" alt="" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />` : `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #0285ff; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem;">${displayName[0]}</div>`}
                 <div style="display: flex; flex-direction: column; line-height: 1.3;">
                   <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);">${displayName}</span>
                   <span style="font-size: 0.78rem; color: var(--text-secondary);">@${bskyHandle}</span>
                 </div>
               </a>
               <svg viewBox="0 0 24 24" width="18" height="18" fill="#0285ff" style="flex-shrink: 0;"><path d="M12 10.8c-1.34-1.25-3.32-3.08-5.32-4.9-1.12-1.02-2.3-2.07-3.07-2.74C3.06 2.7 2.18 2 1.62 2 .8 2 0 2.5 0 3.33c0 .8.9 2.56 1.83 4.25 1.58 2.87 3.9 6.2 5.56 7.6 1.27.87 2.45.62 3.12-.34.1-.14.23-.38.27-.47.05-.1.1-.3.08-.13.06.33.22.76.38.97.68.96 1.85 1.2 3.12.33 1.66-1.4 3.98-4.72 5.56-7.6C23.1 5.9 24 4.14 24 3.33c0-.83-.8-1.33-1.62-1.33-.56 0-1.44.7-1.99 1.16-.77.67-1.95 1.72-3.07 2.74-2 1.82-3.98 3.65-5.32 4.9z"/></svg>
            </div>
            <div class="bsky-body" style="font-size: 0.92rem; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; margin-bottom: 8px;">${escapeHtml(text)}</div>
            ${imagesHtml}
            <div class="bsky-footer" style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary);">
              <a href="${originalLink}" target="_blank" rel="noopener noreferrer" style="color: var(--text-secondary); text-decoration: none; hover: underline;">
                <span>${createdAt}</span>
              </a>
              <div style="display: flex; gap: 12px; font-weight: 500;">
                <span>❤️ ${post.likeCount || 0}</span>
                <span>🔄 ${post.repostCount || 0}</span>
              </div>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Failed to fetch Bluesky post:', err);
        container.innerHTML = `
          <div class="bsky-error" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; font-size: 0.8rem; max-width: 550px; background: rgba(220, 38, 38, 0.03); border-left: 4px solid #dc2626; margin: 16px 0;">
            <p style="margin: 0 0 6px 0; color: var(--text-secondary); font-weight: 500;">Blueskyの投稿を読み込めませんでした。</p>
            <a href="${originalLink}" target="_blank" rel="noopener noreferrer" style="color: #0285ff; text-decoration: none; font-weight: 500;">Blueskyで直接表示する</a>
          </div>
        `;
      }
    });

    // 3. Process general link OGP previews
    const linkPreviewContainers = document.querySelectorAll('.link-preview-container');
    
    const parseOgp = (html: string, urlStr: string) => {
      const getMeta = (propertyOrName: string): string => {
        const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${propertyOrName}["'][^>]*content=["']([^"']*)["']`, 'i');
        const match = html.match(regex);
        if (match) return match[1];
        
        const regexAlt = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${propertyOrName}["']`, 'i');
        const matchAlt = html.match(regexAlt);
        return matchAlt ? matchAlt[1] : '';
      };

      const getTitle = (): string => {
        const ogTitle = getMeta('og:title');
        if (ogTitle) return ogTitle;
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        return titleMatch ? titleMatch[1] : '';
      };

      const getDescription = (): string => {
        return getMeta('og:description') || getMeta('description') || '';
      };

      const getImage = (): string => {
        const ogImage = getMeta('og:image');
        if (!ogImage) return '';
        try {
          return new URL(ogImage, urlStr).toString();
        } catch {
          return ogImage;
        }
      };

      const getSiteName = (): string => {
        return getMeta('og:site_name') || '';
      };

      return {
        title: getTitle().replace(/<[^>]*>/g, '').trim(),
        description: getDescription().replace(/<[^>]*>/g, '').trim(),
        image: getImage().trim(),
        siteName: getSiteName().replace(/<[^>]*>/g, '').trim()
      };
    };

    linkPreviewContainers.forEach(async (container) => {
      if (container.classList.contains('loaded')) return;
      
      const url = container.getAttribute('data-url');
      const domain = container.getAttribute('data-domain') || '';
      if (!url) return;
      
      container.classList.add('loaded');
      
      try {
        // Fetch via corsproxy.io (direct HTML response)
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Proxy request failed');
        
        const html = await response.text();
        const ogp = parseOgp(html, url);
        if (!ogp.title) {
          throw new Error('Could not parse OGP title');
        }
        
        const title = ogp.title;
        const description = ogp.description ? (ogp.description.length > 90 ? ogp.description.substring(0, 90) + '...' : ogp.description) : '';
        const image = ogp.image;
        const siteName = ogp.siteName || domain;
        const favicon = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
        
        container.innerHTML = `
          <a href="${url}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: inherit; display: block; max-width: 550px; margin: 16px 0;">
            <div class="link-card" style="border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; display: flex; background-color: var(--bg-secondary, rgba(255,255,255,0.02)); box-shadow: 0 4px 12px rgba(0,0,0,0.03); transition: transform 0.2s ease, border-color 0.2s ease; cursor: pointer;">
              <div class="link-card-content" style="flex: 1; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; min-width: 0;">
                <div style="min-width: 0;">
                  <div class="link-card-title" style="font-weight: 700; font-size: 0.9rem; line-height: 1.4; color: var(--text-primary); margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">${escapeHtml(title)}</div>
                  ${description ? `<div class="link-card-description" style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">${escapeHtml(description)}</div>` : ''}
                </div>
                <div class="link-card-meta" style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  <img src="${favicon}" alt="" style="width: 14px; height: 14px; border-radius: 2px; flex-shrink: 0;" onerror="this.style.display='none'" />
                  <span style="font-weight: 500; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(siteName)}</span>
                </div>
              </div>
              ${image ? `
                <div class="link-card-image-wrapper" style="width: 120px; flex-shrink: 0; background-color: rgba(0,0,0,0.03); border-left: 1px solid var(--border-color); position: relative; overflow: hidden;">
                  <img src="${image}" alt="" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;" onerror="this.parentElement.style.display='none'" />
                </div>
              ` : ''}
            </div>
          </a>
        `;
      } catch (err) {
        console.warn('Failed to load OGP preview, falling back to basic link:', url, err);
        // Fallback is already rendered in the HTML placeholder (just a basic anchor)
      }
    });
  }, [htmlContent]);

  return (
    <div className="preview-container">
      <article className="article-layout">

        
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
