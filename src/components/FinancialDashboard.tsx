'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Booking, Camp, Child } from '@/lib/db';
import { CreditCard, DollarSign, Calendar, AlertCircle, ShieldAlert, ChevronDown } from 'lucide-react';

interface FinancialDashboardProps {
  bookings: Booking[];
  camps: Camp[];
  childrenList: Child[];
  variant?: 'card' | 'header';
}

export default function FinancialDashboard({
  bookings,
  camps,
  childrenList,
  variant = 'card',
}: FinancialDashboardProps) {
  const [showDeadlines, setShowDeadlines] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDeadlines(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 1. Calculations
  let totalCost = 0;
  let totalPaid = 0;

  bookings.forEach((booking) => {
    const camp = camps.find((c) => c.id === booking.camp_id);
    if (camp) {
      totalCost += camp.price;
    }
    totalPaid += booking.amount_paid || 0;
  });

  const outstandingBalance = totalCost - totalPaid;

  // Helper to get child details
  const getChildInfo = (childId: string) => {
    return childrenList.find((c) => c.id === childId) || { name: 'Unknown', color: 'var(--text-muted)' };
  };

  // 2. Upcoming Payment Due Dates (bookings that are not in 'researching' status)
  const paymentsDue = bookings
    .filter((b) => b.status !== 'researching')
    .map((b) => {
      const camp = camps.find((c) => c.id === b.camp_id);
      const child = getChildInfo(b.child_id);
      if (camp && camp.payment_due_date) {
        const balance = camp.price - (b.amount_paid || 0);
        // Only list if there's an outstanding balance due
        if (balance > 0) {
          return {
            id: b.id,
            campName: camp.name,
            childName: child.name,
            childColor: child.color,
            dueDate: camp.payment_due_date,
            amountDue: balance,
          };
        }
      }
      return null;
    })
    .filter(Boolean) as {
      id: string;
      campName: string;
      childName: string;
      childColor: string;
      dueDate: string;
      amountDue: number;
    }[];

  // Sort payments chronologically
  paymentsDue.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // 3. Refund & Cancellation Deadlines (only bookings with status === 'booked')
  const refundDeadlines = bookings
    .filter((b) => b.status === 'booked')
    .map((b) => {
      const camp = camps.find((c) => c.id === b.camp_id);
      const child = getChildInfo(b.child_id);
      if (camp && camp.refund_deadline_date) {
        return {
          id: b.id,
          campName: camp.name,
          childName: child.name,
          childColor: child.color,
          refundDate: camp.refund_deadline_date,
          price: camp.price,
        };
      }
      return null;
    })
    .filter(Boolean) as {
      id: string;
      campName: string;
      childName: string;
      childColor: string;
      refundDate: string;
      price: number;
    }[];

  // Sort refund deadlines chronologically
  refundDeadlines.sort((a, b) => a.refundDate.localeCompare(b.refundDate));

  // Format Date String helper
  const formatDateStr = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (variant === 'header') {
    return (
      <div className="flex align-center gap-4 py-1.5 px-3 glass" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '80px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>${totalCost.toFixed(0)}</span>
        </div>
        <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--glass-border)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '80px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--accent-sage)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-sage)' }}>${totalPaid.toFixed(0)}</span>
        </div>
        <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--glass-border)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '80px' }}>
          <span style={{ fontSize: '0.65rem', color: outstandingBalance > 0 ? 'var(--accent-terracotta)' : 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: outstandingBalance > 0 ? 'var(--accent-terracotta)' : 'var(--text-primary)' }}>${outstandingBalance.toFixed(0)}</span>
        </div>
        
        {(paymentsDue.length > 0 || refundDeadlines.length > 0) && (
          <>
            <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--glass-border)' }} />
            <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeadlines(!showDeadlines)}
                style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="View deadlines details"
              >
                <Calendar size={12} />
                <span>Deadlines</span>
                {paymentsDue.length > 0 && (
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-terracotta)',
                    display: 'inline-block'
                  }} />
                )}
              </button>
              
              {showDeadlines && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    padding: '1.25rem',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    width: '300px'
                  }}
                >
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <CreditCard size={14} /> Schedule Deadlines
                  </h4>
                  
                  {/* Payments */}
                  <div className="mb-3">
                    <h5 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontWeight: 700 }}>Upcoming Payments</h5>
                    {paymentsDue.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', margin: 0, fontStyle: 'italic' }}>None pending</p>
                    ) : (
                      <div className="flex flex-col gap-1.5" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                        {paymentsDue.map(p => (
                          <div key={p.id} className="flex justify-between align-center" style={{ fontSize: '0.75rem', borderLeft: `3px solid ${p.childColor}`, paddingLeft: '6px', marginBottom: '2px' }}>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                              <strong>{p.childName}</strong> • {p.campName}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-terracotta)', flexShrink: 0 }}>${p.amountDue.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Refunds */}
                  <div>
                    <h5 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontWeight: 700 }}>Refund Deadlines</h5>
                    {refundDeadlines.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', margin: 0, fontStyle: 'italic' }}>None set</p>
                    ) : (
                      <div className="flex flex-col gap-1.5" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                        {refundDeadlines.map(r => (
                          <div key={r.id} className="flex justify-between align-center" style={{ fontSize: '0.75rem', borderLeft: `3px solid ${r.childColor}`, paddingLeft: '6px', marginBottom: '2px' }}>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                              <strong>{r.childName}</strong> • {r.campName}
                            </span>
                            <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{formatDateStr(r.refundDate).split(',')[0]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card mb-6">
      <div className="flex align-center gap-2 mb-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <CreditCard size={20} style={{ color: 'var(--accent-slate)' }} />
        <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Budget &amp; Deadlines Dashboard</h3>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', fontSize: '0.85rem' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.35)',
          padding: '0.5rem',
          borderRadius: 'var(--radius-sm)',
          textAlign: 'center',
          border: '1px solid rgba(45, 43, 42, 0.05)'
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Total Budget</span>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            ${totalCost.toFixed(2)}
          </span>
        </div>

        <div style={{
          background: 'rgba(110, 130, 104, 0.08)',
          padding: '0.5rem',
          borderRadius: 'var(--radius-sm)',
          textAlign: 'center',
          border: '1px solid rgba(110, 130, 104, 0.15)'
        }}>
          <span style={{ color: 'var(--accent-sage)', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Total Paid</span>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-sage)' }}>
            ${totalPaid.toFixed(2)}
          </span>
        </div>

        <div style={{
          background: outstandingBalance > 0 ? 'rgba(195, 106, 85, 0.08)' : 'rgba(255, 255, 255, 0.35)',
          padding: '0.5rem',
          borderRadius: 'var(--radius-sm)',
          textAlign: 'center',
          border: outstandingBalance > 0 ? '1px solid rgba(195, 106, 85, 0.15)' : '1px solid rgba(45, 43, 42, 0.05)'
        }}>
          <span style={{
            color: outstandingBalance > 0 ? 'var(--accent-terracotta)' : 'var(--text-muted)',
            fontSize: '0.75rem',
            display: 'block',
            fontWeight: outstandingBalance > 0 ? 600 : 400
          }}>
            Balance Due
          </span>
          <span style={{
            fontWeight: 800,
            fontSize: '0.95rem',
            color: outstandingBalance > 0 ? 'var(--accent-terracotta)' : 'var(--text-primary)'
          }}>
            ${outstandingBalance.toFixed(2)}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setShowCardDetails((current) => !current)}
        aria-expanded={showCardDetails}
        style={{
          width: '100%',
          padding: '0.45rem 0.65rem',
          fontSize: '0.8rem',
          justifyContent: 'space-between'
        }}
      >
        <span className="flex align-center gap-1">
          <Calendar size={14} />
          Deadlines
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            ({paymentsDue.length} payments, {refundDeadlines.length} refunds)
          </span>
        </span>
        <ChevronDown
          size={15}
          style={{
            transform: showCardDetails ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 160ms ease'
          }}
        />
      </button>

      {showCardDetails && (
        <div style={{ marginTop: '1rem' }}>
          {/* Upcoming Payments Section */}
          <div className="mb-4">
            <h4 className="mb-2 flex align-center gap-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              <DollarSign size={14} /> Upcoming Payment Deadlines
            </h4>
            {paymentsDue.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', paddingLeft: '0.25rem' }}>
                No upcoming payments pending.
              </p>
            ) : (
              <div className="flex flex-col gap-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {paymentsDue.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex justify-between align-center px-2 py-1.5"
                    style={{
                      background: 'rgba(255, 255, 255, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      borderLeft: `3px solid ${payment.childColor}`
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '0.5rem' }}>
                      <div className="flex align-center gap-1">
                        <span style={{ fontWeight: 700 }}>{payment.childName}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>•</span>
                        <span style={{
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: '120px',
                          display: 'inline-block',
                          verticalAlign: 'bottom'
                        }} title={payment.campName}>
                          {payment.campName}
                        </span>
                      </div>
                      <div className="flex align-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '1px' }}>
                        <Calendar size={10} />
                        <span>Due: {formatDateStr(payment.dueDate)}</span>
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--accent-terracotta)', whiteSpace: 'nowrap' }}>
                      ${payment.amountDue.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cancellation/Refund Deadlines Section */}
          <div>
            <h4 className="mb-2 flex align-center gap-1" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              <ShieldAlert size={14} /> Refund &amp; Cancellation Dates
            </h4>
            {refundDeadlines.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', paddingLeft: '0.25rem' }}>
                No refund dates set for booked camps.
              </p>
            ) : (
              <div className="flex flex-col gap-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {refundDeadlines.map((refund) => (
                  <div
                    key={refund.id}
                    className="flex justify-between align-center px-2 py-1.5"
                    style={{
                      background: 'rgba(255, 255, 255, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      borderLeft: `3px solid ${refund.childColor}`
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '0.5rem' }}>
                      <div className="flex align-center gap-1">
                        <span style={{ fontWeight: 700 }}>{refund.childName}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>•</span>
                        <span style={{
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: '120px',
                          display: 'inline-block',
                          verticalAlign: 'bottom'
                        }} title={refund.campName}>
                          {refund.campName}
                        </span>
                      </div>
                      <div className="flex align-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '1px' }}>
                        <AlertCircle size={10} />
                        <span>Refund cutoff: {formatDateStr(refund.refundDate)}</span>
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.75rem' }}>
                      (${refund.price})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
