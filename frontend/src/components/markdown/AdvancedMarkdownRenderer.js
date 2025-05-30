import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import './AdvancedMarkdownRenderer.css';

// 自定义代码块组件
const CodeBlock = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  return !inline && language ? (
    <SyntaxHighlighter
      style={vscDarkPlus}
      language={language}
      PreTag="div"
      customStyle={{
        margin: '16px 0',
        borderRadius: '8px',
        fontSize: '14px',
        lineHeight: '1.5',
      }}
      {...props}
    >
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  ) : (
    <code 
      className={`inline-code ${className || ''}`} 
      style={{
        backgroundColor: 'rgba(27, 31, 35, 0.1)',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '0.9em',
        fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
      }}
      {...props}
    >
      {children}
    </code>
  );
};

// 自定义表格组件
const Table = ({ children, ...props }) => (
  <div className="table-container">
    <table {...props}>{children}</table>
  </div>
);

// 自定义链接组件
const Link = ({ href, children, ...props }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer"
    className="markdown-link"
    {...props}
  >
    {children}
  </a>
);

// 自定义列表组件
const List = ({ ordered, children, ...props }) => {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={`markdown-list ${ordered ? 'ordered' : 'unordered'}`} {...props}>
      {children}
    </Tag>
  );
};

// 自定义列表项组件
const ListItem = ({ children, ...props }) => (
  <li className="markdown-list-item" {...props}>
    {children}
  </li>
);

// 自定义引用块组件
const Blockquote = ({ children, ...props }) => (
  <blockquote className="markdown-blockquote" {...props}>
    {children}
  </blockquote>
);

// 自定义标题组件
const Heading = ({ level, children, ...props }) => {
  const Tag = `h${level}`;
  return (
    <Tag className={`markdown-heading h${level}`} {...props}>
      {children}
    </Tag>
  );
};

// 自定义段落组件
const Paragraph = ({ children, ...props }) => (
  <p className="markdown-paragraph" {...props}>
    {children}
  </p>
);

// 自定义图片组件 - 自动处理相对路径
const Image = ({ src, alt, ...props }) => {
  // 处理相对路径，将 assets/ 开头的路径转换为 /assets/
  let processedSrc = src;
  if (src && typeof src === 'string') {
    if (src.startsWith('assets/')) {
      processedSrc = `/${src}`;
    } else if (src.startsWith('./assets/')) {
      processedSrc = src.replace('./assets/', '/assets/');
    }
  }
  
  return (
    <img 
      src={processedSrc} 
      alt={alt} 
      style={{
        maxWidth: '100%',
        height: 'auto',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        margin: '8px 0'
      }}
      {...props} 
    />
  );
};

// 高级 Markdown 渲染器组件
const AdvancedMarkdownRenderer = memo(({ 
  content, 
  className = '', 
  style = {},
  enableMath = true,
  enableCodeHighlight = true,
  enableTables = true,
}) => {
  // 处理空内容
  if (!content || typeof content !== 'string') {
    return null;
  }

  // 构建插件数组
  const remarkPlugins = [remarkGfm];
  const rehypePlugins = [rehypeRaw];

  if (enableMath) {
    remarkPlugins.push(remarkMath);
    rehypePlugins.push(rehypeKatex);
  }

  // 自定义组件映射
  const components = {
    code: CodeBlock,
    p: Paragraph,
    img: Image,
    h1: (props) => <Heading level={1} {...props} />,
    h2: (props) => <Heading level={2} {...props} />,
    h3: (props) => <Heading level={3} {...props} />,
    h4: (props) => <Heading level={4} {...props} />,
    h5: (props) => <Heading level={5} {...props} />,
    h6: (props) => <Heading level={6} {...props} />,
    blockquote: Blockquote,
    ul: (props) => <List ordered={false} {...props} />,
    ol: (props) => <List ordered={true} {...props} />,
    li: ListItem,
    a: Link,
  };

  if (enableTables) {
    components.table = Table;
  }

  if (!enableCodeHighlight) {
    components.code = ({ inline, children, ...props }) => (
      <code {...props}>{children}</code>
    );
  }

  return (
    <div 
      className={`advanced-markdown-renderer ${className}`}
      style={{
        padding: '16px',
        background: '#fbfbfb',
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        ...style
      }}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
        skipHtml={false}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

AdvancedMarkdownRenderer.displayName = 'AdvancedMarkdownRenderer';

export default AdvancedMarkdownRenderer;
