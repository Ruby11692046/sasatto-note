import React, { useRef } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Terminal,
  Link,
  Image,
  Table,
  Minus
} from 'lucide-react';

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
  const insertMarkdown = (
    type:
      | 'bold'
      | 'italic'
      | 'strikethrough'
      | 'h1'
      | 'h2'
      | 'h3'
      | 'list'
      | 'ordered-list'
      | 'task-list'
      | 'quote'
      | 'code'
      | 'inline-code'
      | 'link'
      | 'image'
      | 'table'
      | 'hr'
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Save current scroll position
    const savedScrollTop = textarea.scrollTop;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = '';
    let selectionOffsetStart = 0;
    let selectionOffsetEnd = 0;

    switch (type) {
      case 'bold':
        replacement = ` **${selectedText || '太字'}** `;
        selectionOffsetStart = start + 4;
        selectionOffsetEnd = selectedText ? start + replacement.length - 4 : start + replacement.length - 4;
        break;
      case 'italic':
        replacement = ` *${selectedText || '斜体'}* `;
        selectionOffsetStart = start + 3;
        selectionOffsetEnd = selectedText ? start + replacement.length - 3 : start + replacement.length - 3;
        break;
      case 'strikethrough':
        replacement = ` ~~${selectedText || '取り消し線'}~~ `;
        selectionOffsetStart = start + 4;
        selectionOffsetEnd = selectedText ? start + replacement.length - 4 : start + replacement.length - 4;
        break;
      case 'h1':
        replacement = `\n\n# ${selectedText || '見出し1'}\n\n`;
        selectionOffsetStart = start + replacement.length - 2;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'h2':
        replacement = `\n\n## ${selectedText || '見出し2'}\n\n`;
        selectionOffsetStart = start + replacement.length - 2;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'h3':
        replacement = `\n\n### ${selectedText || '見出し3'}\n\n`;
        selectionOffsetStart = start + replacement.length - 2;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'list':
        replacement = `\n\n- ${selectedText || 'リスト項目'}\n\n`;
        selectionOffsetStart = start + replacement.length - 2;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'ordered-list':
        replacement = `\n\n1. ${selectedText || 'リスト項目'}\n\n`;
        selectionOffsetStart = start + replacement.length - 2;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'task-list':
        replacement = `\n\n- [ ] ${selectedText || 'タスク項目'}\n\n`;
        selectionOffsetStart = start + replacement.length - 2;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'quote':
        replacement = `\n\n> ${selectedText || '引用テキスト'}\n\n`;
        selectionOffsetStart = start + replacement.length - 2;
        selectionOffsetEnd = selectionOffsetStart;
        break;
      case 'code':
        replacement = `\n\n\`\`\`\n${selectedText || 'コード'}\n\`\`\`\n\n`;
        selectionOffsetStart = start + 6;
        selectionOffsetEnd = selectedText ? start + replacement.length - 6 : start + replacement.length - 6;
        break;
      case 'inline-code':
        replacement = ` \`${selectedText || 'コード'}\` `;
        selectionOffsetStart = start + 2;
        selectionOffsetEnd = selectedText ? start + replacement.length - 2 : start + replacement.length - 2;
        break;
      case 'link':
        replacement = ` [${selectedText || 'リンクテキスト'}](https://) `;
        selectionOffsetStart = start + (selectedText ? replacement.length - 10 : 2); // Select inside parenthesis or text
        selectionOffsetEnd = selectionOffsetStart + (selectedText ? 8 : 6);
        break;
      case 'image':
        replacement = ` ![${selectedText || '代替テキスト'}](https://) `;
        selectionOffsetStart = start + (selectedText ? replacement.length - 10 : 3);
        selectionOffsetEnd = selectionOffsetStart + (selectedText ? 8 : 6);
        break;
      case 'table':
        replacement = `\n\n| ${selectedText || 'ヘッダー1'} | ヘッダー2 |\n| --- | --- |\n| セル1 | セル2 |\n\n`;
        selectionOffsetStart = start + 4;
        selectionOffsetEnd = selectedText ? start + 4 + selectedText.length : start + 4 + 'ヘッダー1'.length;
        break;
      case 'hr':
        replacement = `\n\n---\n\n`;
        selectionOffsetStart = start + replacement.length;
        selectionOffsetEnd = selectionOffsetStart;
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
        // Restore scroll position
        textarea.scrollTop = savedScrollTop;
      }
    }, 0);
  };





  return (
    <div className="editor-container">
      <input
        type="text"
        className="editor-title-input"
        placeholder="タイトルを入力..."
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      
      {/* Formatting toolbar */}
      <div className="editor-toolbar">
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('bold'); }} title="太字 (Ctrl+B)">
          <Bold size={16} />
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('italic'); }} title="斜体 (Ctrl+I)">
          <Italic size={16} />
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('strikethrough'); }} title="取り消し線">
          <Strikethrough size={16} />
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('inline-code'); }} title="インラインコード">
          <Code size={16} />
        </button>
        
        <div className="toolbar-separator" />
        
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('h1'); }} title="見出し 1" style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          H1
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('h2'); }} title="見出し 2" style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          H2
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('h3'); }} title="見出し 3" style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          H3
        </button>

        <div className="toolbar-separator" />

        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('list'); }} title="箇条書きリスト">
          <List size={16} />
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('ordered-list'); }} title="番号付きリスト">
          <ListOrdered size={16} />
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('task-list'); }} title="タスクリスト">
          <ListTodo size={16} />
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('quote'); }} title="引用">
          <Quote size={16} />
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('code'); }} title="コードブロック">
          <Terminal size={16} />
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('hr'); }} title="水平線">
          <Minus size={16} />
        </button>

        <div className="toolbar-separator" />

        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('link'); }} title="リンク">
          <Link size={16} />
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('image'); }} title="画像">
          <Image size={16} />
        </button>
        <button type="button" className="toolbar-btn" onClick={(e) => { e.preventDefault(); insertMarkdown('table'); }} title="テーブル">
          <Table size={16} />
        </button>
      </div>

      <div className="editor-textarea-wrapper">
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          placeholder="記事の内容をMarkdown形式で記述してください。上部のツールバーで装飾が可能です..."
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
        />
      </div>
      

    </div>
  );
};
