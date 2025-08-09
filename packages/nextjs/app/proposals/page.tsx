"use client";

import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const ProposedProjectsPage: NextPage = () => {
  const { data: allProposals } = (useScaffoldReadContract as any)({
    contractName: "Innovateth",
    functionName: "getAllProposals",
  });

  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    if (allProposals) {
      const proposalsArr = (allProposals as any[]) || [];
      const onlyPendingIds = proposalsArr
        .map((p, idx) => ({ id: idx + 1, status: Number(p.status) }))
        .filter(p => p.status === 0)
        .map(p => p.id);
      setIds(onlyPendingIds);
    }
  }, [allProposals]);

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
  const { address } = useAccount();
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "Innovateth" });

  const { data } = (useScaffoldReadContract as any)({
    contractName: "Innovateth",
    functionName: "getProposalDetails",
    args: [BigInt(id)],
  });

  const { data: voted } = (useScaffoldReadContract as any)({
    contractName: "Innovateth",
    functionName: "hasVoted",
    args: [address, BigInt(id)],
  });

  const { data: owner } = (useScaffoldReadContract as any)({
    contractName: "Innovateth",
    functionName: "owner",
  });

  if (!data)
    return (
      <div className="rounded-2xl p-4 border border-slate-200 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-200 shadow">
        Loading #{id}...
      </div>
    );

  const proposal = data as {
    creator: string;
    title: string;
    description: string;
    fundingGoal: bigint;
    totalRaised: bigint;
    status: number;
    creationTime: bigint;
    votingDeadline: bigint;
    totalVotes: bigint;
    currentMilestone: bigint;
    milestones: any[];
  };

  const pct =
    (Number(formatEther(proposal.totalRaised)) / Math.max(1e-18, Number(formatEther(proposal.fundingGoal)))) * 100;

  const nowSec = Math.floor(Date.now() / 1000);
  const isPending = proposal.status === 0; // Pending
  const votingOpen = isPending && nowSec <= Number(proposal.votingDeadline);
  const alreadyVoted = Boolean(voted);
  const isOwner = owner && String(owner).toLowerCase() === String(address || "").toLowerCase();

  const onVote = async () => {
    try {
      await writeContractAsync({
        functionName: "voteOnProposal",
        args: [BigInt(id)],
      });
    } catch (e) {
      console.error(e);
      alert("Vote failed");
    }
  };

  const onApprove = async () => {
    try {
      await writeContractAsync({
        functionName: "setProposalVotes",
        args: [BigInt(id), 20n],
      });
      alert("Proposal approved");
    } catch (e) {
      console.error(e);
      alert("Failed to approve proposal");
    }
  };

  return (
    <div className="rounded-2xl p-4 border border-slate-200 bg-gradient-to-b from-slate-900 to-slate-800 text-slate-200 shadow">
      <div className="font-extrabold text-lg">{proposal.title || `Proposal #${id}`}</div>
      <p className="text-slate-300 text-sm text-justify">{proposal.description || "No description"}</p>
      <div className="mt-2 text-sm">Goal: {formatEther(proposal.fundingGoal)} USDC</div>
      <div className="mt-1 text-sm">Raised: {formatEther(proposal.totalRaised)} USDC</div>
      <div className="mt-1 text-sm">Votes: {String(proposal.totalVotes)}</div>
      <div className="mt-2 w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-2 bg-gradient-to-r from-blue-400 to-emerald-400"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <button
          type="button"
          className="rounded-lg bg-gradient-to-r from-blue-400 to-purple-500 text-slate-900 font-extrabold px-3 py-1.5 shadow disabled:opacity-60"
          onClick={onVote}
          disabled={!votingOpen || alreadyVoted || isMining || !address}
          title={!address ? "Connect wallet" : alreadyVoted ? "You have already voted" : !votingOpen ? "Voting closed" : ""}
        >
          {isMining ? "Voting..." : alreadyVoted ? "Voted" : "Vote"}
        </button>
        {isPending ? (
          <span className="text-xs text-slate-400">
            Deadline: {new Date(Number(proposal.votingDeadline) * 1000).toLocaleString()}
          </span>
        ) : null}
        {isOwner ? (
          <button
            type="button"
            className="ml-auto rounded-lg bg-gradient-to-r from-green-300 to-green-400 text-black font-extrabold px-3 py-1.5 shadow disabled:opacity-60"
            onClick={onApprove}
            disabled={!isPending || isMining}
            title={!isPending ? "Only pending proposals can be approved" : ""}
          >
            {isMining ? "Approving..." : "Approve Proposal"}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default ProposedProjectsPage;
