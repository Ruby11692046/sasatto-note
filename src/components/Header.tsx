import React from 'react';
import { Share2, Plus, Edit, RotateCcw, FileText, Eye } from 'lucide-react';

interface HeaderProps {
  isReadOnly: boolean;
  isSaved: boolean;
  viewMode: 'edit' | 'preview';
  onViewModeChange: (mode: 'edit' | 'preview') => void;
  onExport: () => void;
  onNew: () => void;
  onEdit: () => void;
  onClearDraft: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isReadOnly,
  isSaved,
  viewMode,
  onViewModeChange,
  onExport,
  onNew,
  onEdit,
  onClearDraft,
}) => {
  return (
    <header className="main-header">
      <div className="logo-section">
        <div className="logo-icon">擬</div>
        <span className="logo-text">疑似記事</span>
        <span className="logo-badge">GijiKiji</span>
      </div>

      {/* Editor/Preview mode switcher tabs when in editing mode */}
      {!isReadOnly && (
        <div className="tab-group">
          <button
            className={`tab-btn ${viewMode === 'edit' ? 'active' : ''}`}
            onClick={() => onViewModeChange('edit')}
          >
            <FileText size={14} />
            編集
          </button>
          <button
            className={`tab-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => onViewModeChange('preview')}
          >
            <Eye size={14} />
            プレビュー
          </button>
        </div>
      )}

      <div className="actions-section">
        {!isReadOnly ? (
          <>
            <span className="status-badge">
              <span className={`status-indicator ${isSaved ? 'saved' : ''}`} />
              {isSaved ? '自動保存済み' : '下書き保存中'}
            </span>
            <button 
              className="btn btn-secondary btn-danger" 
              onClick={onClearDraft} 
              title="下書きを完全に消去して初期化します"
              style={{ padding: '0.4rem 0.75rem', display: 'flex', gap: '0.25rem' }}
            >
              <RotateCcw size={14} />
              初期化
            </button>
            <button className="btn btn-primary" onClick={onExport}>
              <Share2 size={16} />
              エクスポート (URL共有)
            </button>
          </>
        ) : (
          <>
            <span className="logo-badge" style={{ background: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              閲覧専用モード
            </span>
            <button className="btn btn-secondary" onClick={onEdit}>
              <Edit size={16} />
              エディタにコピーして編集
            </button>
            <button className="btn btn-primary" onClick={onNew}>
              <Plus size={16} />
              新規作成
            </button>
          </>
        )}
      </div>
    </header>
  );
};
