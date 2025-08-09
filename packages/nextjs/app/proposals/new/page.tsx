"use client";

import React, { useState } from "react";
import type { NextPage } from "next";
import { parseEther } from "viem";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const CreateProposalPage: NextPage = () => {
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "Chariteth" });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [milestones, setMilestones] = useState<{ title: string; desc: string; pct: string }[]>([
    { title: "", desc: "", pct: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addMilestone = () => setMilestones(m => [...m, { title: "", desc: "", pct: "" }]);
  const updateMilestone = (i: number, k: keyof (typeof milestones)[number], v: string) => {
    setMilestones(ms => ms.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)));
  };
  const removeMilestone = (i: number) => setMilestones(ms => ms.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !goal || milestones.length === 0) return;
    const titles = milestones.map(m => m.title);
    const descs = milestones.map(m => m.desc);
    const pcts = milestones.map(m => Number(m.pct));
    const total = pcts.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
    if (total !== 100) {
      alert("Milestone percentages must total 100");
      return;
    }
    try {
      setSubmitting(true);
      await writeContractAsync({
        functionName: "createProposal",
        args: [title, description, parseEther(goal), titles, descs, pcts],
      });
      alert("Proposal created!");
      setTitle("");
      setDescription("");
      setGoal("");
      setMilestones([{ title: "", desc: "", pct: "" }]);
    } catch (e) {
      console.error(e);
      alert("Failed to create proposal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create Proposal</h1>
      <form onSubmit={handleSubmit} className="create-form">
        <label>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Project title" />
        <label>Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="textarea"
          placeholder="Project description"
        />
        <label>Funding Goal (ETH)</label>
        <input value={goal} onChange={e => setGoal(e.target.value)} className="input" placeholder="e.g. 5" />
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Milestones</h2>
            <button type="button" className="btn-add" onClick={addMilestone}>
              + Add Milestone
            </button>
          </div>
          {milestones.map((m, i) => (
            <div key={i} className="milestone-row">
              <input
                value={m.title}
                onChange={e => updateMilestone(i, "title", e.target.value)}
                className="input"
                placeholder="Title"
              />
              <input
                value={m.desc}
                onChange={e => updateMilestone(i, "desc", e.target.value)}
                className="input"
                placeholder="Description"
              />
              <input
                value={m.pct}
                onChange={e => updateMilestone(i, "pct", e.target.value)}
                className="input"
                placeholder="%"
              />
              <button type="button" className="btn-remove" onClick={() => removeMilestone(i)}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <button type="submit" className="btn-submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Create"}
        </button>
      </form>
      <style>{`
        .create-form { max-width: 900px; margin: 0 auto; display:grid; gap:.75rem; background:linear-gradient(180deg,#131a2a,#0f1524); padding:16px; border:1px solid rgba(255,255,255,.12); border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,.25); }
        label { font-weight:700; }
        .input, .textarea { background:#0e162b; border:1px solid rgba(255,255,255,.15); border-radius:10px; padding:.6rem .75rem; color:#e6ecff; }
        .textarea { min-height: 100px; }
        .milestone-row { display:grid; grid-template-columns: 1.2fr 2fr .6fr auto; gap:.5rem; margin-bottom:.5rem; }
        .btn-add { background:linear-gradient(90deg,#6ea7ff,#6d7dff); color:#0b0f1d; border:none; padding:.4rem .75rem; border-radius:10px; font-weight:800; }
        .btn-remove { background:transparent; border:1px solid rgba(255,255,255,.2); color:#e6ecff; border-radius:10px; padding:.4rem .75rem; }
        .btn-submit { margin-top:.5rem; background:linear-gradient(90deg,#6ea7ff,#6d7dff); color:#0b0f1d; border:none; padding:.6rem 1rem; border-radius:12px; font-weight:800; }
        @media (max-width: 720px) { .milestone-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default CreateProposalPage;
