// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUltraVerifier {
    function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool);
}

/**
 * @notice Welcome to Opportunities contract.
 */
contract Opportunities is Ownable {
    /**
     * @param target Number of units goal
     * @param current Number of units processed
     * @param pricePerUnit Price per unit
     * @param balance Current balance of the opportunity
     */
    struct Opportunity {
        uint256 target;
        uint256 current;
        uint256 pricePerUnit;
        uint256 balance;
        IERC20 token; // ERC20 token contract
        string ipfsHash;
        address[] validators; // List of validators for the opportunity
    }

    address public verifierContractAddress;
    uint256 public totalOpportunities = 0;
    mapping(uint256 => address) public opportunityBy;
    mapping(uint256 => Opportunity) public opportunities;
    mapping(address => mapping(uint256 => bool)) public participants;

    event NewOpportunity(
        uint256 id,
        uint256 target,
        uint256 pricePerUnit,
        address token,
        address[] validators
    );
    event FundOpportunity(uint256 id, uint256 amount);
    event CheckpointOpportunity(uint256 id, uint256 units, address user);
    event JoinOpportunity(uint256 id, address user);
    event VerifierContractAddressUpdated(
        address indexed oldAddress,
        address indexed newAddress
    );

    /**
     * Only the opportunity creator or validators
     */
    modifier onlyValidator(uint256 _id) {
        Opportunity storage opportunity = opportunities[_id];
        require(isValidator(_id, msg.sender), "NOT_ALLOWED");
        _;
    }

    constructor(address _verifierContractAddress) {
        verifierContractAddress = _verifierContractAddress;
    }

    /**
     * Check if the given address is a validator for the opportunity
     */
    function isValidator(
        uint256 _id,
        address _validator
    ) internal view returns (bool) {
        Opportunity storage opportunity = opportunities[_id];
        for (uint256 i = 0; i < opportunity.validators.length; i++) {
            if (opportunity.validators[i] == _validator) {
                return true;
            }
        }
        return false;
    }

    function setVerifierContractAddress(
        address _newVerifierContractAddress
    ) external onlyOwner {
        address oldAddress = verifierContractAddress;
        verifierContractAddress = _newVerifierContractAddress;
        emit VerifierContractAddressUpdated(
            oldAddress,
            _newVerifierContractAddress
        );
    }

    /**
     * @param _target Number of units goal
     * @param _pricePerUnit Price per unit
     * @param _token ERC20 token contract
     * @param _validators List of validators for the opportunity
     */
    function add(
        uint256 _target,
        uint256 _pricePerUnit,
        address _token,
        string memory _ipfsHash,
        address[] memory _validators
    ) external onlyOwner {
        totalOpportunities = totalOpportunities + 1;
        opportunities[totalOpportunities] = Opportunity(
            _target,
            0,
            _pricePerUnit,
            0,
            IERC20(_token),
            _ipfsHash,
            _validators
        );
        opportunityBy[totalOpportunities] = msg.sender;
        emit NewOpportunity(
            totalOpportunities,
            _target,
            _pricePerUnit,
            _token,
            _validators
        );
    }

    function fund(uint256 _id, uint256 _amount) external {
        Opportunity storage opportunity = opportunities[_id];
        opportunity.token.transferFrom(msg.sender, address(this), _amount);
        opportunity.balance += _amount;
        emit FundOpportunity(_id, _amount);
    }

    function join(
        uint256 _id,
        bytes calldata _proof,
        bytes32[] calldata _publicInputs
    ) external {
        IUltraVerifier verifier = IUltraVerifier(verifierContractAddress);
        require(
            verifier.verify(_proof, _publicInputs),
            "INVALID_PROOF"
        );

        Opportunity storage opportunity = opportunities[_id];
        participants[msg.sender][_id] = true;
        emit JoinOpportunity(_id, msg.sender);
    }

    function checkpoint(
        uint256 _id,
        uint256 _units,
        address _participant
    ) external onlyValidator(_id) {
        Opportunity storage opportunity = opportunities[_id];
        uint256 payment = _units * opportunity.pricePerUnit;
        require(participants[_participant][_id], "Participant not joined");
        require(payment <= opportunity.balance, "Not enough funding");
        require(
            opportunity.current + _units <= opportunity.target,
            "Invalid units"
        );
        opportunity.balance -= payment;
        opportunity.current += _units;
        opportunity.token.transfer(_participant, payment);
        emit CheckpointOpportunity(_id, _units, _participant);
    }
}
