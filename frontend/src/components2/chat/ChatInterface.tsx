import { Stack, TextInput, ActionIcon, Paper, ScrollArea, Title } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { useState,  } from 'react';
import { useChat } from './hooks/useChat';
import { MessageBubble } from './ui/MessageBubble';
import { EmptyState } from './ui/EmptyState';

export function ChatInterface() {
  const { messages, isStreaming, sendMessage } = useChat();
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  return (
    <Paper
      style={{
        height: '100%',
        backgroundColor: 'var(--container-bg)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      radius="lg"
      shadow="md"
    >
      <Title
        order={2}
        ta="center"
        py="sm"
        style={{
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--header-bg)',
          color: 'var(--text-bright)',
        }}
      >
        Reminder Media Chatbot
      </Title>

      <ScrollArea 
        flex={1}
        type="hover"
        offsetScrollbars
        scrollbarSize={8}
        style={{ backgroundColor: 'var(--chat-bg)', width: '100%' }}
      >
        <Stack gap="md" p="md" style={{ width: '100%' }}>
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map(message => (
              <MessageBubble 
                key={message.id} 
                message={message} 
              />
            ))
          )}
        </Stack>
      </ScrollArea>

      <Paper 
        p="md" 
        style={{ 
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--input-bg)',
        }}
      >
        <form onSubmit={handleSubmit}>
          <TextInput
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            size="lg"
            radius="xl"
            styles={{
              input: {
                backgroundColor: 'var(--container-bg)',
                border: '1px solid var(--border-color)',
                '&:focus': {
                  borderColor: 'var(--mantine-color-blue-filled)',
                },
                fontSize: '1rem',
                padding: '1.2rem',
                height: 'auto',
                paddingRight: '3.5rem',
                color: 'var(--text-bright)',
                '&::placeholder': {
                  color: 'var(--text-secondary)',
                }
              }
            }}
            rightSection={
              <ActionIcon 
                size="lg"
                radius="xl"
                color="blue"
                variant="subtle"
                type="submit"
                disabled={!input.trim() || isStreaming}
                style={{ 
                  backgroundColor: input.trim() ? 'var(--mantine-color-blue-filled)' : 'transparent',
                  color: input.trim() ? 'white' : 'var(--mantine-color-blue-filled)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: input.trim() ? 'var(--mantine-color-blue-filled-hover)' : 'var(--mantine-color-blue-light)',
                  }
                }}
              >
                <IconSend style={{ width: '1.2rem', height: '1.2rem' }} />
              </ActionIcon>
            }
          />
        </form>
      </Paper>
    </Paper>
  );
} 