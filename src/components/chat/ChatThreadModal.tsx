import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/mockSupabase';
import { Comment, User } from '../../types';
import { Send, X, Shield, Clock, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';

interface ChatThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'grievance' | 'transaction';
  itemId: string;
  itemTitle?: string;
  currentUser: User | null;
}

export const ChatThreadModal: React.FC<ChatThreadModalProps> = ({
  isOpen,
  onClose,
  type,
  itemId,
  itemTitle,
  currentUser,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !itemId) return;

    fetchComments();

    const channel = supabase.channel('public:comments');
    const sub = channel.on('postgres_changes', {}, () => {
      fetchComments();
    });

    return () => {
      if (sub && (sub as any).unsubscribe) {
        (sub as any).unsubscribe();
      }
    };
  }, [isOpen, itemId, type]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments, isTyping]);

  const fetchComments = async () => {
    setLoading(true);
    const queryField = type === 'transaction' ? 'transaction_id' : 'grievance_id';
    const { data } = await supabase
      .from('comments')
      .select('*, user:users(name)')
      .eq(queryField, itemId)
      .order('created_at', { ascending: true });

    setComments(data || []);
    setLoading(false);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !currentUser) return;

    const newComment = {
      text,
      user_id: currentUser.id,
      [type === 'transaction' ? 'transaction_id' : 'grievance_id']: itemId,
      created_at: new Date().toISOString(),
    };

    setInputText('');
    await supabase.from('comments').insert([newComment]);
    await fetchComments();

    // Simulate smart contextual auto-reply for demo realism
    if (currentUser.role === 'FlatOwner') {
      setIsTyping(true);
      setTimeout(async () => {
        setIsTyping(false);
        const replyText =
          type === 'transaction'
            ? 'Maintenance Office: We received your update and verified against the banking ledger.'
            : 'Maintenance Office: Our facilities supervisor has noted your message and will update the task tracker.';

        await supabase.from('comments').insert([
          {
            text: replyText,
            user_id: 'user-admin-1',
            [type === 'transaction' ? 'transaction_id' : 'grievance_id']: itemId,
            created_at: new Date().toISOString(),
          },
        ]);
        fetchComments();
      }, 1200);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl flex flex-col h-[600px] max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  {type === 'grievance' ? 'Grievance Thread' : 'Payment Dispute / Audit'}
                </span>
                <span className="text-slate-500 text-xs">·</span>
                <span className="text-[11px] text-slate-400 font-mono">#{itemId.slice(-6)}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 truncate">
                {itemTitle || 'Discussion Thread'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/60">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading thread history...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-4">
              <MessageSquare className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">No messages yet in this discussion.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Type a message below to start communicating with {currentUser?.role === 'Maintenance' ? 'the resident' : 'maintenance management'}.
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const isMe = comment.user_id === currentUser?.id;
              const isSystem = comment.text.startsWith('System:');

              if (isSystem) {
                return (
                  <div key={comment.id} className="flex justify-center my-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/50 text-[11px] text-slate-300 shadow-sm max-w-[90%] text-center">
                      <Shield className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>{comment.text.replace('System:', '').trim()}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={comment.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {!isMe && (
                    <span className="text-[11px] font-medium text-slate-400 ml-2 mb-0.5">
                      {comment.user?.name || (comment.user_id === 'user-admin-1' ? 'Maintenance Admin' : 'Resident')}
                    </span>
                  )}
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{comment.text}</p>
                    <div
                      className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                        isMe ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      <span>
                        {new Date(comment.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic py-1">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
              </div>
              <span>Maintenance Team is replying...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-1.5 bg-slate-900 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
          <span className="text-slate-500 whitespace-nowrap">Quick:</span>
          {currentUser?.role === 'Maintenance' ? (
            <>
              <button
                onClick={() => handleSend('Technician has been assigned and is on the way.')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors"
              >
                Technician assigned
              </button>
              <button
                onClick={() => handleSend('System: Status changed to In Progress by Maintenance')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 whitespace-nowrap transition-colors"
              >
                Set In Progress
              </button>
              <button
                onClick={() => handleSend('Payment confirmed in bank statement. Thank you!')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 whitespace-nowrap transition-colors"
              >
                Payment verified
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleSend('Could we get an ETA on inspection?')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors"
              >
                Ask for ETA
              </button>
              <button
                onClick={() => handleSend('I have uploaded the payment receipt for your reference.')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors"
              >
                Receipt uploaded
              </button>
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message to society desk..."
              className="flex-1 bg-slate-800 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-colors font-medium shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
