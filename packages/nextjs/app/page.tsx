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
  const carouselRef = useRef<HTMLDivElement>(null);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  const TREASURY: `0x${string}` = "0xd8542F48b9cB090120d2686fb483896424D6A3d8";

  // Get total number of proposals
  const { data: totalProposals } = useScaffoldReadContract({
    contractName: "Chariteth",
    functionName: "getTotalProposals",
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

  // Fetch ongoing projects
  useEffect(() => {
    const fetchOngoingProjects = async () => {
      if (!totalProposals) {
        setLoading(false);
        return;
      }

      try {
        const projects = [];
        const maxToFetch = Math.min(Number(totalProposals), MAX_PROJECTS_TO_FETCH);

        for (let i = 1; i <= maxToFetch; i++) {
          // Note: We would need to implement individual proposal reading
          // For now, let's create some mock data
          const project = {
            id: i,
            title: metaData[i - 1]?.desc ? `Project ${i}` : `Sample Project ${i}`,
            description: metaData[i - 1]?.desc || "A sample charitable project",
            fundingGoal: parseEther("5"),
            totalRaised: parseEther((Math.random() * 3).toFixed(2)),
            creator: "0x1234567890123456789012345678901234567890",
            creationTime: new Date().toLocaleDateString("en-GB"),
            milestones: [],
            currentMilestone: 0,
          };
          projects.push(project);
        }

        setOngoingProjects(projects);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setError("Failed to fetch projects");
        setLoading(false);
      }
    };

    fetchOngoingProjects();
  }, [totalProposals]);

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

  // const handleDonate = async (proposalId: number) => {
  //   if (!connectedAddress) {
  //     alert("Please connect your wallet first");
  //     return;
  //   }

  //   if (!donationAmount) {
  //     alert("Please enter a donation amount");
  //     return;
  //   }

  //   try {
  //     const donationWei = parseEther(donationAmount);

  //     await writeCharitethAsync({
  //       functionName: "donate",
  //       args: [BigInt(proposalId)],
  //       value: donationWei,
  //     });

  //     // Update local state
  //     setOngoingProjects(prevProjects =>
  //       prevProjects.map(project =>
  //         project.id === proposalId ? { ...project, totalRaised: project.totalRaised + donationWei } : project,
  //       ),
  //     );

  //     setDonationAmount("");
  //     setSelectedProject(null);
  //     alert("Donation successful!");
  //   } catch (error) {
  //     console.error("Donation error:", error);
  //     alert(`Donation failed: ${error}`);
  //   }
  // };

  const handleDonate = async (proposalId: number) => {
  if (!connectedAddress) {
    alert("Please connect your wallet first");
    return;
  }
  if (!donationAmount) {
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
    const amount = parseUnits(donationAmount, USDC.decimals);

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
    setDonationAmount("");
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
      <h1 className="flex flex-col items-center gap-2 font-extrabold text-2xl md:text-3xl text-center">
        Ongoing Fundraising Projects
        <div className="mt-2 inline-block rounded-full border border-indigo-300/70 bg-indigo-100 px-3 py-1 font-bold text-indigo-600">
          <span>Earn 1 XP per 0.01 ETH donated</span>
        </div>
      </h1>

      {/* Carousel */}
      <div className="relative my-8 md:my-10">
        <button
          className="absolute top-1/2 left-[-12px] -translate-y-1/2 size-10 rounded-full bg-white border border-slate-200 grid place-items-center text-slate-900 shadow transition-transform hover:scale-105"
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
              <div key={`${project.id}-${index}`} className="min-w-full grid md:grid-cols-2 gap-4 p-5">
                <div
                  className="w-full h-[280px] grid place-items-center text-7xl rounded-[14px] bg-slate-100 text-slate-400"
                  aria-hidden
                >
                  🧬
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{project.title}</h2>
                    <p className="text-slate-600">{project.description}</p>
                  </div>
                  <div className="flex items-baseline gap-2 text-indigo-600 font-extrabold">
                    <p>Funding Goal:</p>
                    <p className="text-slate-900">{project.goal}</p>
                  </div>
                  <input
                    className="input input-bordered"
                    value={donationAmount}
                    onChange={e => setDonationAmount(e.target.value)}
                    placeholder="Amount (USDC)"
                    inputMode="decimal"
                  />
                  <button
                    className="mt-2 rounded-xl bg-gradient-to-r from-indigo-400 to-blue-400 text-slate-900 font-black py-2 px-4 shadow hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={() => handleDonate(project.id)}
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
          className="absolute top-1/2 right-[-12px] -translate-y-1/2 size-10 rounded-full bg-white border border-slate-200 grid place-items-center text-slate-900 shadow transition-transform hover:scale-105"
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
            className={`px-4 py-2 rounded-full border bg-white text-slate-900 font-extrabold text-sm shadow transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
              selectedTag === "Ongoing" ? "bg-indigo-100 border-indigo-300/70 text-indigo-600" : "border-slate-200"
            }`}
            onClick={() => handleTagClick("Ongoing")}
          >
            Ongoing
          </div>
          {[...new Set(metaData.flatMap(item => item.tags))].map((tag, index) => (
            <div
              key={index}
              className={`px-4 py-2 rounded-full border bg-white text-slate-900 font-extrabold text-sm shadow transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                selectedTag === tag ? "bg-indigo-100 border-indigo-300/70 text-indigo-600" : "border-slate-200"
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
          const m = metaData.find(item => item.id === project.id);
          const progressPercentage =
            (Number(formatEther(project.totalRaised)) / Number(formatEther(project.fundingGoal))) * 100;
          return (
            <div
              key={project.id}
              className="bg-white border border-slate-200 rounded-2xl shadow p-4 grid gap-3 transition hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
              onClick={() => openPopup(project)}
            >
              {m?.image && (
                <div
                  className="w-full h-44 grid place-items-center text-5xl bg-slate-100 text-slate-400 rounded-xl overflow-hidden"
                  aria-hidden
                >
                  🧪
                </div>
              )}
              <div className="grid gap-2">
                <div>
                  <h1 className="text-lg font-black">{project.title}</h1>
                </div>
                <p>Funding Goal: {formatEther(project.fundingGoal)} ETH</p>
                <div className="text-slate-600 font-semibold">
                  <p>
                    Raised: {formatEther(project.totalRaised)} ETH / {formatEther(project.fundingGoal)} ETH
                  </p>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-2.5 bg-gradient-to-r from-indigo-400 to-blue-400 transition-[width] duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <button
                    className="mt-2 rounded-xl bg-gradient-to-r from-indigo-400 to-blue-400 text-slate-900 font-black py-2 px-4 shadow hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={e => {
                      e.stopPropagation();
                      handleDonate(project.id);
                    }}
                    disabled={!connectedAddress}
                  >
                    {connectedAddress ? "Donate" : "Connect Wallet"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="mt-8 text-center bg-white border border-slate-200 rounded-2xl shadow p-7">
        <h3 className="text-xl font-black">Are You A Company Looking To Make Giving a Habit?</h3>
        <p className="text-slate-600 font-semibold">
          Set up recurring donations and get monthly CSR reports — effortless, impactful, and transparent.
        </p>
        <a className="inline-block mt-3 bg-gradient-to-r from-indigo-400 to-blue-400 text-slate-900 py-2 px-4 rounded-xl font-black">
          Start Now
        </a>
      </div>

      {/* Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/40 grid place-items-center z-50" onClick={closePopup}>
          <div
            className="w-[92vw] max-w-[950px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-4 bg-white border border-slate-200 text-slate-900 text-lg w-8 h-8 rounded-lg"
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
                <h1 className="text-2xl font-black">{selectedProject.title}</h1>
                <p>{metaData.find(item => item.id === selectedProject.id)?.desc || selectedProject.description}</p>
                <p>Creator: {selectedProject.creator}</p>
                <p>Funding Goal: {formatEther(selectedProject.fundingGoal)} ETH</p>
                <p>
                  Raised: {formatEther(selectedProject.totalRaised)} ETH / {formatEther(selectedProject.fundingGoal)}{" "}
                  ETH
                </p>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-2.5 bg-gradient-to-r from-indigo-400 to-blue-400 transition-[width] duration-300"
                    style={{
                      width: `${(Number(formatEther(selectedProject.totalRaised)) / Number(formatEther(selectedProject.fundingGoal))) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <EtherInput value={donationAmount} onChange={setDonationAmount} placeholder="Amount (ETH)" />
                  <button
                    className="rounded-xl bg-gradient-to-r from-indigo-400 to-blue-400 text-slate-900 font-black py-2 px-4 shadow hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={() => handleDonate(selectedProject.id)}
                    disabled={!connectedAddress || !donationAmount}
                  >
                    {connectedAddress ? "Donate" : "Connect Wallet"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
