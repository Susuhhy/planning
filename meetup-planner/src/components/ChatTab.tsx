'use client';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import type { Room } from '@/types';

interface Props {
  room: Room;
  currentMemberId: string;
}

function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  const initials = name.slice(0, 1).toUpperCase();
  const colors = ['#e8674a', '#2d8f7b', '#d4820f', '#7c6af0', '#e04598'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      overflow: 'hidden', background: src ? 'transparent' : color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: size * 0.38, fontWeight: 700,
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  );
}

export default function ChatTab({ room, currentMemberId }: Props) {
  const { sendMessage, markMessagesRead } = useStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    markMessagesRead(room.id);
  }, [room.messages, room.id]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {room.messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
            <p style={{ fontSize: 14 }}>첫 번째 메시지를 보내보세요!</p>
          </div>
        )}
        {room.messages.map((msg, idx) => {
          const isMe = msg.memberId === currentMemberId;
          const readBy = msg.readBy || [];
          const readCount = readBy.filter(id => id !== msg.memberId).length;
          const totalOthers = room.members.length - 1;
          const allRead = totalOthers > 0 && readCount >= totalOthers;

          // Show date separator
          const msgDate = new Date(msg.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
          const prevDate = idx > 0 ? new Date(room.messages[idx - 1].createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : null;
          const showDate = msgDate !== prevDate;

          return (
            <div key={msg.id}>
              {showDate && (
                <div style={{ textAlign: 'center', margin: '8px 0' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface2)', padding: '3px 10px', borderRadius: 99 }}>{msgDate}</span>
                </div>
              )}
              <div style={{
                display: 'flex', gap: 8,
                flexDirection: isMe ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
              }}>
                {!isMe && <Avatar src={msg.memberAvatar} name={msg.memberName} size={32} />}
                <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {!isMe && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4 }}>{msg.memberName}</span>
                  )}
                  <div style={{
                    padding: '8px 12px', borderRadius: 16,
                    borderBottomRightRadius: isMe ? 4 : 16,
                    borderBottomLeftRadius: isMe ? 16 : 4,
                    background: isMe ? 'var(--accent)' : 'var(--surface)',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    color: isMe ? 'white' : 'var(--text-primary)',
                    fontSize: 14, lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4, paddingRight: 4 }}>
                    {isMe && (
                      <span style={{ fontSize: 10, color: allRead ? 'var(--teal)' : 'var(--text-muted)', fontWeight: allRead ? 600 : 400 }}>
                        {allRead ? '✓✓ 읽음' : readCount > 0 ? `✓ ${readCount}명 읽음` : '✓ 전송'}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {new Date(msg.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '12px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, alignItems: 'flex-end',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="의견을 남겨보세요..."
          rows={1}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20,
            border: '1.5px solid var(--border)', fontSize: 14,
            background: 'var(--bg)', color: 'var(--text-primary)',
            resize: 'none', maxHeight: 100, lineHeight: 1.5,
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 100) + 'px';
          }}
        />
        <button onClick={handleSend} disabled={!input.trim()} style={{
          width: 40, height: 40, borderRadius: '50%',
          background: input.trim() ? 'var(--accent)' : 'var(--surface2)',
          color: input.trim() ? 'white' : 'var(--text-muted)',
          fontSize: 18, flexShrink: 0,
          transition: 'all 0.15s',
        }}>↑</button>
      </div>
    </div>
  );
}
