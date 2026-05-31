import React, { useEffect, useMemo, useState } from 'react'
import ParentLayout from '../../components/parent/ParentLayout'
import { getAuth } from '../../utils/session'
import { getAttendance, getReceiptsByStudent, getStudentBasic } from '../../api'

export default function ParentAttendance() {
    const [linked, setLinked] = useState(null)
    const [attendance, setAttendance] = useState([])
    const [receipts, setReceipts] = useState([])
    const [student, setStudent] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        try { const v = localStorage.getItem('parent_linked_student'); if (v) setLinked(JSON.parse(v)) } catch (e) { }
    }, [])

    useEffect(() => {
        async function load() {
            if (!linked) return
            setLoading(true)
            try {
                const { token } = getAuth()
                // Fetch attendance for class/section and filter client-side by studentId
                const items = await getAttendance({ class: linked.class, section: linked.section }, token)
                setAttendance(items || [])
                const recs = await getReceiptsByStudent(linked.id, token)
                setReceipts(recs || [])
                const s = await getStudentBasic(linked.id, token)
                setStudent(s || null)
            } catch (e) { /* ignore */ } finally { setLoading(false) }
        }
        load()
    }, [linked])

    const myAttendance = useMemo(() => {
        if (!linked) return []
        const sid = String(linked.id)
        const rows = []
            ; (attendance || []).forEach(a => {
                const rec = (a.records || []).find(r => String(r.studentId) === sid)
                if (rec) rows.push({ date: a.date, status: rec.status })
            })
        return rows.sort((a, b) => (a.date < b.date ? 1 : -1))
    }, [attendance, linked])

    return (
        <ParentLayout>
            <div className="parent-page">
                <h2>Attendance & Fees</h2>
                {!linked && (
                    <div className="attendance-card">
                        <div className="text-subtle">No student linked. Link a student using the access code.</div>
                        <a href="/parent/link-student" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/parent/link-student'); window.dispatchEvent(new PopStateEvent('popstate')) }} className="btn-primary" style={{ marginTop: 10, display: 'inline-block' }}>Link Student</a>
                    </div>
                )}
                {linked && (
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <div className="text-subtle mb-2">Attendance for <strong className="text-normal">{linked.name}</strong></div>
                            {loading ? <div>Loading...</div> : (
                                <div className="grid gap-2">
                                    {myAttendance.length === 0 && <div className="text-subtle">No attendance found.</div>}
                                    {myAttendance.map((r, i) => (
                                        <div key={i} className="attendance-row">
                                            <div className="text-normal">{r.date}</div>
                                            <div className={r.status === 'present' ? 'status-present' : 'status-absent'}>{r.status}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="text-subtle mb-2">Fees & Payments</div>
                            {loading ? <div>Loading...</div> : (
                                <div className="grid gap-2">
                                    {/* Assigned fees with paid/unpaid status */}
                                    {student && Array.isArray(student.assignedFees) && student.assignedFees.length > 0 ? (
                                        student.assignedFees.map((f, i) => {
                                            const paid = (receipts || []).some(rc => String(rc.term || '').toLowerCase() === String(f.term || '').toLowerCase())
                                            return (
                                                <div key={i} className="fee-row">
                                                    <div className="text-strong">{f.term || 'Fee'} — ₹{f.amount || 0}</div>
                                                    <div className={paid ? 'status-present' : 'status-absent'}>{paid ? 'PAID' : 'UNPAID'}</div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="text-subtle">No assigned fees.</div>
                                    )}

                                    {/* Receipts list */}
                                    {(receipts || []).length > 0 && (
                                        <div style={{ marginTop: 12 }}>
                                            <div className="text-subtle mb-2">Receipts</div>
                                            <div className="grid gap-2">
                                                {(receipts || []).map((rc, i) => (
                                                    <div key={i} className="attendance-card" style={{ margin: 0 }}>
                                                        <div className="text-strong">₹{rc.amount} — {rc.class} {rc.term}</div>
                                                        <div className="text-subtle">Receipt: {rc._id}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ParentLayout>
    )
}
