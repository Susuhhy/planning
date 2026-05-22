'use client';
import { useState } from 'react';
import { useStore } from '@/store';
import type { Room } from '@/types';

interface Props {
  room: Room;
  currentMemberId: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const PRESET_CONCEPTS = [
  { emoji: '💅', label: '여자놀이' },
  { emoji: '🧎', label: '거지모임' },
  { emoji: '🔥', label: '잼썰모임' },
  { emoji: '🕵️', label: '남쟈없냐남쟈' },
  { emoji: '🌶️', label: '엽떡모임' },
];

const STAR_LABELS = ['', '아직 미정', '살짝 꾸밈', '적당히 꾸밈', '꽤 차려입기', '풀 드레스업 ✨'];

export default function CalendarTab({ room, currentMemberId }: Props) {
  const { toggleDateVote, confirmDate, setDecorationLevel, setConcepts } = useStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [customConcept, setCustomConcept] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const toKey = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const getVote = (d: number) => room.dateVotes.find((v) => v.date === toKey(d));
  const isVoted = (d: number) => getVote(d)?.memberIds.includes(currentMemberId) ?? false;

  const sorted = [...room.dateVotes].sort((a, b) => b.memberIds.length - a.memberIds.length);
  const maxVotes = sorted[0]?.memberIds.length ?? 0;

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handleConfirmDate = (date: string) => {
    if (room.confirmedDate === date) {
      confirmDate(room.id, '');
    } else {
      confirmDate(room.id, date);
    }
  };

  const handleStarClick = (level: number) => {
    if (room.decorationLevel === level) {
      setDecorationLevel(room.id, 0);
    } else {
      setDecorationLevel(room.id, level);
    }
  };

  const handleToggleConcept = (label: string) => {
    const current = room.concepts ?? [];
    const next = current.includes(label)
      ? current.filter(c => c !== label)
      : [...current, label];
    setConcepts(room.id, next);
  };

  const handleAddCustom = () => {
    const trimmed = customConcept.trim();
    if (!trimmed) return;
    const current = room.concepts ?? [];
    if (!current.includes(trimmed)) {
      setConcepts(room.id, [...current, trimmed]);
    }
    setCustomConcept('');
    setShowCustomInput(false);
  };

  const handleRemoveCustomConcept = (label: string) => {
    const isPreset = PRESET_CONCEPTS.some(c => c.label === label);
    if (isPreset) return;
    const next = (room.concepts ?? []).filter(c => c !== label);
    setConcepts(room.id, next);
  };

  const confirmedDateObj = room.confirmedDate
    ? (() => {
        const [y, m, d] = room.confirmedDate.split('-');
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        return { y, m, d, dayName: WEEKDAYS[dateObj.getDay()] };
      })()
    : null;

  const displayStar = hoverStar || room.decorationLevel || 0;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

      {/* 확정 일정 배너 */}
      {confirmedDateObj && (
        <div style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, #e8884a 100%)',
          borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>📌 확정된 날짜</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>
              {confirmedDateObj.m}월 {confirmedDateObj.d}일 ({confirmedDateObj.dayName})
            </div>
          </div>
          <button
            onClick={() => confirmDate(room.id, '')}
            style={{
              padding: '6px 12px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.2)', color: 'white',
              fontSize: 12, border: '1px solid rgba(255,255,255,0.3)',
            }}
          >취소</button>
        </div>
      )}

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prevMonth} style={{
          width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)',
          border: '1px solid var(--border)', fontSize: 16, color: 'var(--text-secondary)',
        }}>‹</button>
        <h3 style={{ fontSize: 22, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          {year}년 {month + 1}월
        </h3>
        <button onClick={nextMonth} style={{
          width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)',
          border: '1px solid var(--border)', fontSize: 16, color: 'var(--text-secondary)',
        }}>›</button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {WEEKDAYS.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 12, fontWeight: 500, padding: '4px 0',
            color: i === 0 ? '#e04040' : i === 6 ? '#4040e0' : 'var(--text-muted)',
          }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const vote = getVote(d);
          const myVote = isVoted(d);
          const count = vote?.memberIds.length ?? 0;
          const isBest = maxVotes > 0 && count === maxVotes;
          const dateKey = toKey(d);
          const isConfirmed = room.confirmedDate === dateKey;
          const today = new Date();
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
          const dayOfWeek = (firstDay + d - 1) % 7;

          return (
            <div key={d} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button
                onClick={() => toggleDateVote(dateKey)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  background: isConfirmed
                    ? 'var(--accent)'
                    : myVote ? 'var(--accent-light)' : isBest ? 'var(--teal-light)' : 'var(--surface)',
                  border: isConfirmed
                    ? '2px solid var(--accent)'
                    : isToday ? '2px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                <span style={{
                  fontSize: 14, fontWeight: 500,
                  color: isConfirmed ? 'white' : myVote ? 'var(--accent)' : dayOfWeek === 0 ? '#e04040' : dayOfWeek === 6 ? '#4040e0' : 'var(--text-primary)',
                }}>{d}</span>
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: isConfirmed ? 'rgba(255,255,255,0.9)' : myVote ? 'var(--accent)' : 'var(--teal)',
                    background: isConfirmed ? 'rgba(255,255,255,0.25)' : myVote ? 'var(--accent-light)' : 'var(--teal-light)',
                    borderRadius: 99, padding: '1px 5px', lineHeight: 1.4,
                  }}>{count}</span>
                )}
              </button>
              {/* 일정 확정 버튼 */}
              {count > 0 && (
                <button
                  onClick={() => handleConfirmDate(dateKey)}
                  title={isConfirmed ? '확정 취소' : '이 날로 확정!'}
                  style={{
                    fontSize: 9, padding: '2px 0', borderRadius: 4,
                    background: isConfirmed ? 'var(--accent)' : 'var(--surface2)',
                    color: isConfirmed ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${isConfirmed ? 'var(--accent)' : 'var(--border)'}`,
                    width: '100%', fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  {isConfirmed ? '✓ 확정' : '확정'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Best dates summary */}
      {sorted.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            📊 날짜별 투표 현황
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sorted.slice(0, 5).map((v) => {
              const [y, m, d] = v.date.split('-');
              const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
              const dayName = WEEKDAYS[dateObj.getDay()];
              const members = v.memberIds.map(id => room.members.find(m => m.id === id)?.name).filter(Boolean);
              const isConfirmed = room.confirmedDate === v.date;
              return (
                <div key={v.date} style={{
                  background: isConfirmed ? 'var(--accent-light)' : 'var(--surface)',
                  border: `1px solid ${isConfirmed ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isConfirmed && <span style={{ fontSize: 12 }}>📌</span>}
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{m}월 {d}일 ({dayName})</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {members.join(', ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      background: v.memberIds.length === maxVotes ? 'var(--accent)' : 'var(--surface2)',
                      color: v.memberIds.length === maxVotes ? 'white' : 'var(--text-secondary)',
                      borderRadius: 99, padding: '4px 12px', fontSize: 13, fontWeight: 700,
                    }}>
                      {v.memberIds.length}명
                    </div>
                    <button
                      onClick={() => handleConfirmDate(v.date)}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12,
                        background: isConfirmed ? 'var(--accent)' : 'var(--surface2)',
                        color: isConfirmed ? 'white' : 'var(--text-secondary)',
                        border: `1px solid ${isConfirmed ? 'var(--accent)' : 'var(--border)'}`,
                        fontWeight: 600,
                      }}
                    >{isConfirmed ? '✓ 확정됨' : '확정'}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────── */}
      {/* 꾸밈 단계 (별점) */}
      {/* ──────────────────────────────── */}
      <div style={{
        marginTop: 28, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 18px',
      }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          ✨ 꾸밈 단계
        </h4>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          이번 모임 드레스코드는 어느 정도?
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHoverStar(star)}
              onMouseLeave={() => setHoverStar(0)}
              style={{
                fontSize: 30,
                background: 'transparent',
                transition: 'transform 0.1s',
                transform: displayStar >= star ? 'scale(1.15)' : 'scale(1)',
                filter: displayStar >= star ? 'none' : 'grayscale(1) opacity(0.35)',
              }}
            >⭐</button>
          ))}
        </div>
        {displayStar > 0 && (
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--accent)',
            background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)',
            padding: '6px 12px', display: 'inline-block',
          }}>
            {displayStar}단계 — {STAR_LABELS[displayStar]}
          </div>
        )}
        {displayStar === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>별을 눌러 꾸밈 단계를 선택하세요</div>
        )}
      </div>

      {/* ──────────────────────────────── */}
      {/* 컨셉 선택 */}
      {/* ──────────────────────────────── */}
      <div style={{
        marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 8,
      }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          🎭 모임 컨셉
        </h4>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          이번 모임의 분위기는?
        </p>

        {/* 프리셋 컨셉 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {PRESET_CONCEPTS.map(({ emoji, label }) => {
            const selected = room.concepts?.includes(label) ?? false;
            return (
              <button
                key={label}
                onClick={() => handleToggleConcept(label)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 13px', borderRadius: 99,
                  background: selected ? 'var(--accent)' : 'var(--surface2)',
                  color: selected ? 'white' : 'var(--text-secondary)',
                  border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  fontSize: 13, fontWeight: selected ? 700 : 500,
                  transition: 'all 0.15s',
                }}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* 커스텀 컨셉 태그 */}
        {(room.concepts ?? []).filter(c => !PRESET_CONCEPTS.some(p => p.label === c)).map(label => (
          <div
            key={label}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '7px 10px 7px 13px', borderRadius: 99, marginRight: 8, marginBottom: 8,
              background: 'var(--accent)', color: 'white',
              border: '1.5px solid var(--accent)',
              fontSize: 13, fontWeight: 700,
            }}
          >
            <span>✏️ {label}</span>
            <button
              onClick={() => handleRemoveCustomConcept(label)}
              style={{
                background: 'rgba(255,255,255,0.25)', color: 'white',
                borderRadius: '50%', width: 18, height: 18,
                fontSize: 11, fontWeight: 700, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>
        ))}

        {/* 직접 입력 */}
        {showCustomInput ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              className="input-field"
              value={customConcept}
              onChange={e => setCustomConcept(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
              placeholder="컨셉 직접 입력..."
              autoFocus
              style={{ flex: 1, fontSize: 13 }}
            />
            <button
              onClick={handleAddCustom}
              style={{
                padding: '8px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600,
              }}
            >추가</button>
            <button
              onClick={() => { setShowCustomInput(false); setCustomConcept(''); }}
              style={{
                padding: '8px 10px', borderRadius: 'var(--radius-md)',
                background: 'var(--surface2)', color: 'var(--text-secondary)', fontSize: 13,
                border: '1px solid var(--border)',
              }}
            >취소</button>
          </div>
        ) : (
          <button
            onClick={() => setShowCustomInput(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 13px', borderRadius: 99, marginTop: 4,
              background: 'var(--surface2)', color: 'var(--text-muted)',
              border: '1.5px dashed var(--border-strong)',
              fontSize: 13, fontWeight: 500,
            }}
          >
            <span>＋</span>
            <span>직접 입력</span>
          </button>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
        날짜를 눌러서 가능한 날 표시해보세요 ✨
      </p>
    </div>
  );
}
