import React, { useState, useEffect, useCallback, useRef } from "react";

const ADMIN_PASSWORD = "pudding123";
const INITIAL_STATE = { parents: [], transactions: [], publicFund: 0 };

// ─── Firebase Realtime Database ──────────────────────────────────────────────
// 設定好後請把下方的網址換成你的 Firebase 資料庫網址

const FIREBASE_URL = "https://zhenhaiclub-default-rtdb.asia-southeast1.firebasedatabase.app";

async function loadData() {
  try {
    console.log("🔥 Loading from:", FIREBASE_URL);
    const res = await fetch(`${FIREBASE_URL}/data.json`);
    console.log("🔥 Load status:", res.status);
    if (!res.ok) {
      console.error("🔥 Load failed:", res.status, res.statusText);
      return null;
    }
    const json = await res.json();
    console.log("🔥 Load result:", json);
    return json || null;
  } catch (e) {
    console.error("🔥 Load error:", e);
    return null;
  }
}

async function saveData(data) {
  try {
    console.log("🔥 Saving to:", FIREBASE_URL);
    const res = await fetch(`${FIREBASE_URL}/data.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    console.log("🔥 Save status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error("🔥 Save failed:", res.status, text);
      throw new Error(`Save failed: ${res.status}`);
    }
  } catch (e) {
    console.error("🔥 Save error:", e);
    throw e;
  }
}

function formatMoney(n) {
  return "NT$ " + Math.round(n).toLocaleString();
}

function getInitials(name) {
  return name ? name.slice(0, 2) : "??";
}

const AVATAR_COLORS = [
  ["#E6F1FB","#185FA5"],["#E1F5EE","#0F6E56"],["#FAEEDA","#854F0B"],
  ["#FBEAF0","#993556"],["#EAF3DE","#3B6D11"],
];

function Avatar({ name, size = 36 }) {
  const idx = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;
  const [bg, fg] = AVATAR_COLORS[idx];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color: fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 600, flexShrink: 0 }}>
      {getInitials(name)}
    </div>
  );
}

function Badge({ type }) {
  const map = {
    income:   { label: "收費",   bg: "#E1F5EE", color: "#085041" },
    expense:  { label: "支出",   bg: "#FCEBEB", color: "#791F1F" },
    transfer: { label: "轉入公用", bg: "#E6F1FB", color: "#0C447C" },
    donation: { label: "奉獻",   bg: "#FAEEDA", color: "#633806" },
  };
  const s = map[type] || { label: type, bg: "#F1EFE8", color: "#5F5E5A" };
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99,
      background: s.bg, color: s.color, fontWeight: 500 }}>{s.label}</span>
  );
}



// ─── Shared styles ────────────────────────────────────────────────────────────

const card = {
  background: "var(--color-background-primary)",
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: 12, padding: "1rem 1.25rem",
};

const inp = {
  borderRadius: 8, border: "1.5px solid #ccc",
  padding: "10px 12px", fontSize: 15,
  background: "#fff", color: "#111",
  fontFamily: "inherit", width: "100%",
  boxSizing: "border-box",
};

function btn(color, outline = false) {
  return {
    padding: "8px 16px", borderRadius: 8, fontSize: 14,
    border: "1px solid " + (outline ? "#ccc" : color),
    background: outline ? "#fff" : color,
    color: outline ? "#444" : "white",
    cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
  };
}

const empty = { textAlign: "center", padding: "2rem", color: "var(--color-text-secondary)", fontSize: 14 };

// ─── TxList ───────────────────────────────────────────────────────────────────

function TxList({ txs, isAdmin, onDelete }) {
  if (!txs || txs.length === 0) return <div style={empty}>無交易紀錄</div>;
  const icons = { income: "💰", expense: "💸", transfer: "➡️", donation: "🙏" };
  const sign  = { income: "+", expense: "-", transfer: "→", donation: "+" };
  const col   = { income: "#0F6E56", expense: "#A32D2D", transfer: "#185FA5", donation: "#854F0B" };

  return (
    <div>
      {txs.map(t => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10,
          padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ fontSize: 18, width: 28, textAlign: "center" }}>{icons[t.type]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{t.desc}</span>
              <Badge type={t.type} />
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
              {t.date}{t.parentName ? " · " + t.parentName : ""}
            </div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: col[t.type], flexShrink: 0 }}>
            {sign[t.type]}{formatMoney(t.amount)}
          </div>
          {isAdmin && onDelete && (
            <button onClick={() => onDelete(t)} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 15, padding: "2px 6px", color: "#aaa", flexShrink: 0,
            }}>🗑</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ children, onClose }) {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, minHeight: "100%",
      background: "rgba(0,0,0,0.72)", display: "flex",
      alignItems: "flex-start", justifyContent: "center",
      zIndex: 1000, padding: "60px 1rem 2rem",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 16,
        minWidth: 300, maxWidth: 440, width: "100%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.28)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── 搜尋帳戶下拉 ──────────────────────────────────────────────────────────────

function AccountSearch({ state, value, onChange, onAddParent }) {
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef();

  // Close on outside click
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const selectedParent = value && value !== "fund" ? state.parents.find(p => p.id === value) : null;
  const displayText = value === "fund" ? "🏦 公用基金" : selectedParent ? selectedParent.name : "";

  const allOptions = [
    { id: "fund", name: "公用基金", sub: formatMoney(state.publicFund), icon: "🏦" },
    ...state.parents.map(p => ({ id: p.id, name: p.name, sub: formatMoney(p.balance), icon: null })),
  ];

  const filtered = query.trim()
    ? allOptions.filter(o => o.name.includes(query.trim()))
    : allOptions;

  const showAddNew = query.trim() && !state.parents.find(p => p.name === query.trim()) && query.trim() !== "公用基金";

  function select(id) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  function handleInput(e) {
    setQuery(e.target.value);
    setOpen(true);
    onChange(""); // reset source when typing
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          value={open || !value ? query : displayText}
          onChange={handleInput}
          onFocus={() => { setOpen(true); setFocused(true); if (value) setQuery(""); }}
          placeholder="輸入或選擇帳戶..."
          style={{ ...inp, paddingRight: 36 }}
          autoComplete="off"
        />
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 12, pointerEvents: "none" }}>▼</div>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1.5px solid #ccc", borderRadius: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 100,
          maxHeight: 240, overflowY: "auto",
        }}>
          {filtered.length === 0 && !showAddNew && (
            <div style={{ padding: "12px 14px", fontSize: 13, color: "#999" }}>找不到結果</div>
          )}
          {filtered.map(o => (
            <div key={o.id} onClick={() => select(o.id)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", cursor: "pointer", fontSize: 14,
              background: value === o.id ? "#E6F1FB" : "transparent",
              borderBottom: "0.5px solid #f0f0f0",
            }}
              onMouseEnter={e => { if (value !== o.id) e.currentTarget.style.background = "#f7f7f7"; }}
              onMouseLeave={e => { if (value !== o.id) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {o.icon ? <span>{o.icon}</span> : <Avatar name={o.name} size={24} />}
                <span style={{ fontWeight: value === o.id ? 500 : 400 }}>{o.name}</span>
              </div>
              <span style={{ fontSize: 12, color: "#888" }}>{o.sub}</span>
            </div>
          ))}
          {showAddNew && (
            <div onClick={() => { onAddParent(query.trim()); setQuery(""); setOpen(false); }}
              style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14,
                color: "#185FA5", fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
                borderTop: filtered.length ? "1px solid #eee" : "none",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#E6F1FB"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 18 }}>＋</span> 新增家長「{query.trim()}」
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 記帳 Modal ───────────────────────────────────────────────────────────────

function AddTxModal({ state, persist, showToast, onClose }) {
  const [source, setSource]   = useState(""); // parentId (number) or "fund"
  const [txType, setTxType]   = useState(""); // income / expense / transfer / donation
  const [amount, setAmount]   = useState("");
  const [desc, setDesc]       = useState("");

  const today = new Date().toISOString().split("T")[0];
  const selectedParent = state.parents.find(p => p.id === source);
  const isFund = source === "fund";

  const typeOptions = isFund
    ? [{ id: "expense", label: "💸 支出" }, { id: "donation", label: "🙏 奉獻收入" }]
    : [
        { id: "income",   label: "💰 收費收入" },
        { id: "expense",  label: "💸 支出" },
        { id: "transfer", label: "➡️ 轉入公用基金" },
      ];

  function handleAddParent(name) {
    const newParent = { id: Date.now(), name, balance: 0 };
    const ns = { ...state, parents: [...state.parents, newParent] };
    persist(ns);
    setSource(newParent.id);
    setTxType("");
    showToast(`已新增家長「${name}」`);
  }

  function handleSave() {
    const amt = parseFloat(amount);
    if (!source) { showToast("請選擇帳戶", "error"); return; }
    if (!txType) { showToast("請選擇類型", "error"); return; }
    if (!amt || amt <= 0) { showToast("請輸入有效金額", "error"); return; }

    let ns = { ...state, parents: state.parents.map(p => ({ ...p })) };
    const parent = ns.parents.find(p => p.id === source);

    if (txType === "income" && parent) {
      parent.balance += amt;
      ns.transactions = [...ns.transactions, { id: Date.now(), type: "income", parentId: parent.id, parentName: parent.name, amount: amt, desc: desc || "學費收入", date: today }];
      showToast(`${parent.name} 收費 ${formatMoney(amt)}`);
    } else if (txType === "expense" && parent) {
      parent.balance -= amt;
      ns.transactions = [...ns.transactions, { id: Date.now(), type: "expense", parentId: parent.id, parentName: parent.name, amount: amt, desc: desc || "支出", date: today }];
      showToast(`${parent.name} 帳戶支出 ${formatMoney(amt)}`);
    } else if (txType === "expense" && isFund) {
      if (ns.publicFund < amt) { showToast("公用基金餘額不足", "error"); return; }
      ns.publicFund -= amt;
      ns.transactions = [...ns.transactions, { id: Date.now(), type: "expense", parentId: null, parentName: "公用基金", amount: amt, desc: desc || "支出", date: today }];
      showToast(`公用基金支出 ${formatMoney(amt)}`);
    } else if (txType === "transfer" && parent) {
      if (parent.balance < amt) { showToast("家長帳戶餘額不足", "error"); return; }
      parent.balance -= amt;
      ns.publicFund += amt;
      ns.transactions = [...ns.transactions, { id: Date.now(), type: "transfer", parentId: parent.id, parentName: parent.name, amount: amt, desc: desc || "轉入公用基金", date: today }];
      showToast(`轉入公用基金 ${formatMoney(amt)}`);
    } else if (txType === "donation" && isFund) {
      ns.publicFund += amt;
      ns.transactions = [...ns.transactions, { id: Date.now(), type: "donation", parentId: null, parentName: null, amount: amt, desc: desc || "奉獻", date: today }];
      showToast(`奉獻 ${formatMoney(amt)} 入帳`);
    }

    persist(ns);
    onClose();
  }

  const Step = ({ n, label, done }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: done ? "#185FA5" : "#e0e0e0",
        color: done ? "#fff" : "#999", fontSize: 12, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: done ? "#111" : "#999" }}>{label}</div>
    </div>
  );

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: "1.5rem" }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 20 }}>📝 新增記帳</div>

        {/* Step 1: 選帳戶 */}
        <Step n="1" label="選擇帳戶" done={!!source} />
        <div style={{ marginBottom: 20, paddingLeft: 30 }}>
          <AccountSearch
            state={state}
            value={source}
            onChange={(id) => { setSource(id); setTxType(""); }}
            onAddParent={handleAddParent}
          />
          {source && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#185FA5", fontWeight: 500 }}>
              ✓ {source === "fund" ? `公用基金 — ${formatMoney(state.publicFund)}` : `${selectedParent?.name} — ${formatMoney(selectedParent?.balance ?? 0)}`}
            </div>
          )}
        </div>

        {/* Step 2: 選類型 */}
        {source !== "" && (
          <>
            <Step n="2" label="選擇類型" done={!!txType} />
            <div style={{ display: "flex", gap: 8, marginBottom: 20, paddingLeft: 30, flexWrap: "wrap" }}>
              {typeOptions.map(o => (
                <button key={o.id} onClick={() => setTxType(o.id)} style={{
                  ...btn(
                    o.id === "income" ? "#0F6E56" : o.id === "expense" ? "#A32D2D" : o.id === "transfer" ? "#185FA5" : "#854F0B",
                    txType !== o.id
                  ),
                  fontSize: 13, padding: "7px 14px",
                }}>{o.label}</button>
              ))}
            </div>
          </>
        )}

        {/* Step 3: 金額與備註 */}
        {txType && (
          <>
            <Step n="3" label="填寫金額與備註" done={!!amount} />
            <div style={{ paddingLeft: 30, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#333", display: "block", marginBottom: 6 }}>金額 (NT$)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0" style={inp} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#333", display: "block", marginBottom: 6 }}>備註（選填）</label>
                <input value={desc} onChange={e => setDesc(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                  placeholder="例如：鼓棒、場地費..." style={inp} />
              </div>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 24 }}>
          <button onClick={onClose} style={btn("#888", true)}>取消</button>
          <button onClick={handleSave} style={btn("#185FA5")} disabled={!source || !txType || !amount}>
            儲存
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState]           = useState(INITIAL_STATE);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [page, setPage]             = useState("dashboard");
  const [loading, setLoading]       = useState(true);
  const [pwInput, setPwInput]       = useState("");
  const [pwError, setPwError]       = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [showAddTx, setShowAddTx]   = useState(false);
  const [toast, setToast]           = useState(null);
  const [reportText, setReportText] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dbStatus, setDbStatus]     = useState("connecting"); // connecting | ok | error

  useEffect(() => {
    loadData().then(d => {
      if (d) setState(d);
      setDbStatus("ok"); // null means empty DB, still connected
      setLoading(false);
    }).catch(() => { setDbStatus("error"); setLoading(false); });
  }, []);

  const persist = useCallback(async (ns) => {
    setState(ns);
    try {
      await saveData(ns);
      setDbStatus("ok");
    } catch(_) {
      setDbStatus("error");
    }
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const totalIncome   = state.transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense  = state.transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalDonation = state.transactions.filter(t => t.type === "donation").reduce((s, t) => s + t.amount, 0);

  function handleLogin() {
    if (pwInput === ADMIN_PASSWORD) {
      setIsAdmin(true); setShowPwModal(false); setPwInput(""); setPwError(false);
      showToast("管理員登入成功");
    } else { setPwError(true); }
  }

  function doDeleteTx(tx) {
    let ns = { ...state, parents: state.parents.map(p => ({ ...p })) };
    const parent = ns.parents.find(p => p.id === tx.parentId);
    if (tx.type === "income" && parent) parent.balance -= tx.amount;
    else if (tx.type === "expense" && parent) parent.balance += tx.amount;
    else if (tx.type === "expense" && tx.parentName === "公用基金") ns.publicFund += tx.amount;
    else if (tx.type === "transfer" && parent) { parent.balance += tx.amount; ns.publicFund -= tx.amount; }
    else if (tx.type === "donation") ns.publicFund -= tx.amount;
    ns.transactions = ns.transactions.filter(t => t.id !== tx.id);
    persist(ns); setDeleteConfirm(null); showToast("已刪除並還原帳目");
  }

  function doDeleteParent(p) {
    persist({
      ...state,
      parents: state.parents.filter(x => x.id !== p.id),
      transactions: state.transactions.filter(t => t.parentId !== p.id),
    });
    setDeleteConfirm(null); showToast(`已刪除 ${p.name}`);
  }

  function generateReport() {
    const lines = [
      "📊 鎮海club帳務報表",
      "─────────────────",
      `🏦 公用基金：${formatMoney(state.publicFund)}`,
      `💰 總收入（學費）：${formatMoney(totalIncome)}`,
      `📦 奉獻收入：${formatMoney(totalDonation)}`,
      `💸 總支出：${formatMoney(totalExpense)}`,
      "─────────────────",
      "👨‍👩‍👧 家長帳戶：",
      ...state.parents.map(p => `  ${p.name}：${formatMoney(p.balance)}`),
      "─────────────────",
      "📋 最近10筆交易：",
      ...[...state.transactions].reverse().slice(0, 10).map(t => {
        const sign = t.type === "expense" ? "-" : "+";
        return `  ${t.date} ${t.parentName ? "[" + t.parentName + "] " : ""}${t.desc}  ${sign}${formatMoney(t.amount)}`;
      }),
    ];
    setReportText(lines.join("\n")); setPage("report");
  }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
      <div style={{ fontSize: 24 }}>⏳</div>
      <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>連線中...</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif", maxWidth: 680, margin: "0 auto", padding: "0.75rem 0.75rem", position: "relative", boxSizing: "border-box" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "success" ? "#0F6E56" : "#A32D2D",
          color: "white", padding: "10px 20px", borderRadius: 99,
          fontSize: 13, fontWeight: 500, zIndex: 9999 }}>{toast.msg}</div>
      )}

      {/* DB Status Bar */}
      {dbStatus === "error" && (
        <div style={{ background: "#FFF3CD", border: "1px solid #FFCA28", borderRadius: 8,
          padding: "8px 14px", marginBottom: 10, fontSize: 13, color: "#7B5800",
          display: "flex", alignItems: "center", gap: 8 }}>
          ⚠️ <strong>無法連線到資料庫</strong>——請確認 Firebase 設定，資料目前不會被儲存。
        </div>
      )}
      {dbStatus === "ok" && (
        <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 8,
          padding: "6px 14px", marginBottom: 10, fontSize: 12, color: "#2E7D32",
          display: "flex", alignItems: "center", gap: 6 }}>
          🟢 已連線至雲端資料庫
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>🎵 鎮海club記帳</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
              {new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {isAdmin && (
              <button onClick={() => setShowAddTx(true)} style={{ ...btn("#0F6E56"), padding: "8px 14px", fontSize: 14, fontWeight: 600 }}>
                ＋ 記帳
              </button>
            )}
            {!isAdmin ? (
              <button onClick={() => setShowPwModal(true)} style={{ ...btn("#185FA5"), padding: "8px 12px", fontSize: 13 }}>🔐 登入</button>
            ) : (
              <button onClick={() => { setIsAdmin(false); showToast("已登出", "error"); }}
                style={{ ...btn("#888", true), padding: "6px 10px", fontSize: 12 }}>登出</button>
            )}
          </div>
        </div>
        {isAdmin && (
          <div style={{ fontSize: 12, color: "#0F6E56", background: "#E1F5EE", borderRadius: 8,
            padding: "5px 10px", display: "inline-block" }}>✓ 管理員模式</div>
        )}
      </div>

      {/* Nav — bottom tab bar style on mobile */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 4, marginBottom: "1.25rem",
        background: "var(--color-background-secondary)",
        borderRadius: 10, padding: 4,
      }}>
        {[
          { id: "dashboard",    label: "儀表板",  icon: "📊" },
          { id: "parents",      label: "家長帳戶", icon: "👥" },
          { id: "transactions", label: "交易紀錄", icon: "📋" },
          { id: "report",       label: "報表",    icon: "📄" },
        ].map(n => (
          <button key={n.id} onClick={() => { setPage(n.id); setReportText(null); }} style={{
            padding: "7px 4px", borderRadius: 8, fontSize: 11, cursor: "pointer",
            border: "none",
            background: page === n.id ? "var(--color-background-primary)" : "transparent",
            color: page === n.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            fontWeight: page === n.id ? 600 : 400,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            boxShadow: page === n.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}>
            <span style={{ fontSize: 18 }}>{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </div>

      {page === "dashboard"    && <Dashboard state={state} totalIncome={totalIncome} totalExpense={totalExpense} totalDonation={totalDonation} isAdmin={isAdmin} setShowAddTx={setShowAddTx} generateReport={generateReport} />}
      {page === "parents"      && <Parents state={state} persist={persist} isAdmin={isAdmin} showToast={showToast} setDeleteConfirm={setDeleteConfirm} setShowAddTx={setShowAddTx} onDeleteTx={setDeleteConfirm} />}
      {page === "transactions" && <Transactions state={state} isAdmin={isAdmin} onDelete={setDeleteConfirm} />}
      {page === "report"       && <Report state={state} totalIncome={totalIncome} totalExpense={totalExpense} totalDonation={totalDonation} reportText={reportText} setReportText={setReportText} generateReport={generateReport} />}

      {/* 記帳 Modal */}
      {showAddTx && <AddTxModal state={state} persist={persist} showToast={showToast} onClose={() => setShowAddTx(false)} />}

      {/* 密碼 Modal */}
      {showPwModal && (
        <Modal onClose={() => { setShowPwModal(false); setPwError(false); setPwInput(""); }}>
          <div style={{ padding: "1.75rem" }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: "#111" }}>🔐 管理員登入</div>
            <input type="password" placeholder="請輸入管理員密碼" value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{ ...inp, marginBottom: 8 }} autoFocus />
            {pwError && <div style={{ color: "#A32D2D", fontSize: 13, marginBottom: 8 }}>密碼錯誤，請再試一次</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowPwModal(false); setPwInput(""); setPwError(false); }} style={btn("#888", true)}>取消</button>
              <button onClick={handleLogin} style={btn("#185FA5")}>登入</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 刪除確認 Modal */}
      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <div style={{ padding: "1.75rem" }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 12 }}>
              {deleteConfirm._type === "parent" ? "刪除家長帳戶？" : "確認刪除交易？"}
            </div>
            <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "12px", marginBottom: 12, fontSize: 14, color: "#333" }}>
              {deleteConfirm._type === "parent" ? (
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{deleteConfirm.name}</div>
                  <div style={{ color: "#666" }}>餘額：{formatMoney(deleteConfirm.balance)}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{deleteConfirm.desc}</div>
                  <div style={{ color: "#666" }}>{deleteConfirm.date} · {deleteConfirm.parentName || "公用基金"} · {formatMoney(deleteConfirm.amount)}</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, color: "#A32D2D", marginBottom: 20 }}>⚠️ 此操作無法復原{deleteConfirm._type !== "parent" && "，金額將自動還原"}。</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteConfirm(null)} style={btn("#888", true)}>取消</button>
              <button onClick={() => deleteConfirm._type === "parent" ? doDeleteParent(deleteConfirm) : doDeleteTx(deleteConfirm)} style={btn("#A32D2D")}>確認刪除</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ state, totalIncome, totalExpense, totalDonation, isAdmin, setShowAddTx, generateReport }) {
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#E6F1FB,#EAF3DE)", border: "0.5px solid #B5D4F4",
        borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1.25rem",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: "#185FA5", marginBottom: 4 }}>🏦 公用基金</div>
          <div style={{ fontSize: 30, fontWeight: 500, color: "#0C447C" }}>{formatMoney(state.publicFund)}</div>
        </div>
        {isAdmin && <button onClick={() => setShowAddTx(true)} style={btn("#0F6E56")}>＋ 記帳</button>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: "1.5rem" }}>
        {[
          { label: "學費收入", value: formatMoney(totalIncome),   color: "#0F6E56" },
          { label: "奉獻收入", value: formatMoney(totalDonation), color: "#854F0B" },
          { label: "總支出",   value: formatMoney(totalExpense),  color: "#A32D2D" },
        ].map(m => (
          <div key={m.label} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "0.875rem" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 17, fontWeight: 500, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>家長帳戶餘額</div>
      {state.parents.length === 0 ? <div style={empty}>尚無家長帳戶</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: "1.5rem" }}>
          {state.parents.map(p => (
            <div key={p.id} style={{ ...card, padding: "0.875rem" }}>
              <Avatar name={p.name} size={32} />
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4, color: p.balance >= 0 ? "#0F6E56" : "#A32D2D" }}>{formatMoney(p.balance)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>最近交易</div>
      <TxList txs={[...state.transactions].reverse().slice(0, 5)} />

      <div style={{ marginTop: "1.25rem" }}>
        <button onClick={generateReport} style={{ ...btn("#185FA5"), width: "100%", padding: "10px" }}>
          📄 產生 LINE 報表
        </button>
      </div>
    </div>
  );
}

// ─── Parents ──────────────────────────────────────────────────────────────────

function Parents({ state, persist, isAdmin, showToast, setDeleteConfirm, setShowAddTx, onDeleteTx }) {
  const [search, setSearch]       = useState("");
  const [newName, setNewName]     = useState("");
  const [selected, setSelected]   = useState(null); // parentId

  function addParent() {
    const name = newName.trim();
    if (!name) return;
    if (state.parents.find(p => p.name === name)) { showToast("家長名稱已存在", "error"); return; }
    persist({ ...state, parents: [...state.parents, { id: Date.now(), name, balance: 0 }] });
    setNewName(""); showToast(`已新增 ${name}`);
  }

  const filtered = state.parents.filter(p => p.name.includes(search));
  const selectedParent = selected ? state.parents.find(p => p.id === selected) : null;

  // Detail view
  if (selectedParent) {
    const txs = [...state.transactions.filter(t => t.parentId === selectedParent.id)].reverse();
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ ...btn("#888", true), marginBottom: "1rem", fontSize: 13 }}>
          ← 返回列表
        </button>
        <div style={{ ...card, marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={selectedParent.name} size={44} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{selectedParent.name}</div>
                <div style={{ fontSize: 22, fontWeight: 500, marginTop: 2, color: selectedParent.balance >= 0 ? "#0F6E56" : "#A32D2D" }}>{formatMoney(selectedParent.balance)}</div>
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => setDeleteConfirm({ ...selectedParent, _type: "parent" })} style={{ ...btn("#888", true), fontSize: 13 }}>🗑 刪除帳戶</button>
            )}
          </div>
        </div>

        {isAdmin && (
          <button onClick={() => setShowAddTx(true)} style={{ ...btn("#0F6E56"), width: "100%", padding: "10px", marginBottom: "1rem" }}>
            ＋ 新增交易
          </button>
        )}

        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>交易明細（{txs.length} 筆）</div>
        <TxList txs={txs} isAdmin={isAdmin} onDelete={tx => onDeleteTx({ ...tx, _type: "tx" })} />
      </div>
    );
  }

  // List view
  return (
    <div>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: "1rem" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#aaa" }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜尋家長姓名..."
          style={{ ...inp, paddingLeft: 36 }} />
      </div>

      {/* Add parent (admin) */}
      {isAdmin && (
        <div style={{ ...card, marginBottom: "1rem" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>新增家長</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addParent()}
              placeholder="家長姓名" style={{ ...inp, flex: 1 }} />
            <button onClick={addParent} style={btn("#185FA5")}>新增</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? <div style={empty}>{search ? "找不到符合的家長" : "尚無家長帳戶"}</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => setSelected(p.id)} style={{
              ...card, display: "flex", alignItems: "center", gap: 12,
              cursor: "pointer", transition: "border-color 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-border-primary)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border-tertiary)"}
            >
              <Avatar name={p.name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  {state.transactions.filter(t => t.parentId === p.id).length} 筆交易
                </div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 500, color: p.balance >= 0 ? "#0F6E56" : "#A32D2D" }}>
                {formatMoney(p.balance)}
              </div>
              <div style={{ color: "#aaa", fontSize: 16 }}>›</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────

function Transactions({ state, isAdmin, onDelete }) {
  const [filter, setFilter] = useState("all");
  const filtered = [...state.transactions].reverse().filter(t => filter === "all" || t.type === filter);

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: "1rem", flexWrap: "wrap" }}>
        {[
          { id: "all", label: "全部" }, { id: "income", label: "收費" },
          { id: "expense", label: "支出" }, { id: "transfer", label: "轉帳" },
          { id: "donation", label: "奉獻" },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "5px 12px", borderRadius: 99, fontSize: 12, cursor: "pointer",
            border: "0.5px solid " + (filter === f.id ? "var(--color-border-primary)" : "var(--color-border-tertiary)"),
            background: filter === f.id ? "var(--color-background-secondary)" : "transparent",
            color: filter === f.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          }}>{f.label}</button>
        ))}
      </div>
      {isAdmin && filtered.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>管理員模式：點 🗑 可刪除</div>
      )}
      <TxList txs={filtered} isAdmin={isAdmin} onDelete={tx => onDelete({ ...tx, _type: "tx" })} />
    </div>
  );
}

// ─── Report ───────────────────────────────────────────────────────────────────

function Report({ state, totalIncome, totalExpense, totalDonation, reportText, generateReport }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(reportText || "").then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  const Row = ({ label, value, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "9px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
      <div style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color }}>{value}</div>
    </div>
  );

  return (
    <div>
      <div style={{ ...card, marginBottom: "1rem" }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>📊 帳務摘要</div>
        <Row label="🏦 公用基金餘額" value={formatMoney(state.publicFund)} color="#0C447C" />
        <Row label="💰 學費總收入" value={formatMoney(totalIncome)} color="#0F6E56" />
        <Row label="📦 奉獻收入" value={formatMoney(totalDonation)} color="#854F0B" />
        <Row label="💸 總支出" value={formatMoney(totalExpense)} color="#A32D2D" />
        <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12, marginTop: 4 }}>
          <Row label="家長帳戶總餘額" value={formatMoney(state.parents.reduce((s, p) => s + p.balance, 0))} color="#185FA5" />
        </div>
      </div>

      <div style={{ ...card, marginBottom: "1rem" }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>👨‍👩‍👧 家長帳戶明細</div>
        {state.parents.length === 0 ? <div style={empty}>尚無資料</div> : state.parents.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{p.name}</span>
            <span style={{ fontSize: 15, fontWeight: 500, color: p.balance >= 0 ? "#0F6E56" : "#A32D2D" }}>{formatMoney(p.balance)}</span>
          </div>
        ))}
      </div>

      <button onClick={generateReport} style={{ ...btn("#185FA5"), width: "100%", padding: 10, marginBottom: 12 }}>
        📋 產生 LINE 分享文字
      </button>

      {reportText && (
        <div style={{ ...card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>LINE 分享文字</div>
            <button onClick={copy} style={btn(copied ? "#0F6E56" : "#185FA5")}>{copied ? "✓ 已複製" : "複製"}</button>
          </div>
          <pre style={{ fontSize: 13, whiteSpace: "pre-wrap", background: "var(--color-background-secondary)",
            padding: 12, borderRadius: 8, color: "var(--color-text-primary)", lineHeight: 1.7 }}>{reportText}</pre>
        </div>
      )}
    </div>
  );
}
