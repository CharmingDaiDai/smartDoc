import React, { memo, useState, useEffect } from 'react';
import AdvancedMarkdownRenderer from './AdvancedMarkdownRenderer';

// 流式 Markdown 渲染器
const StreamingMarkdownRenderer = memo(({ 
  content, 
  isStreaming = false,
  className = '',
  style = {},
  ...props 
}) => {
  const [displayContent, setDisplayContent] = useState('');
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    if (!content) {
      setDisplayContent('');
      return;
    }

    // 如果是流式内容，显示光标
    setShowCursor(isStreaming);
    
    // 处理内容更新
    if (content !== displayContent) {
      setDisplayContent(content);
    }
  }, [content, isStreaming, displayContent]);

  // 处理空内容
  if (!content && !isStreaming) {
    return null;
  }

  const containerStyle = {
    position: 'relative',
    ...style
  };

  const cursorStyle = {
    display: showCursor ? 'inline' : 'none',
    marginLeft: '2px',
    animation: 'blink 1s infinite',
    color: '#0969da',
    fontWeight: 'bold'
  };

  return (
    <div style={containerStyle} className={className}>
      <AdvancedMarkdownRenderer 
        content={displayContent}
        {...props}
      />
      {showCursor && (
        <span style={cursorStyle}>▋</span>
      )}
    </div>
  );
});

StreamingMarkdownRenderer.displayName = 'StreamingMarkdownRenderer';

export default StreamingMarkdownRenderer;
