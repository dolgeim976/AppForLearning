import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
    return (
        <div className={`markdown-body ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="text-2xl font-extrabold text-white mb-4 mt-8 pb-2 border-b border-gray-700">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xl font-bold text-blue-300 mb-3 mt-7">{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-lg font-bold text-blue-200 mb-2 mt-5">{children}</h3>
                    ),
                    p: ({ children }) => (
                        <p className="text-gray-300 leading-relaxed mb-4">{children}</p>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1.5 mb-4 text-gray-300 ml-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-300 ml-2">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-bold text-white">{children}</strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic text-gray-200">{children}</em>
                    ),
                    code: ({ className: codeClassName, children, ...props }) => {
                        const isInline = !codeClassName;
                        if (isInline) {
                            return (
                                <code className="bg-gray-800 text-emerald-400 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-700 break-words" {...props}>
                                    {children}
                                </code>
                            );
                        }
                        // Block code is handled directly by rehype-highlight
                        return (
                            <code className={`${codeClassName} text-sm font-mono leading-relaxed`} style={{ display: 'block', backgroundColor: 'transparent', padding: 0 }} {...props}>
                                {children}
                            </code>
                        );
                    },
                    pre: ({ children }) => (
                        <div className="my-6 rounded-xl overflow-hidden border border-gray-700 shadow-lg relative group">
                            {/* Mac-like header */}
                            <div className="bg-gray-800/80 px-4 py-3 flex items-center justify-between border-b border-gray-700/50 backdrop-blur-sm">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>
                                </div>
                            </div>
                            {/* Pre block */}
                            <pre className="p-5 overflow-x-auto bg-[#1e2227] m-0" style={{ margin: 0 }}>
                                {children}
                            </pre>
                        </div>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-4 my-4 bg-blue-900/10 py-3 pr-3 rounded-r-lg text-gray-300 italic">
                            {children}
                        </blockquote>
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4 rounded-xl border border-gray-700">
                            <table className="w-full text-sm">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-gray-800 text-gray-200">{children}</thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-4 py-3 text-left font-bold border-b border-gray-700">{children}</th>
                    ),
                    td: ({ children }) => (
                        <td className="px-4 py-3 border-b border-gray-800 text-gray-300">{children}</td>
                    ),
                    hr: () => <hr className="border-gray-700 my-6" />,
                    a: ({ children, href }) => (
                        <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div >
    );
};
