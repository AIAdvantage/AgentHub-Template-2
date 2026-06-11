import React, { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";

export default function Wins() {
  const [wins, setWins] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("wins")
      .select("*")
      .order("created_at", { ascending: false });
    setWins(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function deleteWin(w) {
    if (!confirm(`Delete win "${w.title}"?`)) return;
    await supabase.from("wins").delete().eq("id", w.id);
    load();
  }

  return (
    <div className="wrap">
      <div className="hello">Wall of Wins</div>
      <h1>🏆 Wins</h1>
      <p className="sub">Every completed idea lands here — automatically.</p>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : wins.length === 0 ? (
        <div className="empty">No wins yet. Drag an idea to "Done".</div>
      ) : (
        <div className="wins-grid">
          {wins.map((w) => (
            <div key={w.id} className="win-tile">
              <button
                className="iconbtn danger win-del"
                title="Delete win"
                onClick={() => deleteWin(w)}
              >🗑</button>
              <div className="win-trophy">🏆</div>
              <div className="win-title">{w.title}</div>
              {w.summary && <div className="win-summary">{w.summary}</div>}
              <div className="win-date">
                {new Date(w.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
