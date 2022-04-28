require('dotenv').config();

const getAddresses = (chain = 1) => {
	let addresses = {
		bridgeGM1: process.env.ADDRESS_MATIC_BRIDGE_1,
		bridgeGM2: process.env.ADDRESS_MATIC_BRIDGE_2,
		bridgeGM3: process.env.ADDRESS_MATIC_BRIDGE_3,
		ethemeralsBurner: '0xDb128597CB3C4F4b1D3C739Dbb2c5350EA84BA0D',
		merals: '0xeE8C0131aa6B66A2CE3cad6D2A039c1473a79a6d',
		meralManager: '0x4aa85b6f9f1a0c08c7cdaea7712272b76c0e599b',
		// ETERNAL BATTLE
		priceFeedProvider: '0xf4996e4254054097fc0e45ca7c2d13e2a357910c',
		eternalBattleL1: '0x169310e61e71ef5834ce5466c7155d8a90d15f1e',
		eternalBattle: '0x8ff56822dd0c291941aa3c1461752d96e690bd95',
		aggregatorMock1: '0xf9680d99d6c9589e2a93a78a04a279e509205945',
		aggregatorMock2: '0xc907e116054ad103354f2d350fd2514433d57f6f',
		// WILDS
		onsen: '0xbb9edd32755e2b626441f0eb24ad44931589d7b5',
		wildsAdmin: '0xd5365E5F68D841Ad50302747B4CdD7ecCfE53eD4',
		wildsStaking: '0x5c84ED29062b0219d8fFC624582E5068fE85fBe8',
		wildsActions: '0xa447936fc06FE9113d656ab490dBeD487Ce7F4c7',
		wilds: '0x7D37289d70E6Ba0907760b6B8fc76C0c987a3efc',
	};

	if (chain === 4) {
		addresses.ethemeralsBurner = '0x3b3D085078E3dAEad342A89bb2A3C2B45bC18828';
		addresses.merals = '0xcdb47e685819638668ff736d1a2ae32b68e76ba5';
		addresses.meralManager = '0xc992e5b95f27f7dbd4f0fc33ad399cd1224844b5';
		addresses.onsen = '0xbb9edd32755e2b626441f0eb24ad44931589d7b5';
		// ETERNAL BATTLE
		addresses.priceFeedProvider = '0x9bc436a5e5bc09b109d4abb23f985a8054a899a4';
		addresses.eternalBattleL1 = '0x883170aaceb39a23642f5aaaab083f5684d3ffb1';
		addresses.eternalBattle = '0x217a369731ea714bc7e8041153ed6f54a20fdbba';
		addresses.aggregatorMock1 = '0x1483512B4988014DAa78af214F4A6100Ff7DE9b9';
		addresses.aggregatorMock2 = '0x770ecd2250fd089c91f57d781b47abd45b112e6a';
		// WILDS
	}

	return addresses;
};

const currentChain = 4;
// aggV3Mock1 deployed to: 0x1483512B4988014DAa78af214F4A6100Ff7DE9b9
// aggV3Mock2 deployed to: 0x770ecd2250fd089c91f57d781b47abd45b112e6a
module.exports = { getAddresses, currentChain };
