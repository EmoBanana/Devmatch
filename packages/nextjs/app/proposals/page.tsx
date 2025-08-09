"use client";

import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const ProposedProjectsPage: NextPage = () => {
  const { data: totalProposals } = useScaffoldReadContract({
    contractName: "Chariteth",
    functionName: "getTotalProposals",
  });

  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    if (totalProposals) {
      const n = Number(totalProposals);
      setIds(Array.from({ length: n }, (_, i) => i + 1));
    }
  }, [totalProposals]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Proposed Projects</h1>
      {ids.length === 0 ? (
        <p>No proposals yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ids.map(id => (
            <ProposalCard key={id} id={id} />
          ))}
        </div>
      )}
      <style>{`
        .proposal-card { background: linear-gradient(180deg,#131a2a,#0f1524); border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:16px; box-shadow:0 10px 30px rgba(0,0,0,.25); }
        .proposal-title { font-weight:800; font-size:1.1rem; }
        .proposal-meta { color:#aab4d4; font-size:.9rem; }
        .proposal-progress { height:8px; background:rgba(255,255,255,.08); border-radius:999px; overflow:hidden; }
        .proposal-progress-fill { height:8px; background: linear-gradient(90deg,#6ea7ff,#34eeb6); }
      `}</style>
    </div>
  );
};

const ProposalCard = ({ id }: { id: number }) => {
  const { data } = useScaffoldReadContract({
    contractName: "Chariteth",
    functionName: "getProposalDetails",
    args: [BigInt(id)],
  });

  if (!data) return <div className="proposal-card">Loading #{id}...</div>;

  const [, title, description, fundingGoal, totalRaised] = data as unknown as [number, string, string, bigint, bigint];

  const pct = (Number(formatEther(totalRaised)) / Math.max(1e-18, Number(formatEther(fundingGoal)))) * 100;

  return (
    <div className="proposal-card">
      <div className="proposal-title">{title || `Proposal #${id}`}</div>
      <p className="proposal-meta">{description || "No description"}</p>
      <div className="mt-2 text-sm">Goal: {formatEther(fundingGoal)} ETH</div>
      <div className="mt-1 text-sm">Raised: {formatEther(totalRaised)} ETH</div>
      <div className="proposal-progress mt-2">
        <div className="proposal-progress-fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
};

export default ProposedProjectsPage;
