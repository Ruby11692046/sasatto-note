import React, { useRef } from 'react';
import { Bold, Italic, List, Quote, Code, Link } from 'lucide-react';

interface EditorProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
}

export const Editor: React.FC<EditorProps> = ({
  title,
  content,
  onTitleChange,
  onContentChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to insert markdown formatting at selection
  const insertMarkdown = (type: 'bold' | 'italic' | 'h1' | 'h2' | 'h3' | 'list' | 'quote' | 'code' | 'link') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = '';
    let selectionOffsetStart = 0;
    let selectionOffsetEnd = 0;

    switch (type) {
      case 'bold':
        replacement = `**${selectedText || '太字'}**`;
        selectionOffsetStart = start + 2;
        selectionOffsetEnd = selectedText ? start + replacement.length - 2 : start + replacement.length - 2;
        break;
      case 'italic':
        replacement = `*${selectedText || '斜体'}*`;
        selectionOffsetStart = start + 1;
        selectionOffsetEnd = selectedText ? start + replacement.length - 1 : start + replacement.length - 1;
        break;
      case 'h1':
        replacement = `\n# ${selectedText || '見出し1'}\n`;
        selectionOffsetStart = start + replacement.length - 1;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'h2':
        replacement = `\n## ${selectedText || '見出し2'}\n`;
        selectionOffsetStart = start + replacement.length - 1;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'h3':
        replacement = `\n### ${selectedText || '見出し3'}\n`;
        selectionOffsetStart = start + replacement.length - 1;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'list':
        replacement = `\n- ${selectedText || 'リスト項目'}`;
        selectionOffsetStart = start + replacement.length;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'quote':
        replacement = `\n> ${selectedText || '引用テキスト'}\n`;
        selectionOffsetStart = start + replacement.length - 1;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'code':
        replacement = `\n\`\`\`\n${selectedText || 'コード'}\n\`\`\`\n`;
        selectionOffsetStart = start + 5;
        selectionOffsetEnd = selectedText ? start + replacement.length - 5 : start + replacement.length - 5;
        break;
      case 'link':
        replacement = `[${selectedText || 'リンクテキスト'}](https://)`;
        selectionOffsetStart = start + (selectedText ? replacement.length - 9 : 1); // Select inside parenthesis or text
        selectionOffsetEnd = selectionOffsetStart + (selectedText ? 8 : 6);
        break;
      default:
        return;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    onContentChange(newValue);

    // Focus back on textarea and position cursor / selection
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        if (selectedText) {
          // If there was selection, keep it selected inside tags or select the whole block
          textarea.setSelectionRange(start, start + replacement.length);
        } else {
          // If no selection, put cursor in the middle (e.g. between **)
          textarea.setSelectionRange(selectionOffsetStart, selectionOffsetEnd);
        }
      }
    }, 0);
  };

  // Tab key indent handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      
      const indent = '  '; // 2 spaces
      const newValue = val.substring(0, start) + indent + val.substring(end);
      onContentChange(newValue);

      // Restore cursor position
      setTimeout(() => {
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd = start + indent.length;
        }
      }, 0);
    }
  };

  const getStats = () => {
    const charCount = content.length;
    const charCountNoSpaces = content.replace(/\s/g, '').length;
    const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
    const readTimeMin = Math.max(1, Math.ceil(charCount / 600));

    return {
      charCount,
      charCountNoSpaces,
      wordCount,
      readTimeMin,
    };
  };

  const stats = getStats();

  return (
    <div className="editor-container">
      <input
        type="text"
        className="editor-title-input"
        placeholder="タイトルを入力..."
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      
      {/* WordPress style block toolbar */}
      <div className="editor-toolbar">
        <button className="toolbar-btn" onClick={() => insertMarkdown('bold')} title="太字 (Ctrl+B)">
          <Bold size={16} />
        </button>
        <button className="toolbar-btn" onClick={() => insertMarkdown('italic')} title="斜体 (Ctrl+I)">
          <Italic size={16} />
        </button>
        
        <div className="toolbar-separator" />
        
        <button className="toolbar-btn" onClick={() => insertMarkdown('h1')} title="見出し 1" style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          H1
        </button>
        <button className="toolbar-btn" onClick={() => insertMarkdown('h2')} title="見出し 2" style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          H2
        </button>
        <button className="toolbar-btn" onClick={() => insertMarkdown('h3')} title="見出し 3" style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          H3
        </button>

        <div className="toolbar-separator" />

        <button className="toolbar-btn" onClick={() => insertMarkdown('list')} title="箇条書きリスト">
          <List size={16} />
        </button>
        <button className="toolbar-btn" onClick={() => insertMarkdown('quote')} title="引用">
          <Quote size={16} />
        </button>
        <button className="toolbar-btn" onClick={() => insertMarkdown('code')} title="コードブロック">
          <Code size={16} />
        </button>
        <button className="toolbar-btn" onClick={() => insertMarkdown('link')} title="リンク">
          <Link size={16} />
        </button>
      </div>

      <div className="editor-textarea-wrapper">
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          placeholder="記事の内容をMarkdown形式で記述してください。上部のツールバーで装飾が可能です..."
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      
      <div className="editor-footer">
        <div>
          <span>文字数: <strong>{stats.charCount}</strong> (空白除く: {stats.charCountNoSpaces})</span>
          <span style={{ margin: '0 0.75rem', color: 'var(--border-color)' }}>|</span>
          <span>単語数: <strong>{stats.wordCount}</strong></span>
        </div>
        <div>
          <span>読了目安: <strong>約 {stats.readTimeMin} 分</strong></span>
        </div>
      </div>
    </div>
  );
};
