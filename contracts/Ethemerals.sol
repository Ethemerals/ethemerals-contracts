// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Ethemerals is ERC721, Ownable {
    event ChangeScore(uint256 tokenId, uint16 score, bool add, uint32 rewards);
    event ChangeRewards(
        uint256 tokenId,
        uint32 rewards,
        bool add,
        uint8 action
    );
    event PriceChange(uint256 price);
    event Mint(uint256 id, uint16 elf, uint16 atk, uint16 def, uint16 spd);
    event DelegateChange(address indexed delegate, bool add);
    event AllowDelegatesChange(address indexed user, bool allow);

    // NFT TOKENOMICS
    // 1-1000 intial sale of 'Ethemerals'
    // max 10,000 Ethemerals

    // Basic minimal struct for an Ethemeral, addon contracts for inventory and stats
    struct Meral {
        uint16 score;
        uint32 rewards;
        uint16 atk;
        uint16 def;
        uint16 spd;
    }

    string private _uri;

    // Nonce used in random function
    uint256 private nonce;

    // MAX SUPPLY
    uint256 public maxMeralSupply = 10001; // #10000 last index, probably in 10 years :)

    // CURRENT SUPPLY
    uint256 public meralSupply = 1; // #0 skipped

    // AVAILABLE
    uint256 public maxMeralIndex;

    // Mint price in ETH
    uint256 public mintPrice = 1 * 10**18; // change once deployed

    // ELF at birth
    uint16 public startingELF = 2000; // need to * 10 ** 18

    // ELF ERC20 address
    address private tokenAddress;

    // Arrays of Ethemerals
    Meral[] private allMerals;

    // mapping of EthemeralsBases (only originals)
    mapping(uint256 => uint16[]) private allMeralBases;

    // Delegates include game masters and auction houses
    mapping(address => bool) private delegates;

    // Default to off. User needs to allow
    mapping(address => bool) private allowDelegates;

    constructor(string memory tUri, address _tokenAddress)
        ERC721("Ethemerals", "MERALS")
    {
        _uri = tUri;
        tokenAddress = _tokenAddress;

        // mint the #0 to fix the maths
        _safeMint(msg.sender, 0);
        allMerals.push(Meral(300, startingELF, 250, 250, 250));
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @dev Mints an Ethemeral
     * Calls internal _mintMerals
     */
    function mintMeral(address recipient) external payable {
        require(maxMeralIndex >= meralSupply, "sale not active");
        require(msg.value >= mintPrice, "not enough");
        _mintMerals(1, recipient);
    }

    /**
     * @dev Mints Ethemerals
     * Calls internal _mintMerals
     */
    function mintMerals(address recipient) external payable {
        require(maxMeralIndex - 2 >= meralSupply, "sale not active");
        require(
            msg.value >= (mintPrice * 3 - ((mintPrice * 3) / 10)),
            "not enough"
        ); // 10% discount
        _mintMerals(3, recipient);
    }

    /**
     * @dev Mints an Ethemeral
     * sets score and startingELF
     * sets random [atk, def, spd]
     */
    function _mintMerals(uint256 amountMerals, address recipient) internal {
        for (uint256 i = 0; i < amountMerals; i++) {
            _safeMint(recipient, meralSupply);

            uint16 atk = uint16(_random(610, nonce + 19) + 100); // max 500
            nonce++;
            uint16 def = uint16(_random(800 - atk, nonce + 24) + 100); // max 451

            uint16 spd = 1000 - atk - def;

            allMerals.push(Meral(300, startingELF, atk, def, spd));

            emit Mint(meralSupply, startingELF, atk, def, spd);

            meralSupply++;
        }
    }

    /**
     * @dev Set or unset delegates
     */
    function setAllowDelegates(bool allow) external {
        allowDelegates[msg.sender] = allow;
        emit AllowDelegatesChange(msg.sender, allow);
    }

    // GM FUNCTIONS

    /**
     * @dev Changes '_tokenId' score by 'offset' amount either 'add' or reduce.
     * clamps score > 0 and <= 1000
     * clamps ELF rewards amounts to something reasonable
     * delegates only
     */
    function changeScore(
        uint256 _tokenId,
        uint16 offset,
        bool add,
        uint32 amount
    ) external {
        require(delegates[msg.sender] == true, "delegates only");
        require(_exists(_tokenId), "not exist");

        Meral storage tokenCurrent = allMerals[_tokenId];

        uint16 _score = tokenCurrent.score;
        uint16 newScore;

        // safemaths
        if (add) {
            uint16 sum = _score + offset;
            newScore = sum > 1000 ? 1000 : sum;
        } else {
            if (_score <= offset) {
                newScore = 0;
            } else {
                newScore = _score - offset;
            }
        }

        tokenCurrent.score = newScore;
        uint32 amountClamped = amount > 10000 ? 10000 : amount; //clamp 10000 tokens
        tokenCurrent.rewards += amountClamped;

        nonce++;
        emit ChangeScore(_tokenId, newScore, add, amountClamped);
    }

    /**
     * @dev Changes '_tokenId' rewards by 'offset' amount either 'add' or reduce.
     * delegates only
     */
    function changeRewards(
        uint256 _tokenId,
        uint32 offset,
        bool add,
        uint8 action
    ) external {
        require(delegates[msg.sender] == true, "delegates only");
        require(_exists(_tokenId), "not exist");

        Meral storage tokenCurrent = allMerals[_tokenId];

        uint32 _rewards = tokenCurrent.rewards;
        uint32 newRewards;
        uint32 offsetClamped;

        // safemaths
        if (add) {
            offsetClamped = offset > 10000 ? 10000 : offset; //clamp 10000 tokens
            newRewards = _rewards + offsetClamped;
        } else {
            if (_rewards <= offset) {
                newRewards = 0;
            } else {
                newRewards = _rewards - offset;
            }
        }

        tokenCurrent.rewards = newRewards;

        nonce++;
        emit ChangeRewards(_tokenId, newRewards, add, action);
    }

    // ADMIN ONLY FUNCTIONS

    // reserve 5 for founders + 5 for give aways
    function mintReserve() external onlyOwner {
        //admin
        maxMeralIndex = 10;
        _mintMerals(10, msg.sender);
    }

    /**
     * @dev Mints Ethemerals Admin Only for giveaways
     * Calls internal _mintMerals
     */
    function mintMeralsAdmin(address recipient, uint256 _amount)
        external
        onlyOwner
    {
        //admin
        require(maxMeralIndex - _amount + 1 >= meralSupply, "sale not active");
        _mintMerals(_amount, recipient);
    }

    function withdraw(address payable to) external onlyOwner {
        //admin
        to.transfer(address(this).balance);
    }

    function setPrice(uint256 _price) external onlyOwner {
        //admin
        mintPrice = _price;
        emit PriceChange(_price);
    }

    function setMaxMeralIndex(uint256 _id) external onlyOwner {
        //admin
        require(_id < maxMeralSupply, "max supply");
        maxMeralIndex = _id;
    }

    function addDelegate(address _delegate, bool add) external onlyOwner {
        //admin
        delegates[_delegate] = add;
        emit DelegateChange(_delegate, add);
    }

    function setBaseURI(string memory newuri) external onlyOwner {
        // ADMIN
        _uri = newuri;
    }

    function setMeralBase(
        uint256 _tokenId,
        uint16 _cmId,
        uint16 _element
    ) external onlyOwner {
        // ADMIN
        allMeralBases[_tokenId] = [_cmId, _element];
    }

    // VIEW ONLY
    function _random(uint256 max, uint256 _nonce)
        private
        view
        returns (uint256)
    {
        return (uint256(
            keccak256(
                abi.encodePacked(
                    _nonce,
                    block.number,
                    block.difficulty,
                    msg.sender
                )
            )
        ) % max);
    }

    function _baseURI() internal view override returns (string memory) {
        return _uri;
    }

    function getEthemeral(uint256 _tokenId)
        external
        view
        returns (Meral memory)
    {
        return allMerals[_tokenId];
    }

    function getMeralBase(uint256 _tokenId)
        external
        view
        returns (uint16[] memory)
    {
        return allMeralBases[_tokenId];
    }

    function totalSupply() public view returns (uint256) {
        return meralSupply;
    }

    /**
     * @dev See {IERC721-isApprovedForAll}.
     * White list for game masters and auction house
     */
    function isApprovedForAll(address _owner, address _operator)
        public
        view
        override
        returns (bool)
    {
        if (allowDelegates[_owner] && (delegates[_operator] == true)) {
            return true;
        }

        return super.isApprovedForAll(_owner, _operator);
    }
}
