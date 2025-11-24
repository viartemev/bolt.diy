import { useLocation } from '@remix-run/react';
import type { UIMessage } from 'ai';
import { Fragment } from 'react';
import { forwardRef } from 'react';
import type { ForwardedRef } from 'react';
import { toast } from 'react-toastify';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { forkChat } from '~/lib/persistence/db';
import { db, chatId } from '~/lib/persistence/useChatHistory';
import type { ChatMessageMetadata } from '~/types/chat';
import type { ProviderInfo } from '~/types/model';
import { classNames } from '~/utils/classNames';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: UIMessage[];
  append?: (message: UIMessage) => void;
  chatMode?: 'discuss' | 'build';
  setChatMode?: (mode: 'discuss' | 'build') => void;
  model?: string;
  provider?: ProviderInfo;
  addToolResult: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
}

const stripBoltArtifacts = (text: string) => {
  const stripTag = (input: string, tagName: string) =>
    input.replace(new RegExp(`<${tagName}[\\s\\S]*?(?:<\\/${tagName}>|$)`, 'gi'), '');

  return ['boltArtifact', 'boltAction'].reduce((acc, tag) => stripTag(acc, tag), text).trim();
};

export const Messages = forwardRef<HTMLDivElement, MessagesProps>(
  (props: MessagesProps, ref: ForwardedRef<HTMLDivElement> | undefined) => {
    const { id, isStreaming = false, messages = [] } = props;
    const location = useLocation();

    const handleRewind = (messageId: string) => {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('rewindTo', messageId);
      window.location.search = searchParams.toString();
    };

    const handleFork = async (messageId: string) => {
      try {
        if (!db || !chatId.get()) {
          toast.error('Chat persistence is not available');
          return;
        }

        const urlId = await forkChat(db, chatId.get()!, messageId);
        window.location.href = `/chat/${urlId}`;
      } catch (error) {
        toast.error('Failed to fork chat: ' + (error as Error).message);
      }
    };

    return (
      <div id={id} className={props.className} ref={ref}>
        {messages.length > 0
          ? messages.map((message, index) => {
              const { role, id: messageId, parts, metadata } = message;
              const isUserMessage = role === 'user';
              const isFirst = index === 0;

              // Extract text content from parts for display
              const textParts = parts?.filter((p: any) => p.type === 'text') || [];
              const rawContent = textParts.map((p: any) => p.text).join('');
              const containsArtifacts = /<boltArtifact|<boltAction/.test(rawContent);
              const messageMetadata = metadata as ChatMessageMetadata | undefined;
              const sanitizedContent = stripBoltArtifacts(rawContent);

              const fallbackText = containsArtifacts ? 'Generated files have been applied to the editor.' : '';

              const content =
                messageMetadata?.displayText ?? (sanitizedContent.length > 0 ? sanitizedContent : fallbackText);

              const isHidden =
                messageMetadata?.hidden ??
                (containsArtifacts && sanitizedContent.length === 0 && !messageMetadata?.displayText);

              if (isHidden) {
                return <Fragment key={index} />;
              }

              return (
                <div
                  key={index}
                  className={classNames('flex gap-4 py-3 w-full rounded-lg', {
                    'mt-4': !isFirst,
                  })}
                >
                  <div className="grid grid-col-1 w-full">
                    {isUserMessage ? (
                      <UserMessage content={content} parts={parts as any} />
                    ) : (
                      <AssistantMessage
                        content={content}
                        annotations={undefined}
                        messageId={messageId}
                        onRewind={handleRewind}
                        onFork={handleFork}
                        append={props.append}
                        chatMode={props.chatMode}
                        setChatMode={props.setChatMode}
                        model={props.model}
                        provider={props.provider}
                        parts={parts as any}
                        addToolResult={props.addToolResult}
                      />
                    )}
                  </div>
                </div>
              );
            })
          : null}
        {isStreaming && (
          <div className="text-center w-full  text-bolt-elements-item-contentAccent i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
        )}
      </div>
    );
  },
);
