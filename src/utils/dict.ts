// Length descending order to prevent shorter parts from being replaced first.
// Maximum entries: 266 (11 single-byte tokens + 255 two-byte tokens).
const DICTIONARY: string[] = [
  // 1. Long Markdown structures and compound phrases (3-4 bytes in Unicode mapped to 1-2 bytes)
  "ささっとノート", "Sasatto Note", "ダウンロード", "インポート", "エクスポート",
  "インターネット", "クライアント", "リポジトリ", "マークダウン", "Markdown",
  "警告メッセージ", "ツールチップ", "一時保存", "初期化", "リセット", "共有URL",
  "ダミーテキスト", "疑似記事", "GijiKiji", "プレビュー", "エディタ",
  "コンテンツ", "テンプレート", "キャラクター", "デフォルト",
  
  // 2. High-frequency Japanese multi-word grammars
  "することによって", "することが可能", "しなければならない", "することになります",
  "について", "において", "に対して", "にわたって", "によって", "をはじめ",
  "したがって", "そのため", "しかし", "たとえば", "このように",
  "これらは", "それらは", "これによって", "それによって", "このため",
  "このような", "そうした", "これまでの", "それまでの",
  "することが", "することの", "することで", "することに", "するだけで",
  "という", "といった", "のように", "のなかで", "によって",
  "であるため", "ではない", "でしょうか", "ください",
  "です。", "ます。", "でした。", "ました。", "した。", "きた。",
  "いう。", "ある。", "する。", "いない。", "ない。",
  "という。", "である。", "した。", "いた。", "ある。",
  "が、", "は、", "に、", "を、", "と、", "も、", "で、", "から、",
  "など、", "また、", "そして、", "さらに、",

  // 3. Markdown notations
  "\n- ", "\n* ", "\n1. ", "### ", "## ", "\n> ", " **", "** ", "\n```",

  // 4. Common Japanese verbs/nouns/adverbs
  "保存", "共有", "圧縮", "解凍", "設定", "作成", "編集", "閲覧", "機能", "表示",
  "文字", "文章", "データ", "ファイル", "タイトル", "テスト",
  "である", "でした", "します", "しました", "すること", "ができる", "があり",
  "自分", "相手", "関係", "言葉", "人間", "社会", "国家", "個人", "主義",
  "自由", "目的", "活動", "生涯", "岡田", "木下", "先生", "会員", "学校",
  "実際", "必要", "反対", "自信", "先輩", "講義", "周旋", "天性", "書籍",
  "一部", "有益", "知事", "生徒", "背後", "問題", "愉快", "不都合", "複雑",
  "非常", "態度", "損害", "丁寧", "得意", "空虚", "納得", "理解", "解説",
  "方法", "結果", "最初", "最新", "状態", "遷移", "安全",
  
  // 5. Short particles and common helper words
  "ます", "です", "から", "まで", "での", "への", "との", "こと", "もの", "ため", "わけ", "あり", "なし",
  "から", "こそ", "など", "のみ", "ほど", "また", "でも", "より", "ねば",
  "、", "。", "「", "」", "（", "）", "・", "：", "；", "？", "！"
];

// Compile dictionary to UTF-8 byte arrays for direct byte matching
const DICTIONARY_BYTES: Uint8Array[] = DICTIONARY.map(word => new TextEncoder().encode(word));

// Byte markers that are completely illegal/unused in valid UTF-8 sequences.
// We can use 0xF5 - 0xFF as single-byte tokens, and 0xF4 as a prefix marker for two-byte tokens.
const TWO_BYTE_MARKER = 0xF4;
const SINGLE_BYTE_START = 0xF5; // 0xF5 - 0xFF gives 11 single-byte tokens

/**
 * Encodes text into a custom byte array (Uint8Array) using dictionary tokenization.
 * Replaces matched dictionary phrases directly with 1-2 byte tokens.
 */
export function encodeBinaryDict(text: string): Uint8Array {
  const rawBytes = new TextEncoder().encode(text);
  const result: number[] = [];
  
  let i = 0;
  const rawLength = rawBytes.length;
  
  while (i < rawLength) {
    let matchedIndex = -1;
    let matchedLength = 0;
    
    // Search dictionary (priority to longer matches first because list is sorted)
    for (let d = 0; d < DICTIONARY_BYTES.length; d++) {
      const wordBytes = DICTIONARY_BYTES[d];
      const wordLen = wordBytes.length;
      
      if (i + wordLen <= rawLength) {
        let match = true;
        for (let j = 0; j < wordLen; j++) {
          if (rawBytes[i + j] !== wordBytes[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          matchedIndex = d;
          matchedLength = wordLen;
          break; // Found the longest matching word
        }
      }
    }
    
    if (matchedIndex !== -1) {
      // Found a dictionary word. Encode it to a compact byte token.
      if (matchedIndex < 11) {
        // High frequency first 11 words encoded in exactly 1 byte (0xF5 to 0xFF)
        result.push(SINGLE_BYTE_START + matchedIndex);
      } else {
        // Other words encoded in 2 bytes: [0xF4, index - 11]
        result.push(TWO_BYTE_MARKER);
        result.push(matchedIndex - 11);
      }
      i += matchedLength;
    } else {
      // Output original byte as is
      result.push(rawBytes[i]);
      i++;
    }
  }
  
  return new Uint8Array(result);
}

/**
 * Decodes a custom tokenized byte array back into the original UTF-8 string.
 */
export function decodeBinaryDict(bytes: Uint8Array): string {
  const result: number[] = [];
  const len = bytes.length;
  
  let i = 0;
  while (i < len) {
    const b = bytes[i];
    if (b >= SINGLE_BYTE_START && b <= 0xFF) {
      // 1-byte token: decode back to dictionary word bytes
      const dictIndex = b - SINGLE_BYTE_START;
      const wordBytes = DICTIONARY_BYTES[dictIndex];
      for (let j = 0; j < wordBytes.length; j++) {
        result.push(wordBytes[j]);
      }
      i++;
    } else if (b === TWO_BYTE_MARKER) {
      // 2-byte token: decode using next byte as index
      const dictIndex = bytes[i + 1] + 11;
      const wordBytes = DICTIONARY_BYTES[dictIndex];
      for (let j = 0; j < wordBytes.length; j++) {
        result.push(wordBytes[j]);
      }
      i += 2;
    } else {
      // Normal UTF-8 byte
      result.push(b);
      i++;
    }
  }
  
  return new TextDecoder().decode(new Uint8Array(result));
}
