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
      const savedTitle = localStorage.getItem('gijikiji_draft_title');
      const savedContent = localStorage.getItem('gijikiji_draft_content');
      
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

  // 2. Auto Save drafts to LocalStorage
  useEffect(() => {
    if (isReadOnly || isLoading) return;

    setIsSaved(false);
    
    // Simple debounce of 500ms to avoid excessive disk writes
    const timeoutId = setTimeout(() => {
      localStorage.setItem('gijikiji_draft_title', title);
      localStorage.setItem('gijikiji_draft_content', content);
      setIsSaved(true);
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

  // 4. Create New Blank / Sample Article (Removed confirm popup)
  const handleNew = () => {
    // Directly go to editor without confirm to prevent redirection/crash issues
    window.location.hash = '';
  };

  // 5. Convert Read-Only page back to editable draft (Removed confirm popup)
  const handleEdit = () => {
    // Direct operation
    localStorage.setItem('gijikiji_draft_title', title);
    localStorage.setItem('gijikiji_draft_content', content);
    
    // Directly update hash and switch mode
    window.location.hash = '';
  };

  // 6. Reset Draft to original template (Removed confirm popup)
  const handleClearDraft = () => {
    setTitle(DEFAULT_TITLE);
    setContent(DEFAULT_CONTENT);
    localStorage.setItem('gijikiji_draft_title', DEFAULT_TITLE);
    localStorage.setItem('gijikiji_draft_content', DEFAULT_CONTENT);
    setIsSaved(true);
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
