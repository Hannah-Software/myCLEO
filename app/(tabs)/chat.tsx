import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  bridgeClient,
  type ChatTurn,
  type ChatContextSummary,
} from '../../utils/bridge-client';
import {
  loadThread,
  saveThread,
  clearThread,
  type StoredMessage,
} from '../../utils/chat-storage';

type Message = StoredMessage;

const HISTORY_TURN_LIMIT = 12;

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toHistoryTurns(messages: Message[]): ChatTurn[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .filter((m) => !m.error)
    .slice(-HISTORY_TURN_LIMIT)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    let cancelled = false;
    loadThread()
      .then((stored) => {
        if (!cancelled) setMessages(stored);
      })
      .catch((err) => console.warn('[chat] load thread failed:', err))
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveThread(messages).catch((err) =>
      console.warn('[chat] save thread failed:', err)
    );
  }, [messages, hydrated]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: makeId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    const historyForRequest = toHistoryTurns(messages);

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    scrollToEnd();

    try {
      const res = await bridgeClient.chat(text, historyForRequest);
      const assistantMsg: Message = {
        id: makeId(),
        role: 'assistant',
        content: res.response,
        timestamp: Date.now(),
        context: res.context,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: makeId(),
        role: 'assistant',
        content:
          err instanceof Error
            ? `CLEO couldn't reach the bridge: ${err.message}`
            : "CLEO couldn't reach the bridge.",
        timestamp: Date.now(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }, [input, messages, scrollToEnd, sending]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setMessages([]);
    try {
      await clearThread();
    } catch (err) {
      console.warn('[chat] clear thread failed:', err);
    }
    setRefreshing(false);
  }, []);

  const renderItem = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.bubbleRow,
          isUser ? styles.bubbleRowRight : styles.bubbleRowLeft,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser
              ? styles.bubbleUser
              : item.error
              ? styles.bubbleError
              : styles.bubbleAssistant,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
            ]}
          >
            {item.content}
          </Text>
          {item.context && (
            <Text style={styles.contextLine}>
              grounded in {item.context.email_count} emails ·{' '}
              {item.context.calendar_count} events ·{' '}
              {item.context.window_days}d window
            </Text>
          )}
        </View>
      </View>
    );
  }, []);

  const empty = (
    <View style={styles.emptyWrap}>
      <Ionicons name="chatbubbles-outline" size={48} color="#888" />
      <Text style={styles.emptyTitle}>Talk to CLEO</Text>
      <Text style={styles.emptyBody}>
        Ask anything about your last 90 days of email or your calendar.
        Pull down to clear.
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={
          messages.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={empty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onContentSizeChange={scrollToEnd}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message CLEO..."
          placeholderTextColor="#888"
          multiline
          editable={!sending}
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
          onPress={send}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="arrow-up" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  listContent: { padding: 12, paddingBottom: 24 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  emptyWrap: { alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptyBody: { textAlign: 'center', color: '#666', lineHeight: 20 },
  bubbleRow: { flexDirection: 'row', marginVertical: 4 },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '85%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  bubbleUser: { backgroundColor: '#007AFF', borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: '#F0F0F2', borderBottomLeftRadius: 4 },
  bubbleError: { backgroundColor: '#FFE4E4', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: '#222' },
  contextLine: { marginTop: 6, fontSize: 11, color: '#666', fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    fontSize: 15,
    color: '#222',
  },
  sendButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#B0B0B0' },
});
