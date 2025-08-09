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
    </div>
  );
};

const ProposalCard = ({ id }: { id: number }) => {
  const { data } = useScaffoldReadContract({
    contractName: "Chariteth",
    functionName: "getProposalDetails",
    args: [BigInt(id)],
  });

  if (!data)
    return (
      <div className="rounded-2xl p-4 border border-slate-200 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-200 shadow">
        Loading #{id}...
      </div>
    );

  const [, title, description, fundingGoal, totalRaised] = data as unknown as [number, string, string, bigint, bigint];

  const pct = (Number(formatEther(totalRaised)) / Math.max(1e-18, Number(formatEther(fundingGoal)))) * 100;

  return (
    <div className="rounded-2xl p-4 border border-slate-200 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-200 shadow">
      <div className="font-extrabold text-lg">{title || `Proposal #${id}`}</div>
      <p className="text-slate-300 text-sm">{description || "No description"}</p>
      <div className="mt-2 text-sm">Goal: {formatEther(fundingGoal)} ETH</div>
      <div className="mt-1 text-sm">Raised: {formatEther(totalRaised)} ETH</div>
      <div className="mt-2 w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-2 bg-gradient-to-r from-blue-400 to-emerald-400"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
};

export default ProposedProjectsPage;
