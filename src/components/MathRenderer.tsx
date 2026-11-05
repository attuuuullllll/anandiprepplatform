'use client';

import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Checks whether an expression between $...$ is truly a mathematical formula,
 * or just English text / currency that was accidentally wrapped in dollar signs.
 */
function isRealMathExpression(expr: string): boolean {
  if (!expr || expr.length === 0) return false;

  // If it has multiple English words or standard sentences, it is NOT math
  if (/\b(is|the|of|and|per|unit|price|brand|discount|brand|sells|electric|cost|margin|remain|fixed|what)\b/i.test(expr)) {
    return false;
  }

  // If it is just a plain currency or number (e.g. "$1,200", "40%", "₹350", "15%"), render as plain text
  if (/^[₹$€£]?\s*[\d,.]+\s*[%]?$/.test(expr)) {
    return false;
  }

  // Must contain mathematical operators, powers, subscripts, fractions, or LaTeX commands
  return /[=+\-*/^_\\]|\\(frac|sqrt|times|approx|le|ge|pm|sum|int|mathbf|text|pmod)/.test(expr);
}

/**
 * Pre-cleans raw question text to remove broken escaped characters (e.g. `\ 1,200`, `$\\$`, `40\%`).
 */
function preCleanText(raw: string): string {
  if (!raw) return '';
  return raw
    // Fix `\ 1,200` or `\$`
    .replace(/\\+\$/g, '₹')
    .replace(/\\\s+([\d,]+)/g, '₹$1')
    .replace(/\$\\\$/g, '₹')
    .replace(/\\%/g, '%')
    .replace(/\$\s*₹/g, '₹')
    .replace(/₹\s*\$/g, '₹');
}

/**
 * Renders inline math, block math, markdown bold/italics, quotes, tables, and paragraphs.
 * Completely immune to KaTeX text-squishing bugs.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const cleanedContent = preCleanText(content);

  // 1. Helper to render text with inline math, bold, and italics
  const renderInlineFormatted = (text: string): React.ReactNode => {
    // Split text by inline math ($...$)
    const mathParts = text.split(/(\$[^$\n]+\$)/g);

    return mathParts.map((mathPart, mIdx) => {
      if (mathPart.startsWith('$') && mathPart.endsWith('$')) {
        const formula = mathPart.slice(1, -1).trim();

        // Check if this is real mathematical notation
        if (isRealMathExpression(formula)) {
          try {
            const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
            return (
              <span
                key={`m-${mIdx}`}
                className="inline-block px-1 align-baseline font-serif"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <code key={`m-${mIdx}`} className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded font-mono text-xs">
                {formula}
              </code>
            );
          }
        } else {
          // It's plain text/currency that had dollar signs - render plainly
          return <span key={`m-${mIdx}`}>{formula}</span>;
        }
      }

      // Format bold (**bold**), italics (*italic*), and inline code (`code`)
      const tokens = mathPart.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
      return (
        <span key={`t-${mIdx}`}>
          {tokens.map((token, tIdx) => {
            if (token.startsWith('**') && token.endsWith('**')) {
              return <strong key={tIdx} className="font-bold text-slate-900">{token.slice(2, -2)}</strong>;
            }
            if (token.startsWith('*') && token.endsWith('*')) {
              return <em key={tIdx} className="italic text-slate-800">{token.slice(1, -1)}</em>;
            }
            if (token.startsWith('`') && token.endsWith('`')) {
              return (
                <code key={tIdx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs border border-slate-200">
                  {token.slice(1, -1)}
                </code>
              );
            }
            return token;
          })}
        </span>
      );
    });
  };

  // 2. Split content into blocks (detect block math, markdown tables, blockquotes, and normal paragraphs)
  const blockParts = cleanedContent.split(/(\$\$[\s\S]*?\$\$)/g);

  return (
    <div className={`space-y-3 ${className}`}>
      {blockParts.map((blockPart, bIdx) => {
        // Block math
        if (blockPart.startsWith('$$') && blockPart.endsWith('$$')) {
          const formula = blockPart.slice(2, -2).trim();
          if (isRealMathExpression(formula)) {
            try {
              const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
              return (
                <div
                  key={`block-${bIdx}`}
                  className="my-3 overflow-x-auto py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } catch {
              return (
                <pre key={`block-${bIdx}`} className="bg-slate-100 p-3 rounded-lg font-mono text-xs overflow-x-auto">
                  {formula}
                </pre>
              );
            }
          } else {
            return (
              <p key={`block-${bIdx}`} className="leading-[1.8] text-inherit">
                {renderInlineFormatted(formula)}
              </p>
            );
          }
        }

        // Split standard text into paragraphs separated by \n\n
        const paragraphs = blockPart.split(/\n\s*\n/);

        return paragraphs.map((para, pIdx) => {
          const trimmed = para.trim();
          if (!trimmed) return null;

          // Check if paragraph is a markdown table
          const lines = trimmed.split('\n');
          const isTable = lines.length >= 2 && lines.every(l => l.trim().startsWith('|') && l.trim().endsWith('|'));

          if (isTable) {
            const tableRows = lines
              .filter(l => !l.includes('---'))
              .map(l => l.split('|').slice(1, -1).map(c => c.trim()));

            if (tableRows.length > 0) {
              const headers = tableRows[0];
              const bodyRows = tableRows.slice(1);

              return (
                <div key={`p-${bIdx}-${pIdx}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-900 font-bold font-mono">
                      <tr>
                        {headers.map((h, hIdx) => (
                          <th key={hIdx} className="px-3.5 py-2.5">
                            {renderInlineFormatted(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {bodyRows.map((r, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          {r.map((c, cIdx) => (
                            <td key={cIdx} className="px-3.5 py-2 font-mono text-slate-700">
                              {renderInlineFormatted(c)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
          }

          // Check if paragraph is a blockquote (starts with > or *" )
          const isQuote = trimmed.startsWith('>') || (trimmed.startsWith('*\"') && trimmed.endsWith('\"*'));
          if (isQuote) {
            const quoteContent = trimmed.startsWith('>') 
              ? trimmed.replace(/^>\s*/, '')
              : trimmed.replace(/^\*\"/, '"').replace(/\"\*$/, '"');

            return (
              <blockquote
                key={`p-${bIdx}-${pIdx}`}
                className="my-3 border-l-4 border-emerald-500 bg-emerald-50/40 px-4 py-2.5 rounded-r-xl italic text-slate-800 text-[15px] sm:text-[16px] leading-relaxed shadow-2xs"
              >
                {renderInlineFormatted(quoteContent)}
              </blockquote>
            );
          }

          // Standard paragraph with line-breaks
          return (
            <p key={`p-${bIdx}-${pIdx}`} className="leading-[1.8] text-inherit">
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {renderInlineFormatted(line)}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          );
        });
      })}
    </div>
  );
};
