"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { EtherInput } from "~~/components/scaffold-eth";
import featured from "~~/data/featured.json";
import metaData from "~~/data/metadata.json";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { parseUnits } from "viem";
import { usePublicClient, useWalletClient, useSwitchChain } from "wagmi";
import { sepolia } from "viem/chains";

const USDC = {
  address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`,
  decimals: 6,
};

const USDC_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;


// Removed external stylesheet import
// import "../styles/chariteth.css";

const MAX_PROJECTS_TO_FETCH = 10;

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [isHovered, setIsHovered] = useState(false);
  const [ongoingProjects, setOngoingProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedTag, setSelectedTag] = useState("Ongoing");
  const [donationAmount, setDonationAmount] = useState("");
  const [donationAmounts, setDonationAmounts] = useState<Record<number, string>>({});
  const [modalAmount, setModalAmount] = useState("");
  const [expandedMilestones, setExpandedMilestones] = useState<Record<number, boolean>>({});
  const carouselRef = useRef<HTMLDivElement>(null);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  const TREASURY: `0x${string}` = "0x15C604f620D775B8CCE7916ee8EE4F9dEB87E1fb";

  // Load all proposals from chain
  const { data: allProposals } = (useScaffoldReadContract as any)({
    contractName: "Innovateth",
    functionName: "getAllProposals",
  });

  // Extended featured array for infinite carousel
  const extendedFeatured = [...featured, featured[0]];

  // Define carousel functions before useEffects
  const nextSlide = useCallback(() => {
    setCurrentIndex(prevIndex => (prevIndex + 1) % extendedFeatured.length);
  }, [extendedFeatured.length]);

  const prevSlide = () => {
    setCurrentIndex(prevIndex => (prevIndex === 0 ? extendedFeatured.length - 2 : prevIndex - 1));
  };

  // Fetch ongoing (Active) projects from chain
  useEffect(() => {
    const fetchOngoing = async () => {
      try {
        const proposals = (allProposals as any[]) || [];
        // status: 0 Pending, 1 Active
        const active = proposals
          .map((p, idx) => ({
            id: Number(p.proposalId) || idx + 1,
            proposalId: p.proposalId,
            title: p.title as string,
            description: p.description as string,
            fundingGoal: p.fundingGoal as bigint,
            totalRaised: p.totalRaised as bigint,
            creator: (p.creator as string) || "0x0000000000000000000000000000000000000000",
            status: Number(p.status) as number,
            milestones: p.milestones || [],
            currentMilestone: Number(p.currentMilestone) || 0,
          }))
          .filter(p => p.status === 1)
          .slice(0, MAX_PROJECTS_TO_FETCH)
          .map(p => ({
            ...p,
            goal: `${formatEther(p.fundingGoal)} USDC`,
          }));
        setOngoingProjects(active);
        setLoading(false);
      } catch (e) {
        console.error("Error loading proposals:", e);
        setError("Failed to fetch projects");
        setLoading(false);
      }
    };

    fetchOngoing();
  }, [allProposals]);

  // Carousel auto-scroll
  useEffect(() => {
  if (!isHovered) {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }
}, [nextSlide, isHovered]);

  // Handle infinite scroll
  useEffect(() => {
    if (currentIndex === extendedFeatured.length - 1) {
      const timeout = setTimeout(() => {
        if (carouselRef.current) {
          carouselRef.current.style.transition = "none";
          setCurrentIndex(0);
          setTimeout(() => {
            if (carouselRef.current) {
              carouselRef.current.style.transition = "transform 0.5s ease-in-out";
            }
          }, 50);
        }
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, extendedFeatured.length]);

  const handleDonate = async (proposalId: number, amountStr?: string) => {
  if (!connectedAddress) {
    alert("Please connect your wallet first");
    return;
  }
  const amountInput = amountStr ?? donationAmount;
  if (!amountInput) {
    alert("Please enter a donation amount");
    return;
  }
  if (!walletClient) {
    alert("Wallet client not ready");
    return;
  }

  try {
    // Ensure we’re on Sepolia
    if (walletClient.chain?.id !== sepolia.id) {
      await switchChain({ chainId: sepolia.id });
    }

    // Amount in USDC (6 decimals)
    const amount = parseUnits(amountInput, USDC.decimals);

    // Choose recipient: treasury or the project’s creator
    const recipient =
      (selectedProject?.creator as `0x${string}`) || TREASURY;

    // Send USDC directly
    const txHash = await walletClient.writeContract({
      address: USDC.address,
      abi: USDC_TRANSFER_ABI,
      functionName: "transfer",
      args: [recipient, amount],
      account: connectedAddress as `0x${string}`,
      chain: sepolia,
    });
    
    await publicClient!.waitForTransactionReceipt({ hash: txHash });

    // You could add a `totalRaisedUsdc` field instead.
    setDonationAmount("");
    setDonationAmounts(prev => ({ ...prev, [proposalId]: "" }));
    setModalAmount("");
    setSelectedProject(null);
    alert("USDC donation sent!");
  } catch (err) {
    console.error("USDC donation error:", err);
    alert(`Donation failed: ${(err as Error)?.message ?? err}`);
  }
};


  const handleTagClick = (tag: string) => {
    if (tag === "Ongoing") {
      setSelectedTag("Ongoing");
    } else {
      setSelectedTag(tag === selectedTag ? "Ongoing" : tag);
    }
  };

  const filteredProjects =
    selectedTag === "Ongoing"
      ? ongoingProjects
      : ongoingProjects.filter(project => metaData.find(item => item.id === project.id)?.tags.includes(selectedTag));

  const openPopup = (project: any) => {
    setSelectedProject(project);
  };

  const closePopup = () => {
    setSelectedProject(null);
    setModalAmount("");
  };

  const toggleMilestones = (projectId: number) => {
    setExpandedMilestones(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const getMilestoneStatusText = (status: number) => {
    const statusMap = ["Pending", "Submitted", "Approved", "Rejected"];
    return statusMap[status] || "Unknown";
  };

  const getMilestoneStatusColor = (status: number) => {
    const colorMap = {
      0: "text-yellow-600", // Pending
      1: "text-blue-600",   // Submitted
      2: "text-green-600",  // Approved
      3: "text-red-600"     // Rejected
    };
    return colorMap[status as keyof typeof colorMap] || "text-gray-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-4">Loading ongoing projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="alert alert-error">
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 md:py-16">
      <h1 className="flex flex-col items-center gap-2 font-extrabold text-2xl md:text-3xl text-center text-slate">
        Ongoing Fundraising Projects
        
      </h1>

      {/* Carousel */}
      <div className="relative my-8 md:my-10">
        <button
          className="absolute top-1/2 left-[-60px] -translate-y-1/2 size-10 rounded-full bg-white border border-slate-200 grid place-items-center text-black shadow transition-transform hover:scale-105"
          onClick={prevSlide}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <div className="overflow-hidden rounded-xl bg-gradient-to-b from-white to-slate-50 shadow-[0_10px_28px_rgba(6,12,34,0.08)] border border-slate-200/60">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            ref={carouselRef}
            onMouseEnter={() => setIsHovered(true)}
             onMouseLeave={() => setIsHovered(false)}
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {extendedFeatured.map((project, index) => (
              <div key={`${project.id}-${index}`} className="min-w-full grid md:grid-cols-2 gap-4 p-5 text-black">
                <div
                  className="w-full h-[280px] grid place-items-center text-7xl rounded-[14px] bg-slate-100 text-slate-400"
                  aria-hidden
                >
                  🧬
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-black">{project.title}</h2>
                    <p className="text-black text-justify">{project.description}</p>
                  </div>
                  <div className="flex items-baseline gap-2 font-extrabold text-black">
                    <p>Funding Goal:</p>
                    <p className="text-black">{project.goal}</p>
                  </div>
                  <input
                    className="bg-white border-black border-2 text-black placeholder-slate-500 px-3 py-2 rounded-lg"
                    value={donationAmount}
                    onChange={e => setDonationAmount(e.target.value)}
                    placeholder="Amount (USDC)"
                    inputMode="decimal"
                  />
                  <button
                    className="mt-2 rounded-xl bg-gradient-to-r from-indigo-400 to-blue-400 text-black font-black py-2 px-4 shadow hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={() => handleDonate(project.id, donationAmount)}
                    disabled={!connectedAddress}
                  >
                    {connectedAddress ? "Donate" : "Connect Wallet"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          className="absolute top-1/2 right-[-60px] -translate-y-1/2 size-10 rounded-full bg-white border border-slate-200 grid place-items-center text-black shadow transition-transform hover:scale-105"
          onClick={nextSlide}
          aria-label="Next slide"
        >
          ›
        </button>
      </div>

      {/* Tags */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 justify-center">
          <div
            className={`px-4 py-2 rounded-full border bg-white text-black font-extrabold text-sm shadow transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
              selectedTag === "Ongoing" ? "bg-indigo-100 border-indigo-300/70" : "border-slate-200"
            }`}
            onClick={() => handleTagClick("Ongoing")}
          >
            Ongoing
          </div>
          {[...new Set(metaData.flatMap(item => item.tags))].map((tag, index) => (
            <div
              key={index}
              className={`px-4 py-2 rounded-full border bg-white text-black font-extrabold text-sm shadow transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                selectedTag === tag ? "bg-indigo-100 border-indigo-300/70" : "border-slate-200"
              }`}
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map(project => {
          const progressPercentage =
            (Number(formatEther(project.totalRaised)) / Number(formatEther(project.fundingGoal))) * 100;
          const amountForCard = donationAmounts[project.id] || "";
          return (
            <div
              key={project.id}
              className="bg-white border border-slate-200 rounded-2xl shadow p-4 grid gap-3 transition hover:-translate-y-0.5 hover:shadow-lg cursor-pointer text-black"
              onClick={() => openPopup(project)}
            >
              <div className="grid gap-2">
                <div>
                  <h1 className="text-lg font-black text-black">{project.title}</h1>
                  <p className="text-black text-justify">{project.description}</p>
                </div>
                <p className="text-black">Funding Goal: {formatEther(project.fundingGoal)} USDC</p>
                <div className="font-semibold text-black">
                  <p className="text-black">
                    Raised: {formatEther(project.totalRaised)} USDC / {formatEther(project.fundingGoal)} USDC
                  </p>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-2.5 bg-gradient-to-r from-indigo-400 to-blue-400 transition-[width] duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="bg-white border-black border-2 text-black placeholder-slate-500 px-3 py-2 rounded-lg flex-1"
                      value={amountForCard}
                      onChange={e => setDonationAmounts(prev => ({ ...prev, [project.id]: e.target.value }))}
                      placeholder="Amount (USDC)"
                      inputMode="decimal"
                      onClick={e => e.stopPropagation()}
                    />
                    <button
                      className="rounded-xl bg-gradient-to-r from-indigo-400 to-blue-400 text-black font-black py-2 px-4 shadow hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                      onClick={e => {
                        e.stopPropagation();
                        handleDonate(project.id, amountForCard);
                      }}
                      disabled={!connectedAddress}
                    >
                      {connectedAddress ? "Donate" : "Connect Wallet"}
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="rounded-lg bg-gradient-to-r from-green-400 to-green-500 text-black font-bold py-1.5 px-3 shadow hover:-translate-y-0.5 hover:shadow-md text-sm flex-1"
                      onClick={e => e.stopPropagation()}
                    >
                      Feature Project
                    </button>
                    <button
                      className="rounded-lg bg-gradient-to-r from-purple-400 to-purple-500 text-black font-bold py-1.5 px-3 shadow hover:-translate-y-0.5 hover:shadow-md text-sm flex-1"
                      onClick={e => {
                        e.stopPropagation();
                        toggleMilestones(project.id);
                      }}
                    >
                      {expandedMilestones[project.id] ? "Hide Milestones" : "Check Milestones"}
                    </button>
                  </div>
                  {expandedMilestones[project.id] && (
                    <div className="mt-3 border-t border-slate-300 pt-3">
                      <h3 className="font-bold text-black mb-2">Project Milestones</h3>
                      {project.milestones && project.milestones.length > 0 ? (
                        <div className="space-y-2">
                          {project.milestones.map((milestone: any, index: number) => (
                            <div 
                              key={index} 
                              className={`p-2 rounded-lg border ${
                                index === project.currentMilestone 
                                  ? "bg-blue-50 border-blue-300" 
                                  : index < project.currentMilestone
                                    ? "bg-green-50 border-green-300"
                                    : "bg-gray-50 border-gray-300"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-black text-sm">
                                  {milestone.title}
                                </h4>
                                <span className={`text-xs font-medium ${getMilestoneStatusColor(Number(milestone.status))}`}>
                                  {getMilestoneStatusText(Number(milestone.status))}
                                </span>
                              </div>
                              <p className="text-black text-xs text-justify mb-1">
                                {milestone.description}
                              </p>
                              <div className="flex justify-between text-xs text-black">
                                <span>Progress: {milestone.percentage}%</span>
                                <span>Funds: {formatEther(milestone.fundsAllocated)} USDC</span>
                              </div>
                              {index === project.currentMilestone && (
                                <div className="mt-1 text-xs text-blue-600 font-medium">
                                  📍 Current Milestone
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No milestones available</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="mt-8 text-center bg-white border border-slate-200 rounded-2xl shadow p-7 text-black">
        <h3 className="text-xl font-black">Are You A Company Looking To Make Giving a Habit?</h3>
        <p className="font-semibold">
          Set up recurring donations and get monthly CSR reports — effortless, impactful, and transparent.
        </p>
        <a className="inline-block mt-3 bg-gradient-to-r from-indigo-400 to-blue-400 text-black py-2 px-4 rounded-xl font-black">
          Start Now
        </a>
      </div>

      {/* Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/40 grid place-items-center z-50" onClick={closePopup}>
          <div
            className="w-[92vw] max-w-[950px] max-h-[80vh] bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 relative text-black overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-4 bg-white border border-slate-200 text-black text-lg w-8 h-8 rounded-lg"
              onClick={closePopup}
            >
              ×
            </button>
            <div className="grid gap-4 grid-cols-1 md:[grid-template-columns:320px_1fr]">
              <div
                className="w-full h-60 grid place-items-center text-6xl bg-slate-100 text-slate-400 rounded-xl overflow-hidden"
                aria-hidden
              >
                🔬
              </div>
              <div className="">
                <h1 className="text-2xl font-black text-black">{selectedProject.title}</h1>
                <p className="text-black text-justify">{selectedProject.description}</p>
                <p className="text-black">Creator: {selectedProject.creator}</p>
                <p className="text-black">Funding Goal: {formatEther(selectedProject.fundingGoal)} USDC</p>
                <p className="text-black">
                  Raised: {formatEther(selectedProject.totalRaised)} USDC / {formatEther(selectedProject.fundingGoal)} USDC
                </p>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-2.5 bg-gradient-to-r from-indigo-400 to-blue-400 transition-[width] duration-300"
                    style={{
                      width: `${(Number(formatEther(selectedProject.totalRaised)) / Number(formatEther(selectedProject.fundingGoal))) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-3 items-center">
                  <input
                    className="bg-white border-black border-2 text-black placeholder-slate-500 px-3 py-2 rounded-lg"
                    value={modalAmount}
                    onChange={e => setModalAmount(e.target.value)}
                    placeholder="Amount (USDC)"
                    inputMode="decimal"
                  />
                  <button
                    className="rounded-xl bg-gradient-to-r from-indigo-400 to-blue-400 text-black font-black py-2 px-4 shadow hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={() => handleDonate(selectedProject.id, modalAmount)}
                    disabled={!connectedAddress || !modalAmount}
                  >
                    {connectedAddress ? "Donate" : "Connect Wallet"}
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    className="rounded-lg bg-gradient-to-r from-green-400 to-green-500 text-black font-bold py-2 px-4 shadow hover:-translate-y-0.5 hover:shadow-md flex-1"
                  >
                    Feature Project
                  </button>
                  <button
                    className="rounded-lg bg-gradient-to-r from-purple-400 to-purple-500 text-black font-bold py-2 px-4 shadow hover:-translate-y-0.5 hover:shadow-md flex-1"
                    onClick={() => toggleMilestones(selectedProject.id)}
                  >
                    {expandedMilestones[selectedProject.id] ? "Hide Milestones" : "Check Milestones"}
                  </button>
                </div>
                {expandedMilestones[selectedProject.id] && (
                  <div className="mt-4 border-t border-slate-300 pt-4">
                    <h3 className="font-bold text-black mb-3 text-lg">Project Milestones</h3>
                    {selectedProject.milestones && selectedProject.milestones.length > 0 ? (
                      <div className="space-y-3">
                        {selectedProject.milestones.map((milestone: any, index: number) => (
                          <div 
                            key={index} 
                            className={`p-3 rounded-lg border ${
                              index === selectedProject.currentMilestone 
                                ? "bg-blue-50 border-blue-300" 
                                : index < selectedProject.currentMilestone
                                  ? "bg-green-50 border-green-300"
                                  : "bg-gray-50 border-gray-300"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-black text-base">
                                {milestone.title}
                              </h4>
                              <span className={`text-sm font-medium ${getMilestoneStatusColor(Number(milestone.status))}`}>
                                {getMilestoneStatusText(Number(milestone.status))}
                              </span>
                            </div>
                            <p className="text-black text-sm text-justify mb-2">
                              {milestone.description}
                            </p>
                            <div className="flex justify-between text-sm text-black">
                              <span>Progress: {milestone.percentage}%</span>
                              <span>Funds: {formatEther(milestone.fundsAllocated)} USDC</span>
                            </div>
                            {index === selectedProject.currentMilestone && (
                              <div className="mt-2 text-sm text-blue-600 font-medium">
                                📍 Current Milestone
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No milestones available</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
