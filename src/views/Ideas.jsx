import React, { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCorners, DragOverlay, useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLUMNS = [
  { id: "idea", label: "Ideas", emoji: "💡" },
  { id: "in_progress", label: "In progress", emoji: "🛠" },
  { id: "done", label: "Done", emoji: "✅" },
];

function Card({ idea, onClick, onArchive, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: idea.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kcard"
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) onClick(idea); }}
    >
      <div className="kcard-row">
        <div className="kcard-title">{idea.title}</div>
        <div className="kcard-actions" onPointerDown={stop} onClick={stop}>
          <button title="Archive" className="iconbtn" onClick={(e) => { stop(e); onArchive(idea); }}>📦</button>
          <button title="Delete" className="iconbtn danger" onClick={(e) => { stop(e); onDelete(idea); }}>🗑</button>
        </div>
      </div>
      {idea.category && <div className="kcard-cat">{idea.category}</div>}
    </div>
  );
}

function Column({ col, ideas, onAdd, onOpen, onArchive, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${col.id}` });
  return (
    <div className="kcol">
      <div className="kcol-head">
        <span>{col.emoji} {col.label}</span>
        <span className="kcol-ct">{ideas.length}</span>
      </div>
      <SortableContext items={ideas.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`kcol-body${isOver ? " over" : ""}`} data-col={col.id}>
          {ideas.map((idea) => (
            <Card key={idea.id} idea={idea} onClick={onOpen} onArchive={onArchive} onDelete={onDelete} />
          ))}
          {ideas.length === 0 && <div className="kcol-empty">Drop here</div>}
        </div>
      </SortableContext>
      <button className="kcol-add" onClick={() => onAdd(col.id)}>+ New idea</button>
    </div>
  );
}

export default function Ideas() {
  const [ideas, setIdeas] = useState([]);
  const [archived, setArchived] = useState([]);
  const [showArchive, setShowArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [modal, setModal] = useState(null);
  const [creating, setCreating] = useState(null);
  const [form, setForm] = useState({ title: "", context: "", category: "" });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("ideas")
      .select("*")
      .order("position", { ascending: true });
    const all = data || [];
    setIdeas(all.filter((i) => !i.archived_at));
    setArchived(all.filter((i) => !!i.archived_at));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const byCol = (status) => ideas.filter((i) => i.status === status);

  function findCol(id) {
    return ideas.find((i) => i.id === id)?.status;
  }

  async function persistOrder(updated) {
    await Promise.all(updated.map((i, idx) =>
      supabase.from("ideas").update({ position: idx, status: i.status }).eq("id", i.id)
    ));
  }

  function handleDragEnd(e) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const activeIdea = ideas.find((i) => i.id === active.id);
    if (!activeIdea) return;
    let targetCol;
    if (typeof over.id === "string" && over.id.startsWith("col:")) {
      targetCol = over.id.slice(4);
    } else {
      targetCol = findCol(over.id);
    }
    if (!targetCol) return;
    let next = [...ideas];
    if (activeIdea.status !== targetCol) {
      next = next.map((i) => i.id === active.id ? { ...i, status: targetCol } : i);
    }
    const colItems = next.filter((i) => i.status === targetCol);
    const others = next.filter((i) => i.status !== targetCol);
    const oldIdx = colItems.findIndex((i) => i.id === active.id);
    let newIdx = colItems.findIndex((i) => i.id === over.id);
    if (newIdx === -1) newIdx = colItems.length - 1;
    const reordered = arrayMove(colItems, oldIdx, newIdx);
    const merged = [...others, ...reordered];
    setIdeas(merged);
    persistOrder(merged).then(load);
  }

  async function createIdea() {
    if (!form.title.trim()) return;
    const status = creating;
    const position = byCol(status).length;
    await supabase.from("ideas").insert({
      title: form.title.trim(),
      context: form.context,
      category: form.category,
      status,
      position,
    });
    setCreating(null);
    setForm({ title: "", context: "", category: "" });
    load();
  }

  async function saveModal() {
    await supabase.from("ideas").update({
      title: modal.title,
      context: modal.context,
      category: modal.category,
      status: modal.status,
    }).eq("id", modal.id);
    setModal(null);
    load();
  }

  async function archiveIdea(idea) {
    if (!confirm(`Archive idea "${idea.title}"? (Win stays)`)) return;
    await supabase.from("ideas").update({ archived_at: new Date().toISOString() }).eq("id", idea.id);
    if (modal?.id === idea.id) setModal(null);
    load();
  }

  async function restoreIdea(idea) {
    await supabase.from("ideas").update({ archived_at: null }).eq("id", idea.id);
    load();
  }

  async function deleteIdea(idea) {
    if (!confirm(`Permanently delete idea "${idea.title}"?`)) return;
    const { data: win } = await supabase.from("wins").select("id").eq("idea_id", idea.id).maybeSingle();
    if (win && confirm("Also delete the linked win?")) {
      await supabase.from("wins").delete().eq("idea_id", idea.id);
    }
    await supabase.from("ideas").delete().eq("id", idea.id);
    if (modal?.id === idea.id) setModal(null);
    load();
  }

  function copyPrompt(idea) {
    const text =
`Idea: ${idea.title}
Category: ${idea.category || "-"}
Card ID: ${idea.id}
Context: ${idea.context || "-"}

When done, append an entry to my changelog under today's date with the title and a 1–2 sentence summary of what was built.`;
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="wrap">
      <div className="hello">Pipeline</div>
      <h1>💡 Ideas</h1>
      <p className="sub">Dump ideas in, drag them right. Whatever lands on the right becomes a win.</p>

      <div style={{ marginBottom: 16 }}>
        <button className="btn-ghost" onClick={() => setShowArchive(true)}>
          📦 Archive ({archived.length})
        </button>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e) => setActiveId(e.active.id)}
          onDragEnd={handleDragEnd}
        >
          <div className="kboard">
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                col={col}
                ideas={byCol(col.id)}
                onAdd={setCreating}
                onOpen={setModal}
                onArchive={archiveIdea}
                onDelete={deleteIdea}
              />
            ))}
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="kcard dragging">
                {ideas.find((i) => i.id === activeId)?.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {creating && (
        <div className="modal" onClick={(e) => e.target.className === "modal" && setCreating(null)}>
          <div className="panel">
            <button className="x" onClick={() => setCreating(null)}>×</button>
            <h2 style={{ marginTop: 0 }}>New idea</h2>
            <div className="formgrid">
              <label>Title*<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></label>
              <label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Tool, Content, System…" /></label>
              <label>Context<textarea rows={5} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} /></label>
              <div className="formrow">
                <button className="btn-primary" onClick={createIdea}>Create</button>
                <button className="btn-ghost" onClick={() => setCreating(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal" onClick={(e) => e.target.className === "modal" && setModal(null)}>
          <div className="panel">
            <button className="x" onClick={() => setModal(null)}>×</button>
            <h2 style={{ marginTop: 0 }}>Edit idea</h2>
            <div className="formgrid">
              <label>Title<input value={modal.title} onChange={(e) => setModal({ ...modal, title: e.target.value })} /></label>
              <label>Category<input value={modal.category || ""} onChange={(e) => setModal({ ...modal, category: e.target.value })} /></label>
              <label>Context<textarea rows={6} value={modal.context || ""} onChange={(e) => setModal({ ...modal, context: e.target.value })} /></label>
              <label>Status
                <select value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })}>
                  {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              <div className="formrow">
                <button className="btn-primary" onClick={saveModal}>Save</button>
                <button className="btn-ghost" onClick={() => copyPrompt(modal)}>📋 Copy to Cowork</button>
                <button className="btn-ghost" onClick={() => archiveIdea(modal)}>📦 Archive</button>
                <button className="btn-danger" onClick={() => deleteIdea(modal)}>Delete</button>
              </div>
              <div className="kmeta">ID: <code>{modal.id}</code></div>
            </div>
          </div>
        </div>
      )}

      {showArchive && (
        <div className="modal" onClick={(e) => e.target.className === "modal" && setShowArchive(false)}>
          <div className="panel">
            <button className="x" onClick={() => setShowArchive(false)}>×</button>
            <h2 style={{ marginTop: 0 }}>📦 Archive</h2>
            {archived.length === 0 ? (
              <div className="empty">Nothing archived yet.</div>
            ) : (
              <div className="archive-list">
                {archived.map((a) => (
                  <div key={a.id} className="archive-row">
                    <div>
                      <div className="kcard-title">{a.title}</div>
                      {a.category && <div className="kcard-cat">{a.category}</div>}
                    </div>
                    <div className="formrow">
                      <button className="btn-ghost" onClick={() => restoreIdea(a)}>↺ Restore</button>
                      <button className="btn-danger" onClick={() => deleteIdea(a)}>Delete</button>
                    </div>
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
