//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[1] calldata _pubSignals
    ) external view returns (bool);
}

contract LoanBook is Ownable {
    uint256 public nextLoanId;
    address public tokenContractAddress;
    address public verifierContractAddress;

    struct Loan {
        uint256 id;
        address borrower;
        address provider;
        uint256 duration; // Loan duration in seconds
        uint256 interest;
        uint256 amount;
        uint256 debt; // Outstanding amount not yet repaid
        uint256 lastRepaymentTimestamp; // Timestamp of the last repayment
        bool accepted;
        bool claimed;
    }

    struct ProviderInfo {
        bool exists;
        string ipfsHash;
    }

    mapping(address => ProviderInfo) public providers;
    mapping(uint256 => Loan) public loans;

    event LoanRequested(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 interest,
        uint256 duration
    );
    event LoanAccepted(uint256 indexed loanId, address indexed provider);
    event ProviderAdded(address indexed provider, string ipfsHash);
    event ProviderRemoved(address indexed provider);
    event ProviderHashUpdated(address indexed provider, string newIpfsHash);
    event LoanClaimed(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount
    );
    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount
    );
    event TokenContractAddressUpdated(
        address indexed oldAddress,
        address indexed newAddress
    );
    event VerifierContractAddressUpdated(
        address indexed oldAddress,
        address indexed newAddress
    );
    event TokensTransferred(address indexed to, uint256 amount);

    modifier onlyProvider() {
        require(providers[msg.sender].exists, "Not an authorized provider");
        _;
    }

    modifier onlyBorrower(uint256 _loanId) {
        require(loans[_loanId].borrower == msg.sender, "Not the loan borrower");
        _;
    }

    modifier loanNotAccepted(uint256 _loanId) {
        require(!loans[_loanId].accepted, "Loan already accepted");
        _;
    }

    modifier loanNotClaimed(uint256 _loanId) {
        require(!loans[_loanId].claimed, "Loan already claimed");
        _;
    }

    constructor(address _tokenContractAddress, address _verifierContractAddress) {
        tokenContractAddress = _tokenContractAddress;
        verifierContractAddress = _verifierContractAddress;
    }

    function setTokenContractAddress(
        address _newTokenContractAddress
    ) external onlyOwner {
        address oldAddress = tokenContractAddress;
        tokenContractAddress = _newTokenContractAddress;
        emit TokenContractAddressUpdated(oldAddress, _newTokenContractAddress);
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

    function transferTokens(address _to, uint256 _amount) external onlyOwner {
        require(
            tokenContractAddress != address(0),
            "Token contract address not set"
        );
        IERC20 token = IERC20(tokenContractAddress);
        token.transfer(_to, _amount);
        emit TokensTransferred(_to, _amount);
    }

    function addProvider(
        address _provider,
        string memory _ipfsHash
    ) external onlyOwner {
        require(!providers[_provider].exists, "Provider already exists");
        providers[_provider] = ProviderInfo(true, _ipfsHash);
        emit ProviderAdded(_provider, _ipfsHash);
    }

    function updateProviderHash(string memory _ipfsHash) external onlyProvider {
        providers[msg.sender].ipfsHash = _ipfsHash;
        emit ProviderHashUpdated(msg.sender, _ipfsHash);
    }

    function removeProvider(address _provider) external onlyOwner {
        require(providers[_provider].exists, "Provider does not exist");
        delete providers[_provider];
        emit ProviderRemoved(_provider);
    }

    function applyForLoan(
        uint256 _duration,
        uint256 _interest,
        uint256 _amount,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[1] calldata _pubSignals
    ) external returns (uint256) {
        require(_duration > 0, "Invalid loan duration");
        require(_amount > 0, "Invalid loan amount");

        IGroth16Verifier verifier = IGroth16Verifier(verifierContractAddress);
        require(
            verifier.verifyProof(_pA, _pB, _pC, _pubSignals),
            "INVALID_PROOF"
        );

        uint256 loanId = nextLoanId;
        loans[loanId] = Loan({
            id: loanId,
            borrower: msg.sender,
            provider: address(0),
            duration: _duration,
            interest: _interest,
            amount: _amount,
            debt: _amount, // Initial debt is equal to the loan amount
            accepted: false,
            claimed: false,
            lastRepaymentTimestamp: block.timestamp
        });

        nextLoanId++;
        emit LoanRequested(loanId, msg.sender, _amount, _interest, _duration);
        return loanId;
    }

    function acceptLoan(
        uint256 _loanId
    ) external onlyProvider loanNotAccepted(_loanId) {
        Loan storage loan = loans[_loanId];
        require(loan.duration > 0, "Invalid loan duration");

        loan.provider = msg.sender;
        loan.accepted = true;
        emit LoanAccepted(_loanId, msg.sender);
    }

    function claimLoan(
        uint256 _loanId
    ) external onlyBorrower(_loanId) loanNotClaimed(_loanId) {
        Loan storage loan = loans[_loanId];
        require(loan.accepted, "Loan not yet accepted");
        require(
            block.timestamp <= loan.lastRepaymentTimestamp + loan.duration,
            "Loan has matured"
        );

        require(
            tokenContractAddress != address(0),
            "Token contract address not set"
        );
        IERC20 token = IERC20(tokenContractAddress);
        token.transfer(msg.sender, loan.amount);

        loan.debt = loan.amount + ((loan.amount * loan.interest) / 1e18);
        loan.claimed = true;
        emit LoanClaimed(_loanId, msg.sender, loan.amount);
    }

    function repayLoan(
        uint256 _loanId,
        uint256 _amount
    ) external onlyBorrower(_loanId) {
        Loan storage loan = loans[_loanId];
        require(loan.accepted, "Loan not yet accepted");
        require(loan.claimed, "Loan not yet claimed");

        require(
            tokenContractAddress != address(0),
            "Token contract address not set"
        );
        IERC20 token = IERC20(tokenContractAddress);

        // Calculate debt based on the repayment amount
        uint256 repayAmount = calculateDebt(_loanId);
        require(
            _amount <= repayAmount,
            "Repayment amount exceeds the total amount owed"
        );

        if (repayAmount == _amount) {
            loan.debt = 0; // Fully repaid, set debt to zero
        } else {
            loan.debt -= _amount;
        }

        token.transferFrom(msg.sender, address(this), _amount);

        loan.lastRepaymentTimestamp = block.timestamp;
        emit LoanRepaid(_loanId, msg.sender, _amount);
    }

    function getLoanDetails(
        uint256 _loanId
    )
        external
        view
        returns (
            address borrower,
            address provider,
            uint256 duration,
            uint256 interest,
            uint256 amount,
            bool accepted,
            bool claimed,
            uint256 debt
        )
    {
        Loan storage loan = loans[_loanId];

        // Calculate debt amount considering daily interest since the last repayment
        uint256 calculatedDebt = calculateDebt(_loanId);

        return (
            loan.borrower,
            loan.provider,
            loan.duration,
            loan.interest,
            loan.amount,
            loan.accepted,
            loan.claimed,
            calculatedDebt
        );
    }

    function getProviderInfo(
        address _provider
    ) external view returns (bool exists, string memory ipfsHash) {
        ProviderInfo storage info = providers[_provider];
        return (info.exists, info.ipfsHash);
    }

    function calculateDebt(uint256 _loanId) internal view returns (uint256) {
        Loan storage loan = loans[_loanId];

        if (loan.debt == 0) {
            return 0;
        }

        // Calculate the number of full days since the last repayment
        uint256 fullDays = (block.timestamp - loan.lastRepaymentTimestamp) /
            (1 days);

        // Calculate daily interest based on the original loan amount
        uint256 dailyInterest = (loan.interest * loan.amount) / (365 days);

        // Calculate debt amount considering daily interest since the last repayment
        uint256 calculatedDebt = loan.debt + (fullDays * dailyInterest);

        return calculatedDebt;
    }
}
