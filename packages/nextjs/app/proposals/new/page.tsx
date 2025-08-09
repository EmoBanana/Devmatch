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
      <form
        onSubmit={handleSubmit}
        className="max-w-[900px] mx-auto grid gap-3 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-900 to-slate-800 p-4 text-slate-100 shadow"
      >
        <label className="font-bold">Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="rounded-lg border border-white/20 bg-slate-900/50 px-3 py-2 text-slate-100"
          placeholder="Project title"
        />
        <label className="font-bold">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="min-h-[100px] rounded-lg border border-white/20 bg-slate-900/50 px-3 py-2 text-slate-100"
          placeholder="Project description"
        />
        <label className="font-bold">Funding Goal (ETH)</label>
        <input
          value={goal}
          onChange={e => setGoal(e.target.value)}
          className="rounded-lg border border-white/20 bg-slate-900/50 px-3 py-2 text-slate-100"
          placeholder="e.g. 5"
        />
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Milestones</h2>
            <button
              type="button"
              className="rounded-lg bg-gradient-to-r from-indigo-400 to-indigo-500 text-slate-900 font-extrabold px-3 py-1 shadow"
              onClick={addMilestone}
            >
              + Add Milestone
            </button>
          </div>
          {milestones.map((m, i) => (
            <div key={i} className="grid gap-2 md:[grid-template-columns:1.2fr_2fr_.6fr_auto] grid-cols-1 mb-2">
              <input
                value={m.title}
                onChange={e => updateMilestone(i, "title", e.target.value)}
                className="rounded-lg border border-white/20 bg-slate-900/50 px-3 py-2 text-slate-100"
                placeholder="Title"
              />
              <input
                value={m.desc}
                onChange={e => updateMilestone(i, "desc", e.target.value)}
                className="rounded-lg border border-white/20 bg-slate-900/50 px-3 py-2 text-slate-100"
                placeholder="Description"
              />
              <input
                value={m.pct}
                onChange={e => updateMilestone(i, "pct", e.target.value)}
                className="rounded-lg border border-white/20 bg-slate-900/50 px-3 py-2 text-slate-100"
                placeholder="%"
              />
              <button
                type="button"
                className="rounded-lg border border-white/30 text-slate-100 px-3 py-2"
                onClick={() => removeMilestone(i)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="mt-2 rounded-xl bg-gradient-to-r from-indigo-400 to-indigo-500 text-slate-900 font-extrabold px-4 py-2 shadow disabled:opacity-70"
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Create"}
        </button>
      </form>
    </div>
  );
};

export default CreateProposalPage;
