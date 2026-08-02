import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Message = Database['public']['Tables']['messages']['Row'];

export function useConversationMessages(friendshipId: string | undefined) {
  const { session } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!friendshipId) return;
      setIsLoading(true);
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('friendship_id', friendshipId)
        .single();
      if (cancelled || !conversation) {
        setIsLoading(false);
        return;
      }
      setConversationId(conversation.id);
      const { data: rows } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      setMessages(rows ?? []);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [friendshipId]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || !conversationId || !session) return;
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        body: trimmed,
      });
    },
    [conversationId, session],
  );

  return { messages, isLoading, sendMessage, myUserId: session?.user.id };
}
