'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import ChatTab from '@/components/ChatTab';
import CalendarTab from '@/components/CalendarTab';
import LocationTab from '@/components/LocationTab';
import MembersTab from '@/components/MembersTab';
import type { Room, Member } from '@/types';

type TabKey = 'chat' | 'calendar' | 'location' | 'members';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'chat', label: '채팅', icon: '💬' },
  { key: 'calendar', label: '날짜', icon: '📅' },
  { key: 'location', label: '장소', icon: '📍' },
  { key: 'members', label: '멤버', icon: '👥' },
];

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const store = useStore();
  const [tab, setTab] = useState<TabKey>('chat');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontSize: 32 }}>🗓️</div>
      </div>
    );
  }

  const rooms = store.rooms ?? [];
  const room: Room | undefined = rooms.find(r => r.code === code.toUpperCase());
  const currentMemberId = store.currentMemberId;
  const member: Member | undefined = room?.members.find((m) => m.id === currentMemberId);

  if (!room || !member) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
      }}>
        <div style={{ fontSize: 52 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
          {!room ? '방을 찾을 수 없어요' : '참가 후 이용할 수 있어요'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
          {!room ? `코드 "${code}" 에 해당하는 방이 없어요` : '홈에서 방 코드를 입력해 참가해주세요'}
        </p>
        <button onClick={() => router.push('/')} style={{
          padding: '11px 28px', background: 'var(--accent)', color: 'white',
          borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600,
        }}>홈으로</button>
      </div>
    );
  }

  // Unread count per tab (chat)
  const unreadChat = (room.messages ?? []).filter(
    msg => msg.memberId !== currentMemberId && !((msg.readBy ?? []).includes(currentMemberId!))
  ).length;

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      maxWidth: 640, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-md)',
          background: 'var(--accent-light)', overflow: 'hidden', flexShrink: 0,
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>
          {room.profileImage
            ? <img src={room.profileImage} alt="방 프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '🗓️'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontSize: 16, fontWeight: 700,
            color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{room.name}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            코드: <span style={{ fontWeight: 700, letterSpacing: 2, color: 'var(--accent)' }}>{room.code}</span>
            {' '}· {room.members.length}/{room.maxMembers}명
          </p>
        </div>
        <button onClick={() => { store.clearSession(); router.push('/'); }} style={{
          padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12,
          background: 'var(--surface2)', color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
        }}>나가기</button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'chat' && <ChatTab room={room} currentMemberId={currentMemberId!} />}
        {tab === 'calendar' && <CalendarTab room={room} currentMemberId={currentMemberId!} />}
        {tab === 'location' && <LocationTab room={room} />}
        {tab === 'members' && <MembersTab room={room} currentMemberId={currentMemberId!} />}
      </div>

      {/* Bottom nav */}
      <div style={{
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', position: 'sticky', bottom: 0, zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(({ key, label, icon }) => {
          const badge = key === 'chat' && unreadChat > 0 ? unreadChat : 0;
          return (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '10px 4px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'transparent', position: 'relative',
              borderTop: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
              <span style={{ fontSize: 20, position: 'relative' }}>
                {icon}
                {badge > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    background: 'var(--accent)', color: 'white',
                    borderRadius: 99, minWidth: 16, height: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, padding: '0 4px',
                  }}>{badge}</span>
                )}
              </span>
              <span style={{ fontSize: 11, fontWeight: 500, color: tab === key ? 'var(--accent)' : 'var(--text-muted)' }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
