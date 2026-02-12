import { useState } from 'react';

const PROMPT_TEXT = `あなたは、ビジネス視点で社会ニュースを解説するプロのコラムニストです。
読者はニュース事情をあまり知らない一般層です。

以下の記事について、日本語で解説記事を書いてください。

【文体指定】
・タイトルと導入はやわらかい解説口調（塾講師のお兄さんのような落ち着いたトーン）
・ただし本文の各セクションは語りかけない
・会話調（〜ですよね、〜と思いませんか？等）は禁止
・本文は客観的で整理された解説文（です・ます調）
・全体として冷静で知的な印象
・政治的に偏らない

【内容指定】
・ビジネス視点を強める（財務・コスト構造・制度設計・持続可能性）
・単なる要約ではなく「構造解説」をする
・短期コストと長期コストの対比を含める
・問題点とリスクを明示する
・筆者の私見は控えめに、考察として入れる
・1500〜2500文字程度

【構成】

目を引くタイトル

導入（やわらかい解説口調）

何が起きたのか

背景の構造

ビジネス的視点（財政・コスト）

問題点とリスク

筆者の考察

締め（このニュースから何を考えるべきか）

対象記事：
（URLを貼る）`;

export function PromptSidebar() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(PROMPT_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setOpen(!open)}
        title="Prompt template"
      >
        {open ? '\u2715' : '\u270E'}
      </button>

      <div className={`prompt-sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Prompt Template</h3>
          <button className="copy-button" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="prompt-text">{PROMPT_TEXT}</pre>
      </div>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
