// ----------------------------------------------------
// File: frontend/src/components2/chat/ui/MessageContent.tsx
// ----------------------------------------------------
import { useMemo } from 'react';
import { Box, Divider, Text, List } from '@mantine/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../types';
import { CodeProps } from 'react-markdown/lib/ast-to-react';

/**
 * Finds a "References:" line plus a [REFERENCES: {...}] JSON block at the end
 * of the text, and separates it out. Returns:
 *   - answer: text before the references
 *   - referencesRaw: the raw "[REFERENCES: { ... }]" string (if found)
 */
function parseReferences(text: string): { answer: string; referencesRaw: string } {
  // Regex looks for:
  //   "References:" plus optional whitespace, then
  //   the [REFERENCES: {...}] block at the very end of the message
  const pattern = /References:\s*(?<block>\[REFERENCES:\s*\{[\s\S]*?\}\])\s*$/i;
  const match = text.match(pattern);

  if (!match?.groups?.block) {
    return { answer: text.trim(), referencesRaw: '' };
  }

  // The raw references block: "[REFERENCES: {...}]"
  const referencesRaw = match.groups.block.trim();
  // The answer is everything up to the start of the references block
  const answer = text.slice(0, match.index).trim();

  return { answer, referencesRaw };
}

/**
 * Given a raw references string like "[REFERENCES: { "files": ["doc1.pdf"] }]",
 * parse out the JSON inside of it, and return the file list with citation numbers.
 * If parsing fails, we return an empty array.
 */
function extractFilesFromReferences(raw: string): Array<{number: number; file: string}> {
  // Look for the JSON between [REFERENCES: and the final ]
  const jsonPattern = /\[REFERENCES:\s*(\{.*\})\]/s;
  const jsonMatch = raw.match(jsonPattern);
  if (!jsonMatch) return [];

  try {
    const obj = JSON.parse(jsonMatch[1]);
    const files = obj.files || [];
    if (Array.isArray(files)) {
      return files.map((file, index) => ({
        number: index + 1,
        file
      }));
    }
    return [];
  } catch (err) {
    console.error('Failed to parse references JSON:', err);
    return [];
  }
}

interface MessageContentProps {
  message: Message;
}

export function MessageContent({ message }: MessageContentProps) {
  // Avoid undefined text
  const rawText = message.text ?? '';

  // Split out the references from the text
  const { answer, referencesRaw } = useMemo(
    () => parseReferences(rawText),
    [rawText]
  );

  // Parse the [REFERENCES: ... ] block to get the list of files
  const files = useMemo(() => extractFilesFromReferences(referencesRaw), [referencesRaw]);

  // Common code-block renderer for ReactMarkdown
  const codeRenderer = ({
    inline,
    className,
    children,
    ...props
  }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match) {
      return (
        <SyntaxHighlighter
          style={oneDark as any}
          language={match[1]}
          PreTag="div"
          showLineNumbers
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  return (
    <Box
      style={{
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
      }}
    >
      {/* Main answer content */}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: codeRenderer }}>
        {answer}
      </ReactMarkdown>

      {/* Only show "References" if we found a references block */}
      {referencesRaw && files.length > 0 && (
        <>
          <Divider my="md" variant="dashed" />
          <Text fw="bold" mb="xs">
            References
          </Text>
          <List size="sm" spacing="xs" listStyleType="none" ml={0}>
            {files.map(({number, file}) => (
              <List.Item key={number}>[{number}] {file}</List.Item>
            ))}
          </List>
        </>
      )}
    </Box>
  );
}
