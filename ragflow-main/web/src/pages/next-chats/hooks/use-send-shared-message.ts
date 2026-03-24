import { MessageType, SharedFrom } from '@/constants/chat';
import { useCreateNextSharedConversation } from '@/hooks/chat-hooks';
import {
  useHandleMessageInputChange,
  useSelectDerivedMessages,
  useSendMessageWithSse,
} from '@/hooks/logic-hooks';
import { Message } from '@/interfaces/database/chat';
import api from '@/utils/api';
import { buildMessageListWithUuid } from '@/utils/chat';
import request from '@/utils/next-request';
import { message } from 'antd';
import { get } from 'lodash';
import trim from 'lodash/trim';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'umi';
import { v4 as uuid } from 'uuid';

const isCompletionError = (res: any) =>
  res && (res?.response.status !== 200 || res?.data?.code !== 0);

export const useSendButtonDisabled = (value: string) => {
  return trim(value) === '';
};

export const useGetSharedChatSearchParams = () => {
  const [searchParams] = useSearchParams();
  const data_prefix = 'data_';
  const data = Object.fromEntries(
    searchParams
      .entries()
      .filter(([key]) => key.startsWith(data_prefix))
      .map(([key, value]) => [key.replace(data_prefix, ''), value]),
  );
  return {
    from: searchParams.get('from') as SharedFrom,
    sharedId: searchParams.get('shared_id'),
    /** 父页面传入的会话 id，用于嵌入场景下刷新后恢复该会话的消息列表 */
    loadConversationId:
      searchParams.get('conversationId') || searchParams.get('conversation_id') || '',
    locale: searchParams.get('locale'),
    data: data,
    visibleAvatar: searchParams.get('visible_avatar')
      ? searchParams.get('visible_avatar') !== '1'
      : true,
  };
};

export const useSendSharedMessage = () => {
  const {
    from,
    sharedId: conversationId,
    loadConversationId,
    data: data,
  } = useGetSharedChatSearchParams();
  const { createSharedConversation: setConversation } =
    useCreateNextSharedConversation();
  const { handleInputChange, value, setValue } = useHandleMessageInputChange();
  const { send, answer, done, stopOutputMessage } = useSendMessageWithSse(
    `/api/v1/${from === SharedFrom.Agent ? 'agentbots' : 'chatbots'}/${conversationId}/completions`,
  );
  const {
    derivedMessages,
    setDerivedMessages,
    removeLatestMessage,
    addNewestAnswer,
    addNewestQuestion,
    scrollRef,
    messageContainerRef,
    removeAllMessages,
    removeAllMessagesExceptFirst,
  } = useSelectDerivedMessages();
  const [hasError, setHasError] = useState(false);

  // 嵌入场景：URL 带 conversationId 时拉取该会话历史并展示，实现刷新后恢复对话
  useEffect(() => {
    if (!loadConversationId || !loadConversationId.trim()) return;
    let cancelled = false;
    const url = `${(api as any).getExternalConversation}/${loadConversationId}`;
    request
      .get(url)
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data?.data;
        const msgList = data?.message;
        if (Array.isArray(msgList) && msgList.length > 0) {
          const list = buildMessageListWithUuid(msgList);
          setDerivedMessages(list);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loadConversationId, setDerivedMessages]);

  const sendMessage = useCallback(
    async (message: Message, id?: string) => {
      const res = await send({
        conversation_id: id ?? loadConversationId ?? conversationId,
        quote: true,
        question: message.content,
        session_id: get(derivedMessages, '0.session_id'),
      });

      if (isCompletionError(res)) {
        // cancel loading
        setValue(message.content);
        removeLatestMessage();
      }
    },
    [send, conversationId, loadConversationId, derivedMessages, setValue, removeLatestMessage],
  );

  const handleSendMessage = useCallback(
    async (message: Message) => {
      if (conversationId !== '' || loadConversationId !== '') {
        sendMessage(message);
      } else {
        const data = await setConversation('user id');
        if (data.code === 0) {
          const id = data.data.id;
          sendMessage(message, id);
          // 嵌入场景：将新会话 id 通知父页面，便于父页面持久化后刷新可恢复
          try {
            window.parent.postMessage(
              { type: 'RAGFLOW_CONVERSATION_ID', conversationId: id, conversation_id: id },
              '*',
            );
          } catch (_) {
            /* ignore */
          }
        }
      }
    },
    [conversationId, loadConversationId, setConversation, sendMessage],
  );

  const fetchSessionId = useCallback(async () => {
    const payload = { question: '' };
    const ret = await send({ ...payload, ...data });
    if (isCompletionError(ret)) {
      message.error(ret?.data.message);
      setHasError(true);
    }
  }, [send]);

  useEffect(() => {
    fetchSessionId();
  }, [fetchSessionId]);

  useEffect(() => {
    if (answer.answer) {
      addNewestAnswer(answer);
    }
  }, [answer, addNewestAnswer]);

  const handlePressEnter = useCallback(
    (documentIds: string[]) => {
      if (trim(value) === '') return;
      const id = uuid();
      if (done) {
        setValue('');
        addNewestQuestion({
          content: value,
          doc_ids: documentIds,
          id,
          role: MessageType.User,
        });
        handleSendMessage({
          content: value.trim(),
          id,
          role: MessageType.User,
        });
      }
    },
    [addNewestQuestion, done, handleSendMessage, setValue, value],
  );

  return {
    handlePressEnter,
    handleInputChange,
    value,
    sendLoading: !done,
    loading: false,
    derivedMessages,
    hasError,
    stopOutputMessage,
    scrollRef,
    messageContainerRef,
    removeAllMessages,
    removeAllMessagesExceptFirst,
  };
};
