import React from 'react';
import ReactMarkdown from 'react-markdown';
import '../../styles/components/markdown.css';

// ...existing code...

const Markdown = ({ content }) => {
  return <ReactMarkdown>{content}</ReactMarkdown>;
};

export default Markdown;