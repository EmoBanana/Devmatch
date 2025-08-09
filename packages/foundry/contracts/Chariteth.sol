//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "forge-std/console.sol";

/**
 * Chariteth - A decentralized fundraising platform for charitable projects
 * Allows project creation, milestone-based funding, and transparent donations
 */
contract Chariteth {
    // Enums
    enum ProposalStatus { Pending, Active, Completed, Cancelled }
    enum MilestoneStatus { Pending, Submitted, Approved, Rejected }

    // Structs
    struct Milestone {
        string title;
        string description;
        uint256 percentage;
        uint256 fundsAllocated;
        string documentHash;
        MilestoneStatus status;
        uint256 submissionTime;
        uint256 approvalDeadline;
    }

    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 fundingGoal;
        uint256 totalRaised;
        address creator;
        uint256 creationTime;
        ProposalStatus status;
        uint256 currentMilestone;
        Milestone[] milestones;
    }

    // State variables
    address public owner;
    uint256 public nextProposalId = 1;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public userXP;
    mapping(uint256 => mapping(address => uint256)) public donations; // proposalId => donor => amount

    // Constants
    uint256 public constant XP_PER_ETH = 100; // 100 XP per 1 ETH donated

    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed creator, string title, uint256 fundingGoal);
    event DonationMade(uint256 indexed proposalId, address indexed donor, uint256 amount, uint256 xpEarned);
    event MilestoneSubmitted(uint256 indexed proposalId, uint256 milestoneIndex);
    event MilestoneApproved(uint256 indexed proposalId, uint256 milestoneIndex);
    event ProposalCompleted(uint256 indexed proposalId);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    /**
     * Create a new fundraising proposal with milestones
     */
    function createProposal(
        string memory _title,
        string memory _description,
        uint256 _fundingGoal,
        string[] memory _milestonesTitles,
        string[] memory _milestonesDescriptions,
        uint256[] memory _milestonesPercentages
    ) external {
        require(_milestonesTitles.length == _milestonesDescriptions.length, "Milestone arrays length mismatch");
        require(_milestonesTitles.length == _milestonesPercentages.length, "Milestone arrays length mismatch");
        
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _milestonesPercentages.length; i++) {
            totalPercentage += _milestonesPercentages[i];
        }
        require(totalPercentage == 100, "Milestones must total 100%");

        uint256 proposalId = nextProposalId++;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.title = _title;
        newProposal.description = _description;
        newProposal.fundingGoal = _fundingGoal;
        newProposal.creator = msg.sender;
        newProposal.creationTime = block.timestamp;
        newProposal.status = ProposalStatus.Active;
        newProposal.currentMilestone = 0;

        // Add milestones
        for (uint256 i = 0; i < _milestonesTitles.length; i++) {
            newProposal.milestones.push(Milestone({
                title: _milestonesTitles[i],
                description: _milestonesDescriptions[i],
                percentage: _milestonesPercentages[i],
                fundsAllocated: (_fundingGoal * _milestonesPercentages[i]) / 100,
                documentHash: "",
                status: MilestoneStatus.Pending,
                submissionTime: 0,
                approvalDeadline: 0
            }));
        }

        emit ProposalCreated(proposalId, msg.sender, _title, _fundingGoal);
    }

    /**
     * Donate to a project and earn XP
     */
    function donate(uint256 _proposalId) external payable {
        require(msg.value > 0, "Donation must be greater than 0");
        require(proposals[_proposalId].status == ProposalStatus.Active, "Proposal not active");
        
        Proposal storage proposal = proposals[_proposalId];
        proposal.totalRaised += msg.value;
        donations[_proposalId][msg.sender] += msg.value;

        // Calculate XP: 1 XP per 0.01 ETH
        uint256 xpEarned = (msg.value * XP_PER_ETH) / 1 ether;
        userXP[msg.sender] += xpEarned;

        emit DonationMade(_proposalId, msg.sender, msg.value, xpEarned);

        // Check if funding goal is reached
        if (proposal.totalRaised >= proposal.fundingGoal) {
            proposal.status = ProposalStatus.Completed;
            emit ProposalCompleted(_proposalId);
        }
    }

    /**
     * Get proposal details including milestones
     */
    function getProposalDetails(uint256 _proposalId) external view returns (
        uint256 id,
        string memory title,
        string memory description,
        uint256 fundingGoal,
        uint256 totalRaised,
        address creator,
        uint256 creationTime,
        ProposalStatus status,
        uint256 currentMilestone,
        Milestone[] memory milestones
    ) {
        require(_proposalId < nextProposalId && _proposalId > 0, "Proposal does not exist");
        
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.title,
            proposal.description,
            proposal.fundingGoal,
            proposal.totalRaised,
            proposal.creator,
            proposal.creationTime,
            proposal.status,
            proposal.currentMilestone,
            proposal.milestones
        );
    }

    /**
     * Get user's XP balance
     */
    function getUserXP(address _user) external view returns (uint256) {
        return userXP[_user];
    }

    /**
     * Get user's donation amount to a specific project
     */
    function getUserDonation(uint256 _proposalId, address _user) external view returns (uint256) {
        return donations[_proposalId][_user];
    }

    /**
     * Get total number of proposals
     */
    function getTotalProposals() external view returns (uint256) {
        return nextProposalId - 1;
    }

    /**
     * Withdraw donations (only by project creator)
     */
    function withdrawDonations(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(msg.sender == proposal.creator, "Only creator can withdraw");
        require(proposal.totalRaised > 0, "No funds to withdraw");

        uint256 amount = proposal.totalRaised;
        proposal.totalRaised = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * Emergency withdraw (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success, "Emergency withdrawal failed");
    }
}