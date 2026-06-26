// Length descending order to prevent shorter parts from being replaced first
const DICTIONARY: string[] = [
  "ささっとノート", "Sasatto Note", "ダウンロード", "インポート", "エクスポート",
  "インターネット", "クライアント", "リポジトリ", "マークダウン", "Markdown",
  "について", "において", "に対して", "にわたって", "によって", "をはじめ",
  "することによって", "することが", "することの", "することが可能",
  "である", "でした", "します", "しました", "すること", "ができる",
  "という", "といった", "このような", "これらは", "それらは",
  "したがって", "そのため", "しかし", "たとえば", "このように",
  "エディタ", "プレビュー", "WordPress", "ローカル", "リモート", "サーバー", "ブラウザ",
  "コンテンツ", "キャラクター", "デフォルト", "テンプレート",
  "警告メッセージ", "ツールチップ", "吹き出し", "一時保存",
  "初期化", "リセット", "共有URL", "ダミーテキスト", "疑似記事", "GijiKiji",
  "保存", "共有", "圧縮", "解凍", "設定", "作成", "編集", "閲覧", "機能", "表示",
  "文字", "文章", "テキスト", "タイトル", "テスト",
  "\n- ", "\n* ", "\n1. ", "### ", "## ", "\n> ", " **", "** ", "\n```",
  "から", "まで", "での", "への", "との", "こと", "もの", "ため", "わけ",
  "あり", "なし"
];

// UTF-16 Private Use Area Start (0xE000 - 0xF8FF is reserved for private use)
const PUA_START = 0xE000;

/**
 * Replaces dictionary words in a string with shorter single-character tokens.
 */
export function encodeDictionary(text: string): string {
  let encoded = text;
  DICTIONARY.forEach((word, index) => {
    const token = String.fromCharCode(PUA_START + index);
    // Safe literal string replacement using split & join (faster and simpler than regex escaping)
    encoded = encoded.split(word).join(token);
  });
  return encoded;
}

/**
 * Replaces dictionary tokens back to original words.
 */
export function decodeDictionary(text: string): string {
  let decoded = text;
  DICTIONARY.forEach((word, index) => {
    const token = String.fromCharCode(PUA_START + index);
    decoded = decoded.split(token).join(word);
  });
  return decoded;
}
