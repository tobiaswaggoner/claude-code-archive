"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match && !String(children).includes("\n");

          if (isInline) {
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <SyntaxHighlighter
              style={oneDark}
              language={match?.[1] || "text"}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          );
        },
        pre({ children }) {
          return <div className="not-prose my-2">{children}</div>;
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc pl-4 mb-2">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-4 mb-2">{children}</ol>;
        },
        li({ children }) {
          return <li className="mb-1">{children}</li>;
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              {children}
            </a>
          );
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-border px-3 py-2 text-left font-medium bg-muted">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border border-border px-3 py-2">{children}</td>
          );
        },
        h1({ children }) {
          return <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>;
        },
        hr() {
          return <hr className="my-4 border-border" />;
        },
      }}
    >
      {children}
    </ReactMarkdown>
    </div>
  );
}
