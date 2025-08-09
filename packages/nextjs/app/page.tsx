"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { EtherInput } from "~~/components/scaffold-eth";
import featured from "~~/data/featured.json";
import metaData from "~~/data/metadata.json";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// Removed external stylesheet import
// import "../styles/chariteth.css";

const MAX_PROJECTS_TO_FETCH = 10;

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [ongoingProjects, setOngoingProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedTag, setSelectedTag] = useState("Ongoing");
  const [donationAmount, setDonationAmount] = useState("");
  const carouselRef = useRef<HTMLDivElement>(null);

  const { writeContractAsync: writeCharitethAsync } = useScaffoldWriteContract({
    contractName: "Chariteth",
  });

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
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [nextSlide]);

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

  const handleDonate = async (proposalId: number) => {
    if (!connectedAddress) {
      alert("Please connect your wallet first");
      return;
    }

    if (!donationAmount) {
      alert("Please enter a donation amount");
      return;
    }

    try {
      const donationWei = parseEther(donationAmount);

      await writeCharitethAsync({
        functionName: "donate",
        args: [BigInt(proposalId)],
        value: donationWei,
      });

      // Update local state
      setOngoingProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === proposalId ? { ...project, totalRaised: project.totalRaised + donationWei } : project,
        ),
      );

      setDonationAmount("");
      setSelectedProject(null);
      alert("Donation successful!");
    } catch (error) {
      console.error("Donation error:", error);
      alert(`Donation failed: ${error}`);
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
    <div className="home-ongoing-projects-container">
      <h1 className="home-ongoing-projects-title">
        Ongoing Fundraising Projects
        <div className="home-xp-info">
          <span>Earn 1 XP per 0.01 ETH donated</span>
        </div>
      </h1>

      {/* Carousel */}
      <div className="home-projects-carousel">
        <button className="carousel-nav-button prev" onClick={prevSlide} aria-label="Previous slide">
          ‹
        </button>
        <div className="home-projects-carousel-inner">
          <div
            className="home-carousel-cards"
            ref={carouselRef}
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {extendedFeatured.map((project, index) => (
              <div key={`${project.id}-${index}`} className="home-carousel-card">
                <div className="carousel-image" aria-hidden>
                  🧬
                </div>
                <div className="carousel-content">
                  <div>
                    <h2>{project.title}</h2>
                    <p className="carousel-desc">{project.description}</p>
                  </div>
                  <div className="carousel-goal">
                    <p>Funding Goal:</p>
                    <p className="carousel-goal-fund">{project.goal}</p>
                  </div>
                  <button
                    className="home-donate-button"
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
        <button className="carousel-nav-button next" onClick={nextSlide} aria-label="Next slide">
          ›
        </button>
      </div>

      {/* Tags */}
      <div className="tags">
        <div className="tags-container">
          <div className={`tag ${selectedTag === "Ongoing" ? "active" : ""}`} onClick={() => handleTagClick("Ongoing")}>
            Ongoing
          </div>
          {[...new Set(metaData.flatMap(item => item.tags))].map((tag, index) => (
            <div
              key={index}
              className={`tag ${selectedTag === tag ? "active" : ""}`}
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>

      {/* Project Grid */}
      <div className="home-project-grid">
        {filteredProjects.map(project => {
          const m = metaData.find(item => item.id === project.id);
          const progressPercentage =
            (Number(formatEther(project.totalRaised)) / Number(formatEther(project.fundingGoal))) * 100;
          return (
            <div key={project.id} className="home-project-card" onClick={() => openPopup(project)}>
              {m?.image && (
                <div className="home-project-image" aria-hidden>
                  🧪
                </div>
              )}
              <div className="home-project-summary">
                <div className="home-project-title">
                  <h1>{project.title}</h1>
                </div>
                <p>Funding Goal: {formatEther(project.fundingGoal)} ETH</p>
                <div className="home-fundraising-progress">
                  <p>
                    Raised: {formatEther(project.totalRaised)} ETH / {formatEther(project.fundingGoal)} ETH
                  </p>
                  <div className="home-progress-bar">
                    <div className="home-progress-bar-fill" style={{ width: `${progressPercentage}%` }} />
                  </div>
                  <button
                    className="home-donate-button"
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
      <div className="footer-cta">
        <h3>Are You A Company Looking To Make Giving a Habit?</h3>
        <p>Set up recurring donations and get monthly CSR reports — effortless, impactful, and transparent.</p>
        <a className="cta-button">Start Now</a>
      </div>

      {/* Modal */}
      {selectedProject && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <button className="popup-close-button" onClick={closePopup}>
              ×
            </button>
            <div className="popup-top">
              <div className="popup-image" aria-hidden>
                🔬
              </div>
              <div className="popup-summary">
                <h1>{selectedProject.title}</h1>
                <p>{metaData.find(item => item.id === selectedProject.id)?.desc || selectedProject.description}</p>
                <p>Creator: {selectedProject.creator}</p>
                <p>Funding Goal: {formatEther(selectedProject.fundingGoal)} ETH</p>
                <p>
                  Raised: {formatEther(selectedProject.totalRaised)} ETH / {formatEther(selectedProject.fundingGoal)}{" "}
                  ETH
                </p>
                <div className="home-progress-bar">
                  <div
                    className="home-progress-bar-fill"
                    style={{
                      width: `${(Number(formatEther(selectedProject.totalRaised)) / Number(formatEther(selectedProject.fundingGoal))) * 100}%`,
                    }}
                  />
                </div>
                <div className="popup-buttons">
                  <EtherInput value={donationAmount} onChange={setDonationAmount} placeholder="Amount (ETH)" />
                  <button
                    className="home-donate-button"
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

      {/* Inlined styles (Chariteth look) */}
      <style>{`
        :root { 
          --c-bg:#f7f8fc; 
          --c-card:#ffffff; 
          --c-card-2:#f3f5fb; 
          --c-text:#1c2130; 
          --c-text-dim:#5d6784; 
          --c-accent:#a795ff; 
          --c-accent-2:#7b6ff7; 
          --c-success:#22c55e; 
          --c-warning:#f59e0b; 
          --c-error:#ef4444; 
          --shadow-1: 0 10px 28px rgba(6, 12, 34, 0.08);
        }
        html, body { background: var(--c-bg); color: var(--c-text); }
        .home-ongoing-projects-container { max-width:1200px; margin:0 auto; padding:2rem 1rem 4rem; }
        .home-ongoing-projects-title { display:flex; flex-direction:column; align-items:center; gap:.5rem; font-weight:800; font-size:2rem; text-align:center; }
        .home-xp-info { background:rgba(167,149,255,.15); color:var(--c-accent-2); font-weight:700; padding:.4rem .9rem; border-radius:999px; border:1px solid rgba(123,111,247,.35); }
        .home-projects-carousel { position:relative; margin:2rem 0 2.5rem; }
        .home-projects-carousel-inner { overflow:hidden; border-radius:16px; background:linear-gradient(180deg, var(--c-card), var(--c-card-2)); box-shadow:var(--shadow-1); border:1px solid rgba(12,18,44,.06); }
        .home-carousel-cards { display:flex; transition:transform .5s ease-in-out; }
        .home-carousel-card { min-width:100%; display:grid; grid-template-columns:1fr 1fr; gap:1rem; padding:1.25rem; }
        .carousel-image { width:100%; height:280px; display:grid; place-items:center; font-size:72px; border-radius:14px; background:#eef1fa; color:#9aa3c7; }
        .carousel-content { display:flex; flex-direction:column; justify-content:space-between; }
        .carousel-desc { color:var(--c-text-dim); }
        .carousel-goal { display:flex; align-items:baseline; gap:.5rem; color:var(--c-accent-2); font-weight:800; }
        .carousel-goal-fund { color:var(--c-text); }
        .carousel-nav-button { position:absolute; top:50%; transform:translateY(-50%); width:40px; height:40px; border-radius:50%; background:#ffffff; border:1px solid rgba(12,18,44,.08); display:grid; place-items:center; color:var(--c-text); cursor:pointer; transition:all .2s ease; box-shadow:var(--shadow-1); }
        .carousel-nav-button:hover { transform:translateY(-50%) scale(1.05); }
        .carousel-nav-button.prev { left:-12px; } .carousel-nav-button.next { right:-12px; }
        .tags { margin-bottom:1.5rem; }
        .tags-container { display:flex; flex-wrap:wrap; gap:.5rem; justify-content:center; }
        .tag { padding:.45rem 1rem; border-radius:999px; border:1px solid rgba(12,18,44,.12); background:#ffffff; color:var(--c-text); cursor:pointer; transition:all .2s ease; font-weight:800; font-size:.95rem; box-shadow:0 4px 14px rgba(6,12,34,0.04) }
        .tag:hover { transform: translateY(-1px); box-shadow:0 6px 18px rgba(6,12,34,0.06) }
        .tag.active { background:rgba(167,149,255,.15); border-color:rgba(123,111,247,.45); color:var(--c-accent-2); }
        .home-project-grid { display:grid; grid-template-columns:repeat(1, minmax(0,1fr)); gap:1.25rem; }
        @media (min-width:768px){ .home-project-grid{ grid-template-columns:repeat(2, minmax(0,1fr)); } }
        @media (min-width:1024px){ .home-project-grid{ grid-template-columns:repeat(3, minmax(0,1fr)); } }
        .home-project-card { background:var(--c-card); border:1px solid rgba(12,18,44,.08); border-radius:16px; box-shadow:var(--shadow-1); padding:1rem; display:grid; gap:.75rem; transition:transform .2s ease, box-shadow .2s ease; }
        .home-project-card:hover { transform: translateY(-3px); box-shadow:0 12px 32px rgba(6,12,34,0.12) }
        .home-project-image { width:100%; height:180px; display:grid; place-items:center; font-size:56px; background:#eef1fa; color:#9aa3c7; border-radius:12px; overflow:hidden; }
        .home-project-summary { display:grid; gap:.5rem; }
        .home-project-title h1 { font-size:1.15rem; font-weight:900; }
        .home-fundraising-progress p { color:var(--c-text-dim); font-weight:600; }
        .home-progress-bar { width:100%; height:10px; background:#e9ebf5; border-radius:999px; overflow:hidden; }
        .home-progress-bar-fill { height:10px; background:linear-gradient(90deg, var(--c-accent), #6db4ff); transition: width .4s ease; }
        .home-donate-button { margin-top:.6rem; background:linear-gradient(90deg, var(--c-accent), #6db4ff); color:#0b0f1d; border:none; font-weight:900; padding:.7rem 1.1rem; border-radius:12px; cursor:pointer; transition:transform .2s ease, box-shadow .2s ease; box-shadow:0 6px 20px rgba(123,111,247,.25); }
        .home-donate-button:hover { transform: translateY(-1px) scale(1.01); }
        .home-donate-button:disabled { filter:grayscale(.2); opacity:.7; cursor:not-allowed; }
        .footer-cta { margin-top:2rem; text-align:center; background:#ffffff; border:1px solid rgba(12,18,44,.08); border-radius:16px; box-shadow:var(--shadow-1); padding:1.75rem; }
        .footer-cta h3 { font-size:1.3rem; font-weight:900; }
        .footer-cta p { color:var(--c-text-dim); font-weight:600; }
        .footer-cta .cta-button { display:inline-block; margin-top:.85rem; background:linear-gradient(90deg, var(--c-accent), #6db4ff); color:#0b0f1d; padding:.7rem 1.1rem; border-radius:12px; font-weight:900; }
        .popup-overlay, .thank-you-popup-overlay { position:fixed; inset:0; background:rgba(12,18,44,.35); display:grid; place-items:center; z-index:50; }
        .popup-content, .thank-you-popup-content { width:min(950px, 92vw); background:#ffffff; border:1px solid rgba(12,18,44,.08); border-radius:16px; box-shadow:0 18px 48px rgba(6,12,34,0.18); padding:1.25rem; color:var(--c-text); position:relative; }
        .popup-top { display:grid; gap:1rem; grid-template-columns:1fr; }
        @media (min-width:960px){ .popup-top{ grid-template-columns:320px 1fr; } }
        .popup-close-button { position:absolute; top:12px; right:16px; background:#fff; border:1px solid rgba(12,18,44,.12); color:var(--c-text); font-size:1.1rem; width:34px; height:34px; border-radius:10px; }
        .popup-image { width:100%; height:240px; display:grid; place-items:center; font-size:64px; background:#eef1fa; color:#9aa3c7; border-radius:12px; overflow:hidden; }
        .popup-summary h1 { font-size:1.6rem; font-weight:900; }
        .popup-buttons { display:flex; flex-wrap:wrap; gap:.6rem; margin-top:.9rem; }
        .ai-summary-container { margin-top:1rem; }
        .impact-score { margin-top:.75rem; }
        .impact-score-display { display:grid; gap:.5rem; }
        .impact-score-bar { height:10px; border-radius:999px; background:#e9ebf5; overflow:hidden; }
        .impact-score-fill { height:10px; background:linear-gradient(90deg, var(--c-accent), #6db4ff); }
        .milestone-section { margin-top:1rem; }
        .milestone-card { background:#ffffff; border:1px solid rgba(12,18,44,.08); border-radius:12px; padding:1rem; box-shadow:var(--shadow-1); }
        .close-popup-button { margin-top:.5rem; padding:.5rem .75rem; border-radius:8px; border:1px solid rgba(12,18,44,.12); }
        .home-loading, .home-error, .home-no-projects { text-align:center; padding:2rem 0; color:var(--c-text-dim); }
      `}</style>
    </div>
  );
};

export default Home;
