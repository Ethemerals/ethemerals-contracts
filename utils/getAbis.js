const { writeFileSync } = require('fs');

const EthemeralsBurner = require('../src/artifacts/contracts/EthemeralsBurner.sol/EthemeralsBurner.json');
const MeralManager = require('../src/artifacts/contracts/layer2/managers/MeralManager.sol/MeralManager.json');
const Wilds = require('../src/artifacts/contracts/layer2/wilds/Wilds.sol/Wilds.json');
const Onsen = require('../src/artifacts/contracts/layer2/wilds/Onsen.sol/Onsen.json');
const EscrowL1 = require('../src/artifacts/contracts/EscrowOnL1.sol/EscrowOnL1.json');
const ERC721 = require('../src/artifacts/@openzeppelin/contracts/token/ERC721/ERC721.sol/ERC721.json');

const writeABI = (path, abi) => {
	try {
		writeFileSync(path, JSON.stringify(abi, null, 2), 'utf8');
		console.log('written', path);
	} catch (error) {
		console.log('error', error);
	}
};

const main = async () => {
	writeABI('./abi/EthemeralsBurner.json', EthemeralsBurner.abi);
	writeABI('./abi/MeralManager.json', MeralManager.abi);
	writeABI('./abi/Wilds.json', Wilds.abi);
	writeABI('./abi/Onsen.json', Onsen.abi);
	writeABI('./abi/EscrowL1.json', EscrowL1.abi);
	writeABI('./abi/ERC721.json', ERC721.abi);

	// const addresses = [{
	//   EthemeralLifeForce: EthemeralLifeForce.networks['42'].address,
	//   Ethemerals: Ethemerals.networks['42'].address,
	//   EternalBattle: EternalBattle.networks['42'].address,
	//   PriceFeed: PriceFeed.networks['42'].address,
	// }]

	// await writeJsonFile('./abi/Addresses.json', addresses);
};

main();
