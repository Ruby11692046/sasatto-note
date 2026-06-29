import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { compressText, decompressText } from './utils/brotli';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';

const DEFAULT_TITLE = '';
const DEFAULT_CONTENT = '';

export default function App() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [isSaved, setIsSaved] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedUrl, setExportedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isUrlOverLimit, setIsUrlOverLimit] = useState(false);

  // 1. Initial Load & Hash routing
  useEffect(() => {
    const handleHashAndLoad = async () => {
      setIsLoading(true);
      const hash = window.location.hash;
      
      // Look for #q=... or #?q=... in fragment
      const qMatch = hash.match(/[#&?]q=([^&]+)/);

      if (qMatch && qMatch[1]) {
        try {
          const compressedData = qMatch[1];
          const decompressedJson = await decompressText(compressedData);
          const parsed = JSON.parse(decompressedJson);

          if (parsed && (parsed.t !== undefined || parsed.c !== undefined)) {
            setTitle(parsed.t || '');
            setContent(parsed.c || '');
            setIsReadOnly(true);
            setViewMode('preview'); // Read-only mode is always preview
          } else {
            throw new Error('Invalid data format');
          }
        } catch (e) {
          console.error('Failed to decompress data from URL:', e);
          alert('URLから記事データを読み込めませんでした。データが破損している可能性があります。');
          loadDraft();
        }
      } else {
        loadDraft();
      }
      setIsLoading(false);
    };

    const loadDraft = () => {
      const savedTitle = localStorage.getItem('sasattonote_draft_title');
      const savedContent = localStorage.getItem('sasattonote_draft_content');
      
      setTitle(savedTitle !== null ? savedTitle : DEFAULT_TITLE);
      setContent(savedContent !== null ? savedContent : DEFAULT_CONTENT);
      setIsReadOnly(false);
      setViewMode('edit'); // Editor mode defaults to edit tab
    };

    handleHashAndLoad();

    // Listen to hash changes (e.g. Back button or external navigation)
    const handleHashChange = () => {
      handleHashAndLoad();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 2. Auto Save drafts to LocalStorage & Check URL length
  useEffect(() => {
    if (isReadOnly || isLoading) return;

    setIsSaved(false);
    
    // Debounce to avoid excessive writes and Brotli calculations on every keystroke
    const timeoutId = setTimeout(async () => {
      localStorage.setItem('sasattonote_draft_title', title);
      localStorage.setItem('sasattonote_draft_content', content);
      setIsSaved(true);

      // Check compressed URL length
      try {
        const payload = {
          t: title,
          c: content,
        };
        const jsonStr = JSON.stringify(payload);
        const compressed = await compressText(jsonStr);
        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${baseUrl}#q=${compressed}`;
        
        setIsUrlOverLimit(shareUrl.length > 4000);
      } catch (e) {
        console.error('Failed to pre-calculate compressed length:', e);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [title, content, isReadOnly, isLoading]);

  // 3. Export Action
  const handleExport = async () => {
    try {
      const payload = {
        t: title,
        c: content,
      };
      const jsonStr = JSON.stringify(payload);
      const compressed = await compressText(jsonStr);
      
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}#q=${compressed}`;
      
      setExportedUrl(shareUrl);
      setShowExportModal(true);

      // Copy to clipboard automatically
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);

      // Fire celebratory confetti!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.error('Failed to export:', e);
      alert('エクスポート中にエラーが発生しました。');
    }
  };

  // 4. Create New Blank / Sample Article
  const handleNew = () => {
    window.location.hash = '';
  };

  // 5. Convert Read-Only page back to editable draft
  const handleEdit = () => {
    localStorage.setItem('sasattonote_draft_title', title);
    localStorage.setItem('sasattonote_draft_content', content);
    window.location.hash = '';
  };

  // 6. Reset Draft to original template
  const handleClearDraft = () => {
    setTitle(DEFAULT_TITLE);
    setContent(DEFAULT_CONTENT);
    localStorage.setItem('sasattonote_draft_title', DEFAULT_TITLE);
    localStorage.setItem('sasattonote_draft_content', DEFAULT_CONTENT);
    setIsSaved(true);
    setIsUrlOverLimit(false);
  };

  // Copy helper for modal
  const handleManualCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // 7. Update document title in read-only mode
  useEffect(() => {
    if (isReadOnly) {
      document.title = title.trim() ? `${title} - ささっとノート` : 'ささっとノート';
    } else {
      document.title = 'ささっとノート';
    }
  }, [isReadOnly, isReadOnly ? title : null]);

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading-overlay">
          <div className="spinner" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header section */}
      <Header
        isReadOnly={isReadOnly}
        isSaved={isSaved}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExport={handleExport}
        onNew={handleNew}
        onEdit={handleEdit}
        onClearDraft={handleClearDraft}
        isUrlOverLimit={isUrlOverLimit}
      />

      {/* Main Workspace */}
      <main className={`workspace ${isReadOnly ? 'readonly' : ''}`}>
        {isReadOnly ? (
          /* Reader Centered View */
          <div className="pane" style={{ overflowY: 'auto' }}>
            <Preview title={title} content={content} />
          </div>
        ) : (
          /* Editor / Preview Switcher mode */
          <div className="pane">
            {viewMode === 'edit' ? (
              <Editor
                title={title}
                content={content}
                onTitleChange={setTitle}
                onContentChange={setContent}
              />
            ) : (
              <Preview title={title} content={content} />
            )}
          </div>
        )}
      </main>

      {/* Export Success Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">共有用URLを生成しました！</h3>
              <button className="modal-close" onClick={() => setShowExportModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Brotliで圧縮された記事データがURLに含まれています。このURLを共有すると、受け取った人は閲覧専用モードで記事を読むことができます。
            </p>

            <div className="url-input-container">
              <input
                type="text"
                readOnly
                className="url-input"
                value={exportedUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleManualCopy}
                style={{ padding: '0 1rem', whiteSpace: 'nowrap' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'コピー済' : 'コピー'}
              </button>
            </div>

            {/* In-modal warning if URL exceeds 4000 chars */}
            {isUrlOverLimit && (
              <div 
                style={{ 
                  color: '#eab308', 
                  fontSize: '0.8rem', 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.35rem',
                  marginBottom: '1rem',
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  border: '1px solid rgba(234, 179, 8, 0.2)',
                  wordBreak: 'break-all'
                }}
              >
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span><strong>注意：</strong>エンコードしたURLが4000文字を超えています。一部のチャットツールやSNSでは共有できない場合があります。</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <a 
                href={exportedUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                <ExternalLink size={14} />
                開いてテストする
              </a>
              <button className="btn btn-primary" onClick={() => setShowExportModal(false)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
