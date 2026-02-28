import { useState, useEffect, useRef, useCallback } from "react";

// ─── Simulated Market Data ───────────────────────────────────────────────────
const INSTRUMENTS = [
  { symbol: "BTC-PERP", base: 67840, leverage: 125, tick: 0.5 },
  { symbol: "ETH-PERP", base: 3520, leverage: 100, tick: 0.01 },
  { symbol: "SOL-PERP", base: 185.4, leverage: 50, tick: 0.01 },
  { symbol: "BNB-PERP", base: 592, leverage: 50, tick: 0.01 },
  { symbol: "XRP-PERP", base: 0.614, leverage: 50, tick: 0.0001 },
];

function generateCandles(basePrice, count = 80) {
  const candles = [];
  let price = basePrice;
  const now = Date.now();
  for (let i = count; i >= 0; i--) {
    const change = (Math.random() - 0.48) * price * 0.008;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * price * 0.003;
    const low = Math.min(open, close) - Math.random() * price * 0.003;
    const vol = Math.random() * 500 + 100;
    candles.push({ t: now - i * 60000, o: open, h: high, l: low, c: close, v: vol });
    price = close;
  }
  return candles;
}

function fmt(n, d = 2) {
  if (n === undefined || n === null) return "-";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ─── Mini Candlestick Chart ───────────────────────────────────────────────────
function CandleChart({ candles, width = 700, height = 220 }) {
  if (!candles || candles.length === 0) return null;
  const pad = { top: 10, right: 10, bottom: 24, left: 58 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;
  const n = candles.length;
  const prices = candles.flatMap(c => [c.h, c.l]);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const py = v => pad.top + H - ((v - minP) / range) * H;
  const cw = Math.max(2, Math.floor(W / n) - 1);
  const cx = i => pad.left + i * (W / n) + (W / n) / 2;

  const priceLabels = [];
  for (let k = 0; k <= 4; k++) {
    const v = minP + (range * k) / 4;
    priceLabels.push({ y: py(v), label: fmt(v, v > 100 ? 0 : 2) });
  }

  const timeLabels = [];
  [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1].forEach(i => {
    if (candles[i]) {
      const d = new Date(candles[i].t);
      timeLabels.push({ x: cx(i), label: `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}` });
    }
  });

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {priceLabels.map((p, i) => (
        <g key={i}>
          <line x1={pad.left} y1={p.y} x2={pad.left + W} y2={p.y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
          <text x={pad.left - 4} y={p.y + 4} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="'JetBrains Mono', monospace">{p.label}</text>
        </g>
      ))}
      {timeLabels.map((t, i) => (
        <text key={i} x={t.x} y={height - 4} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="'JetBrains Mono', monospace">{t.label}</text>
      ))}
      {candles.map((c, i) => {
        const bull = c.c >= c.o;
        const color = bull ? "#00d4a8" : "#ff4d6d";
        const x = cx(i);
        const top = py(Math.max(c.o, c.c));
        const bot = py(Math.min(c.o, c.c));
        const bH = Math.max(1, bot - top);
        return (
          <g key={i}>
            <line x1={x} y1={py(c.h)} x2={x} y2={py(c.l)} stroke={color} strokeWidth="1" />
            <rect x={x - cw / 2} y={top} width={cw} height={bH} fill={color} opacity="0.9" rx="0.5" />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Order Book Row ───────────────────────────────────────────────────────────
function OrderBook({ asks, bids, mid }) {
  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", color: "#475569", padding: "4px 8px 2px", fontSize: 10 }}>
        <span>Price (USD)</span><span style={{ textAlign: "center" }}>Size</span><span style={{ textAlign: "right" }}>Total</span>
      </div>
      {asks.slice(0, 8).reverse().map((a, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "1.5px 8px", position: "relative" }}>
          <div style={{ position: "absolute", right: 0, top: 0, height: "100%", background: "rgba(255,77,109,0.08)", width: `${Math.min(100, a.sz / 5)}%` }} />
          <span style={{ color: "#ff4d6d", zIndex: 1 }}>{fmt(a.p, a.p > 10 ? 1 : 4)}</span>
          <span style={{ textAlign: "center", color: "#94a3b8", zIndex: 1 }}>{fmt(a.sz, 2)}</span>
          <span style={{ textAlign: "right", color: "#64748b", zIndex: 1 }}>{fmt(a.total, 0)}</span>
        </div>
      ))}
      <div style={{ padding: "5px 8px", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b", margin: "2px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#f8fafc", fontSize: 14, fontWeight: "700" }}>{fmt(mid, mid > 10 ? 1 : 4)}</span>
        <span style={{ color: "#64748b", fontSize: 10 }}>Mark</span>
      </div>
      {bids.slice(0, 8).map((b, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "1.5px 8px", position: "relative" }}>
          <div style={{ position: "absolute", right: 0, top: 0, height: "100%", background: "rgba(0,212,168,0.08)", width: `${Math.min(100, b.sz / 5)}%` }} />
          <span style={{ color: "#00d4a8", zIndex: 1 }}>{fmt(b.p, b.p > 10 ? 1 : 4)}</span>
          <span style={{ textAlign: "center", color: "#94a3b8", zIndex: 1 }}>{fmt(b.sz, 2)}</span>
          <span style={{ textAlign: "right", color: "#64748b", zIndex: 1 }}>{fmt(b.total, 0)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function FuturesTradingApp() {
  const [selectedInstrument, setSelectedInstrument] = useState(0);
  const [candles, setCandles] = useState({});
  const [prices, setPrices] = useState({});
  const [orderBook, setOrderBook] = useState({ asks: [], bids: [] });
  const [side, setSide] = useState("buy");
  const [orderType, setOrderType] = useState("limit");
  const [orderPrice, setOrderPrice] = useState("");
  const [orderQty, setOrderQty] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [positions, setPositions] = useState([
    { symbol: "BTC-PERP", side: "long", size: 0.05, entry: 67200, liq: 62800, pnl: null },
    { symbol: "ETH-PERP", side: "short", size: 0.8, entry: 3580, liq: 3760, pnl: null },
  ]);
  const [orders, setOrders] = useState([
    { id: "ORD001", symbol: "BTC-PERP", side: "buy", type: "limit", price: 66500, qty: 0.1, status: "Open" },
    { id: "ORD002", symbol: "SOL-PERP", side: "sell", type: "limit", price: 190, qty: 5, status: "Open" },
  ]);
  const [balance, setBalance] = useState(25000);
  const [activeTab, setActiveTab] = useState("positions");
  const [alert, setAlert] = useState(null);
  const tickRef = useRef();
  const inst = INSTRUMENTS[selectedInstrument];

  // Init candles
  useEffect(() => {
    const c = {};
    const p = {};
    INSTRUMENTS.forEach(ins => {
      c[ins.symbol] = generateCandles(ins.base);
      p[ins.symbol] = { price: ins.base, change: 0, pct: 0, vol: (Math.random() * 1e9 + 5e8).toFixed(0) };
    });
    setCandles(c);
    setPrices(p);
  }, []);

  // Tick - update prices & candles
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        INSTRUMENTS.forEach(ins => {
          const old = prev[ins.symbol];
          if (!old) return;
          const delta = (Math.random() - 0.49) * ins.base * 0.0008;
          const np = old.price + delta;
          const pct = ((np - ins.base) / ins.base) * 100;
          next[ins.symbol] = { ...old, price: np, change: delta, pct };
        });
        return next;
      });

      setCandles(prev => {
        const next = { ...prev };
        INSTRUMENTS.forEach(ins => {
          const arr = prev[ins.symbol];
          if (!arr || arr.length === 0) return;
          const last = arr[arr.length - 1];
          const delta = (Math.random() - 0.49) * ins.base * 0.0008;
          const newClose = last.c + delta;
          const updated = { ...last, c: newClose, h: Math.max(last.h, newClose), l: Math.min(last.l, newClose) };
          const shouldAdd = Date.now() - last.t > 60000;
          if (shouldAdd) {
            next[ins.symbol] = [...arr.slice(-79), updated, { t: Date.now(), o: newClose, h: newClose, l: newClose, c: newClose, v: Math.random() * 200 }];
          } else {
            next[ins.symbol] = [...arr.slice(0, -1), updated];
          }
        });
        return next;
      });

      // Update position PnL
      setPositions(prev => prev.map(pos => {
        setPrices(px => {
          const cp = px[pos.symbol]?.price;
          if (cp) {
            const pnl = pos.side === "long" ? (cp - pos.entry) * pos.size : (pos.entry - cp) * pos.size;
            Object.assign(pos, { pnl });
          }
          return px;
        });
        return pos;
      }));
    }, 600);
    return () => clearInterval(tickRef.current);
  }, []);

  // Build order book from current price
  useEffect(() => {
    const p = prices[inst.symbol]?.price || inst.base;
    const asks = [], bids = [];
    let totalA = 0, totalB = 0;
    for (let i = 1; i <= 8; i++) {
      const sz = Math.random() * 4 + 0.2;
      totalA += sz * (p + i * inst.tick * 2);
      asks.push({ p: p + i * inst.tick * 2, sz: parseFloat(sz.toFixed(3)), total: totalA });
    }
    for (let i = 1; i <= 8; i++) {
      const sz = Math.random() * 4 + 0.2;
      totalB += sz * (p - i * inst.tick * 2);
      bids.push({ p: p - i * inst.tick * 2, sz: parseFloat(sz.toFixed(3)), total: totalB });
    }
    setOrderBook({ asks, bids });
  }, [prices, selectedInstrument]);

  const showAlert = (msg, type = "success") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 2500);
  };

  const placeOrder = () => {
    if (!orderQty || parseFloat(orderQty) <= 0) return showAlert("Enter valid quantity", "error");
    const price = orderType === "market" ? prices[inst.symbol]?.price : parseFloat(orderPrice);
    if (orderType === "limit" && (!orderPrice || isNaN(price))) return showAlert("Enter valid price", "error");
    const id = "ORD" + Math.random().toString(36).slice(2, 7).toUpperCase();
    if (orderType === "market") {
      const pnlDir = side === "buy" ? 1 : -1;
      setPositions(prev => {
        const existing = prev.find(p => p.symbol === inst.symbol && ((side === "buy" && p.side === "long") || (side === "sell" && p.side === "short")));
        if (existing) {
          return prev.map(p => p === existing ? { ...p, size: p.size + parseFloat(orderQty) } : p);
        }
        return [...prev, { symbol: inst.symbol, side: side === "buy" ? "long" : "short", size: parseFloat(orderQty), entry: price, liq: price * (side === "buy" ? 0.9 : 1.1), pnl: 0 }];
      });
      showAlert(`Market ${side.toUpperCase()} executed @ ${fmt(price, price > 10 ? 2 : 4)}`, "success");
    } else {
      setOrders(prev => [...prev, { id, symbol: inst.symbol, side, type: "limit", price, qty: parseFloat(orderQty), status: "Open" }]);
      showAlert(`Limit order placed: ${side.toUpperCase()} ${orderQty} ${inst.symbol} @ ${fmt(price)}`, "success");
    }
    setOrderQty("");
    setOrderPrice("");
  };

  const cancelOrder = id => {
    setOrders(prev => prev.filter(o => o.id !== id));
    showAlert("Order cancelled", "info");
  };

  const closePosition = sym => {
    setPositions(prev => prev.filter(p => p.symbol !== sym));
    showAlert(`Position closed: ${sym}`, "success");
  };

  const currentPrice = prices[inst.symbol]?.price || inst.base;
  const currentPct = prices[inst.symbol]?.pct || 0;
  const currentCandles = candles[inst.symbol] || [];
  const margin = orderQty && orderPrice ? (parseFloat(orderQty) * parseFloat(orderPrice)) / leverage : 0;
  const totalPnl = positions.reduce((s, p) => s + (p.pnl || 0), 0);

  return (
    <div style={{
      background: "#060d1a",
      color: "#e2e8f0",
      minHeight: "100vh",
      fontFamily: "'Syne', 'JetBrains Mono', sans-serif",
      fontSize: 13,
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0d1729; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        .btn { cursor: pointer; border: none; border-radius: 6px; font-family: inherit; font-weight: 600; transition: all 0.15s; }
        .btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .inp { background: #0d1729; border: 1px solid #1e3a5f; border-radius: 6px; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; font-size: 13px; padding: 8px 10px; width: 100%; outline: none; transition: border-color 0.2s; }
        .inp:focus { border-color: #00d4a8; }
        .panel { background: #0a1628; border: 1px solid #1e293b; border-radius: 10px; overflow: hidden; }
        .tab { cursor: pointer; padding: 6px 14px; border-radius: 5px; font-size: 12px; font-weight: 600; color: #64748b; transition: all 0.15s; }
        .tab.active { background: #1e3a5f; color: #e2e8f0; }
        .pnl-pos { color: #00d4a8; }
        .pnl-neg { color: #ff4d6d; }
        @keyframes slideIn { from { opacity:0; transform: translateY(-8px); } to { opacity:1; transform: translateY(0); } }
        .alert { animation: slideIn 0.2s ease; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .live { animation: pulse 1.5s infinite; }
      `}</style>

      {/* Alert */}
      {alert && (
        <div className="alert" style={{
          position: "fixed", top: 16, right: 16, zIndex: 999,
          background: alert.type === "success" ? "#00d4a820" : alert.type === "error" ? "#ff4d6d20" : "#3b82f620",
          border: `1px solid ${alert.type === "success" ? "#00d4a8" : alert.type === "error" ? "#ff4d6d" : "#3b82f6"}`,
          borderRadius: 8, padding: "10px 16px", maxWidth: 300,
          color: alert.type === "success" ? "#00d4a8" : alert.type === "error" ? "#ff4d6d" : "#60a5fa",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12
        }}>{alert.msg}</div>
      )}

      {/* Top Bar */}
      <div style={{ background: "#080e1c", borderBottom: "1px solid #1e293b", padding: "0 16px", display: "flex", alignItems: "center", height: 50, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, #00d4a8, #0066ff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff" }}>F</div>
          <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16, letterSpacing: "0.05em", color: "#f8fafc" }}>FUTEX</span>
          <span style={{ fontSize: 10, color: "#00d4a8", fontFamily: "'JetBrains Mono', monospace" }} className="live">● LIVE</span>
        </div>

        <div style={{ display: "flex", gap: 4, overflowX: "auto", flex: 1 }}>
          {INSTRUMENTS.map((ins, i) => {
            const p = prices[ins.symbol];
            const pct = p?.pct || 0;
            return (
              <button key={i} className="btn" onClick={() => setSelectedInstrument(i)} style={{
                background: selectedInstrument === i ? "#1e3a5f" : "transparent",
                border: selectedInstrument === i ? "1px solid #2d5080" : "1px solid transparent",
                color: selectedInstrument === i ? "#e2e8f0" : "#64748b",
                padding: "4px 10px", borderRadius: 6, fontSize: 11, whiteSpace: "nowrap",
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                {ins.symbol} <span style={{ color: pct >= 0 ? "#00d4a8" : "#ff4d6d" }}>{pct >= 0 ? "+" : ""}{pct.toFixed(2)}%</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
          <span>Balance: <span style={{ color: "#e2e8f0" }}>${fmt(balance)}</span></span>
          <span>PnL: <span className={totalPnl >= 0 ? "pnl-pos" : "pnl-neg"}>{totalPnl >= 0 ? "+" : ""}{fmt(totalPnl)}</span></span>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr 280px", gap: 8, padding: 8, overflow: "hidden", height: "calc(100vh - 50px)" }}>

        {/* Left: Order Book */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid #1e293b", fontFamily: "Syne", fontWeight: 700, fontSize: 12, color: "#94a3b8", letterSpacing: "0.1em" }}>ORDER BOOK</div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <OrderBook asks={orderBook.asks} bids={orderBook.bids} mid={currentPrice} />
          </div>
        </div>

        {/* Center: Chart + Bottom */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
          {/* Chart Panel */}
          <div className="panel" style={{ flex: "0 0 auto" }}>
            <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18 }}>{inst.symbol}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 500, color: currentPct >= 0 ? "#00d4a8" : "#ff4d6d" }}>{fmt(currentPrice, currentPrice > 100 ? 1 : 4)}</span>
              <span style={{ fontSize: 12, color: currentPct >= 0 ? "#00d4a8" : "#ff4d6d", fontFamily: "'JetBrains Mono', monospace" }}>{currentPct >= 0 ? "+" : ""}{currentPct.toFixed(2)}%</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#64748b" }}>
                <span>24h Vol: <span style={{ color: "#94a3b8" }}>${Number(prices[inst.symbol]?.vol || 0).toLocaleString()}</span></span>
                <span>Max Lev: <span style={{ color: "#94a3b8" }}>{inst.leverage}x</span></span>
              </div>
            </div>
            <div style={{ padding: "8px 4px 4px" }}>
              <CandleChart candles={currentCandles} />
            </div>
          </div>

          {/* Positions / Orders */}
          <div className="panel" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #1e293b", display: "flex", gap: 6 }}>
              {["positions", "orders", "history"].map(t => (
                <span key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
              ))}
              <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#64748b", alignSelf: "center" }}>
                {activeTab === "positions" ? `${positions.length} open` : activeTab === "orders" ? `${orders.length} pending` : ""}
              </span>
            </div>
            <div style={{ overflow: "auto", flex: 1 }}>
              {activeTab === "positions" && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                  <thead>
                    <tr style={{ color: "#475569", borderBottom: "1px solid #1e293b" }}>
                      {["Symbol", "Side", "Size", "Entry", "Mark", "Liq.", "PnL", ""].map(h => (
                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.length === 0 && (
                      <tr><td colSpan="8" style={{ padding: "20px", textAlign: "center", color: "#475569" }}>No open positions</td></tr>
                    )}
                    {positions.map((pos, i) => {
                      const mark = prices[pos.symbol]?.price || 0;
                      const pnl = pos.side === "long" ? (mark - pos.entry) * pos.size : (pos.entry - mark) * pos.size;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #0f1e2e" }}>
                          <td style={{ padding: "7px 10px", color: "#e2e8f0" }}>{pos.symbol}</td>
                          <td style={{ padding: "7px 10px", color: pos.side === "long" ? "#00d4a8" : "#ff4d6d", fontWeight: 600 }}>{pos.side.toUpperCase()}</td>
                          <td style={{ padding: "7px 10px" }}>{pos.size}</td>
                          <td style={{ padding: "7px 10px" }}>{fmt(pos.entry, pos.entry > 10 ? 1 : 4)}</td>
                          <td style={{ padding: "7px 10px" }}>{fmt(mark, mark > 10 ? 1 : 4)}</td>
                          <td style={{ padding: "7px 10px", color: "#ff4d6d" }}>{fmt(pos.liq, pos.liq > 10 ? 1 : 4)}</td>
                          <td style={{ padding: "7px 10px" }} className={pnl >= 0 ? "pnl-pos" : "pnl-neg"}>{pnl >= 0 ? "+" : ""}{fmt(pnl)}</td>
                          <td style={{ padding: "7px 8px" }}>
                            <button className="btn" onClick={() => closePosition(pos.symbol)} style={{ background: "#1e293b", color: "#94a3b8", padding: "3px 8px", fontSize: 10 }}>Close</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {activeTab === "orders" && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                  <thead>
                    <tr style={{ color: "#475569", borderBottom: "1px solid #1e293b" }}>
                      {["ID", "Symbol", "Side", "Type", "Price", "Qty", "Status", ""].map(h => (
                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 400 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 && (
                      <tr><td colSpan="8" style={{ padding: "20px", textAlign: "center", color: "#475569" }}>No pending orders</td></tr>
                    )}
                    {orders.map((o, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #0f1e2e" }}>
                        <td style={{ padding: "7px 10px", color: "#64748b" }}>{o.id}</td>
                        <td style={{ padding: "7px 10px", color: "#e2e8f0" }}>{o.symbol}</td>
                        <td style={{ padding: "7px 10px", color: o.side === "buy" ? "#00d4a8" : "#ff4d6d", fontWeight: 600 }}>{o.side.toUpperCase()}</td>
                        <td style={{ padding: "7px 10px", color: "#94a3b8" }}>{o.type}</td>
                        <td style={{ padding: "7px 10px" }}>{fmt(o.price, o.price > 10 ? 2 : 4)}</td>
                        <td style={{ padding: "7px 10px" }}>{o.qty}</td>
                        <td style={{ padding: "7px 10px", color: "#f59e0b" }}>{o.status}</td>
                        <td style={{ padding: "7px 8px" }}>
                          <button className="btn" onClick={() => cancelOrder(o.id)} style={{ background: "#2d1e2e", color: "#ff4d6d", padding: "3px 8px", fontSize: 10 }}>Cancel</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === "history" && (
                <div style={{ padding: "20px", textAlign: "center", color: "#475569", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  Trade history will appear here
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Order Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="panel" style={{ padding: 14 }}>
            <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 12, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 12 }}>PLACE ORDER</div>

            {/* Buy / Sell Toggle */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 12 }}>
              {["buy", "sell"].map(s => (
                <button key={s} className="btn" onClick={() => setSide(s)} style={{
                  padding: "10px",
                  background: side === s ? (s === "buy" ? "#00d4a820" : "#ff4d6d20") : "#0d1729",
                  border: `1px solid ${side === s ? (s === "buy" ? "#00d4a8" : "#ff4d6d") : "#1e3a5f"}`,
                  color: side === s ? (s === "buy" ? "#00d4a8" : "#ff4d6d") : "#64748b",
                  fontSize: 13, fontFamily: "Syne", letterSpacing: "0.05em"
                }}>{s === "buy" ? "▲ LONG" : "▼ SHORT"}</button>
              ))}
            </div>

            {/* Order Type */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {["limit", "market", "stop"].map(t => (
                <span key={t} className={`tab ${orderType === t ? "active" : ""}`} onClick={() => setOrderType(t)} style={{ fontSize: 11, flex: 1, textAlign: "center" }}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
              ))}
            </div>

            {/* Price */}
            {orderType !== "market" && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>PRICE (USD)</label>
                <input className="inp" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} placeholder={fmt(currentPrice, currentPrice > 100 ? 1 : 4)} type="number" />
              </div>
            )}

            {/* Quantity */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>QUANTITY ({inst.symbol.split("-")[0]})</label>
              <input className="inp" value={orderQty} onChange={e => setOrderQty(e.target.value)} placeholder="0.00" type="number" />
            </div>

            {/* Quick qty buttons */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {["25%", "50%", "75%", "100%"].map(p => (
                <button key={p} className="btn" onClick={() => {
                  const maxQ = (balance * 0.1) / currentPrice;
                  setOrderQty((maxQ * parseInt(p) / 100).toFixed(4));
                }} style={{ flex: 1, background: "#0d1729", border: "1px solid #1e3a5f", color: "#64748b", padding: "4px", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{p}</button>
              ))}
            </div>

            {/* Leverage */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 10, color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>LEVERAGE</label>
                <span style={{ fontSize: 12, color: "#00d4a8", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{leverage}×</span>
              </div>
              <input type="range" min="1" max={inst.leverage} value={leverage} onChange={e => setLeverage(Number(e.target.value))} style={{ width: "100%", accentColor: "#00d4a8", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#475569", fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>
                <span>1×</span><span>{Math.floor(inst.leverage / 2)}×</span><span>{inst.leverage}×</span>
              </div>
            </div>

            {/* Order Summary */}
            <div style={{ background: "#060d1a", borderRadius: 6, padding: "8px 10px", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#64748b" }}>Est. Margin</span>
                <span style={{ color: "#e2e8f0" }}>${margin > 0 ? fmt(margin / leverage) : "-"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#64748b" }}>Notional</span>
                <span style={{ color: "#e2e8f0" }}>${orderQty && orderType === "market" ? fmt(parseFloat(orderQty) * currentPrice) : orderQty && orderPrice ? fmt(parseFloat(orderQty) * parseFloat(orderPrice)) : "-"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Fee (0.02%)</span>
                <span style={{ color: "#94a3b8" }}>${margin > 0 ? fmt(margin * 0.0002) : "-"}</span>
              </div>
            </div>

            {/* Submit */}
            <button className="btn" onClick={placeOrder} style={{
              width: "100%", padding: "12px",
              background: side === "buy" ? "linear-gradient(135deg, #00b894, #00d4a8)" : "linear-gradient(135deg, #c0392b, #ff4d6d)",
              color: "#fff", fontSize: 14, fontFamily: "Syne", fontWeight: 700, letterSpacing: "0.05em",
              boxShadow: side === "buy" ? "0 4px 20px rgba(0,212,168,0.3)" : "0 4px 20px rgba(255,77,109,0.3)"
            }}>
              {orderType === "market" ? "EXECUTE" : "PLACE ORDER"} {side === "buy" ? "▲" : "▼"}
            </button>
          </div>

          {/* Market Stats */}
          <div className="panel" style={{ padding: 12 }}>
            <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 11, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 10 }}>MARKET INFO</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["Funding Rate", "+0.0103%"],
                ["Open Interest", "$2.34B"],
                ["24h Volume", `$${Number(prices[inst.symbol]?.vol || 0).toLocaleString()}`],
                ["Index Price", fmt(currentPrice * 1.0001, currentPrice > 100 ? 1 : 4)],
                ["Next Funding", "02:14:33"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>{k}</span>
                  <span style={{ color: "#94a3b8" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
