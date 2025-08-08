// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.5.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "hedera-token-service/HederaResponseCodes.sol";
import "hedera-token-service/HederaTokenService.sol";
import "hedera-token-service/IHederaTokenService.sol";
import "hedera-token-service/ExpiryHelper.sol";
import "hedera-token-service/KeyHelper.sol";
import "hedera-token-service/FeeHelper.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract HTSContract is HederaTokenService, ExpiryHelper, KeyHelper, FeeHelper {
    bool finiteTotalSupplyType = true;
    string name = "tokenName";
    string symbol = "tokenSymbol";
    string memo = "memo";
    int64 maxSupply = 20000000000;
    bool freezeDefaultStatus = false;

    event ResponseCode(int responseCode);
    event CreatedToken(address tokenAddress);
    event NonFungibleTokenInfo(IHederaTokenService.NonFungibleTokenInfo tokenInfo);
    event MintedToken(int64 newTotalSupply, int64[] serialNumbers);
    event TransferToken(address tokenAddress, address receiver, int64 amount);

    function nftAirdrop(address token, address sender, address receiver, int64 serial) public payable returns (int64 responseCode) {
        IHederaTokenService.TokenTransferList[] memory tokenTransfers = new IHederaTokenService.TokenTransferList[](1);
        IHederaTokenService.TokenTransferList memory airdrop;

        airdrop.token = token;
        IHederaTokenService.NftTransfer memory nftTransfer = prepareNftTransfer(sender, receiver, serial);
        IHederaTokenService.NftTransfer[] memory nftTransfers = new IHederaTokenService.NftTransfer[](1);
        nftTransfers[0] = nftTransfer;
        airdrop.nftTransfers = nftTransfers;
        tokenTransfers[0] = airdrop;
        responseCode = airdropTokens(tokenTransfers);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
        return responseCode;
    }

    function prepareNftTransfer(address sender, address receiver, int64 serial) internal pure returns (IHederaTokenService.NftTransfer memory nftTransfer) {
        nftTransfer.senderAccountID = sender;
        nftTransfer.receiverAccountID = receiver;
        nftTransfer.serialNumber = serial;
        return nftTransfer;
    }

    function claimNFTAirdrop(address sender, address receiver, address token, int64 serial) public returns(int64 responseCode){
        IHederaTokenService.PendingAirdrop[] memory pendingAirdrops = new IHederaTokenService.PendingAirdrop[](1);

        IHederaTokenService.PendingAirdrop memory pendingAirdrop;
        pendingAirdrop.sender = sender;
        pendingAirdrop.receiver = receiver;
        pendingAirdrop.token = token;
        pendingAirdrop.serial = serial;

        pendingAirdrops[0] = pendingAirdrop;

        responseCode = claimAirdrops(pendingAirdrops);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
        return responseCode;
    }

    function associateTokenPublic(address account, address token) public returns (int responseCode) {
        responseCode = HederaTokenService.associateToken(account, token);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function approveNFTPublic(address token, address approved, uint256 serialNumber) public returns (int responseCode) {
        responseCode = HederaTokenService.approveNFT(token, approved, serialNumber);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function transferNFTPublic(address token, address sender, address receiver, int64 serialNumber) public returns (int responseCode) {
        responseCode = HederaTokenService.transferNFT(token, sender, receiver, serialNumber);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function createNonFungibleTokenWithCustomFeesPublic(
        address _treasury,
        string memory _name,
        string memory _symbol,
        string memory _memo,
        int64 _maxSupply,
        IHederaTokenService.FixedFee[] memory _fixedFees,
        IHederaTokenService.RoyaltyFee[] memory _royaltyFees,
        IHederaTokenService.TokenKey[] memory _keys
    ) public payable {
        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0,
            _treasury,
            8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService
            .HederaToken(
                _name, // Using function parameter
                _symbol,
                _treasury,
                _memo,
                finiteTotalSupplyType,
                _maxSupply,
                false,
                _keys,
                expiry
            );

        (int responseCode, address tokenAddress) = HederaTokenService
            .createNonFungibleTokenWithCustomFees(
                token,
                _fixedFees,
                _royaltyFees
            );

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit CreatedToken(tokenAddress);
    }

    function updateNonFungibleTokenCustomFeesPublic(
        address token, 
        IHederaTokenService.FixedFee[] memory fixedFees,
        IHederaTokenService.RoyaltyFee[] memory royaltyFees
    ) public returns (int responseCode) {
        responseCode = HederaTokenService.updateNonFungibleTokenCustomFees(token, fixedFees, royaltyFees);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert(Strings.toString(uint(responseCode)));
        }
    }

    function getNonFungibleTokenInfoPublic(address token, int64 serialNumber) public returns (int responseCode, IHederaTokenService.NonFungibleTokenInfo memory tokenInfo) {
        (responseCode, tokenInfo) = HederaTokenService.getNonFungibleTokenInfo(token, serialNumber);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit NonFungibleTokenInfo(tokenInfo);
    }

    function transferTokenPublic(address token, address sender, address receiver, int64 amount) public returns (int responseCode) {
        responseCode = HederaTokenService.transferToken(token, sender, receiver, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
    }

    function transferFromPublic(address token, address from, address to, uint256 amount) public returns (int64 responseCode) {
        responseCode = this.transferFrom(token, from, to, amount);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }
    }

    function mintTokenPublic(
        address token,
        int64 amount,
        bytes[] memory metadata
    )
        public
        returns (
            int responseCode,
            int64 newTotalSupply,
            int64[] memory serialNumbers
        )
    {
        (responseCode, newTotalSupply, serialNumbers) = HederaTokenService
            .mintToken(token, amount, metadata);
        emit ResponseCode(responseCode);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit MintedToken(newTotalSupply, serialNumbers);
    }

    function mintTokenToAddressPublic(
        address token,
        address receiver,
        int64 amount,
        bytes[] memory metadata
    )
        public
        returns (
            int responseCode,
            int64 newTotalSupply,
            int64[] memory serialNumbers
        )
    {
        (responseCode, newTotalSupply, serialNumbers) = mintTokenPublic(
            token,
            amount,
            metadata
        );

        HederaTokenService.transferToken(
            token,
            address(this),
            receiver,
            amount
        );
        emit TransferToken(token, receiver, amount);
    }

    function mintNonFungibleTokenToAddressPublic(
        address token,
        address receiver,
        int64 amount,
        bytes[] memory metadata
    )
        public
        returns (
            int responseCode,
            int64 newTotalSupply,
            int64[] memory serialNumbers
        )
    {
        (responseCode, newTotalSupply, serialNumbers) = mintTokenPublic(
            token,
            amount,
            metadata
        );

        HederaTokenService.transferNFT(
            token,
            address(this),
            receiver,
            serialNumbers[0]
        );
        emit TransferToken(token, receiver, amount);
    }

    function createNonFungibleTokenPublic(
        string memory _name,
        string memory _symbol,
        string memory _memo,
        int64 _maxSupply,
        address _treasury,
        IHederaTokenService.TokenKey[] memory _keys
    ) public payable {
        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0,
            _treasury,
            8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService
            .HederaToken(
                _name, // Using function parameter
                _symbol,
                _treasury,
                _memo,
                finiteTotalSupplyType,
                _maxSupply,
                false,
                _keys,
                expiry
            );

        (int responseCode, address tokenAddress) = HederaTokenService
            .createNonFungibleToken(token);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }

        emit CreatedToken(tokenAddress);
    }

    function createNonFungibleTokenWithSECP256K1AdminKeyPublic(
        address treasury, bytes memory adminKey
    ) public payable {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](6);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyType.PAUSE, KeyValueType.SECP256K1, adminKey);
        keys[1] = getSingleKey(KeyType.KYC, KeyValueType.SECP256K1, adminKey);
        keys[2] = getSingleKey(KeyType.FREEZE, KeyValueType.SECP256K1, adminKey);
        keys[3] = getSingleKey(KeyType.SUPPLY, KeyValueType.SECP256K1, adminKey);
        keys[4] = getSingleKey(KeyType.WIPE, KeyValueType.SECP256K1, adminKey);
        keys[5] = getSingleKey(KeyType.FEE, KeyValueType.SECP256K1, adminKey);

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, finiteTotalSupplyType, maxSupply, freezeDefaultStatus, keys, expiry
        );

        (int responseCode, address tokenAddress) =
        HederaTokenService.createNonFungibleToken(token);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);
    }

    function createNonFungibleTokenWithSECP256K1AdminKeyWithoutKYCPublic(
        address treasury, bytes memory adminKey
    ) public payable {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](4);
        keys[0] = getSingleKey(KeyType.ADMIN, KeyType.PAUSE, KeyValueType.SECP256K1, adminKey);
        keys[1] = getSingleKey(KeyType.FREEZE, KeyValueType.SECP256K1, adminKey);
        keys[2] = getSingleKey(KeyType.SUPPLY, KeyValueType.SECP256K1, adminKey);
        keys[3] = getSingleKey(KeyType.WIPE, KeyValueType.SECP256K1, adminKey);

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0, treasury, 8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken(
            name, symbol, treasury, memo, finiteTotalSupplyType, maxSupply, freezeDefaultStatus, keys, expiry
        );

        (int responseCode, address tokenAddress) =
        HederaTokenService.createNonFungibleToken(token);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        emit CreatedToken(tokenAddress);
    }

    function tokenAirdrop(address token, address sender, address receiver, int64 amount) public payable returns (int64 responseCode) {
        IHederaTokenService.TokenTransferList[] memory tokenTransfers = new IHederaTokenService.TokenTransferList[](1);
        IHederaTokenService.TokenTransferList memory airdrop;

        airdrop.token = token;
        airdrop.transfers = createAccountTransferPair(sender, receiver, amount);
        tokenTransfers[0] = airdrop;
        responseCode = airdropTokens(tokenTransfers);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
        return responseCode;
    }

    function createAccountTransferPair(address sender, address receiver, int64 amount) internal pure returns (IHederaTokenService.AccountAmount[] memory transfers) {
        IHederaTokenService.AccountAmount memory aa1;
        aa1.accountID = sender;
        aa1.amount = -amount;
        IHederaTokenService.AccountAmount memory aa2;
        aa2.accountID = receiver;
        aa2.amount = amount;
        transfers = new IHederaTokenService.AccountAmount[](2);
        transfers[0] = aa1;
        transfers[1] = aa2;
        return transfers;
    }

    function claimMultipleAirdrops(address[] memory senders, address[] memory receivers, address[] memory tokens, int64[] memory serials) public returns (int64 responseCode) {
        uint length = senders.length;
        IHederaTokenService.PendingAirdrop[] memory pendingAirdrops = new IHederaTokenService.PendingAirdrop[](length);
        for (uint i = 0; i < length; i++) {
            IHederaTokenService.PendingAirdrop memory pendingAirdrop;
            pendingAirdrop.sender = senders[i];
            pendingAirdrop.receiver = receivers[i];
            pendingAirdrop.token = tokens[i];
            pendingAirdrop.serial = serials[i];

            pendingAirdrops[i] = pendingAirdrop;
        }

        responseCode = claimAirdrops(pendingAirdrops);
        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert();
        }
        return responseCode;
    }
}
