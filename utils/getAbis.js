const { writeFileSync } = require('fs');

const EthemeralsOnL2 = require('../src/artifacts/contracts/layer2/EthemeralsOnL2.sol/EthemeralsOnL2.json');
const MeralManager = require('../src/artifacts/contracts/layer2/managers/MeralManager.sol/MeralManager.json');
const Wilds = require('../src/artifacts/contracts/layer2/wilds/Wilds.sol/Wilds.json');
const Onsen = require('../src/artifacts/contracts/layer2/wilds/Onsen.sol/Onsen.json');

const writeABI = (path, abi) => {
	try {
		writeFileSync(path, JSON.stringify(abi, null, 2), 'utf8');
		console.log('written', path);
	} catch (error) {
		console.log('error', error);
	}
};

const main = async () => {
	writeABI('./abi/EthemeralsOnL2.json', EthemeralsOnL2.abi);
	writeABI('./abi/MeralManager.json', MeralManager.abi);
	writeABI('./abi/Wilds.json', Wilds.abi);
	writeABI('./abi/Onsen.json', Onsen.abi);

	// const addresses = [{
	//   EthemeralLifeForce: EthemeralLifeForce.networks['42'].address,
	//   Ethemerals: Ethemerals.networks['42'].address,
	//   EternalBattle: EternalBattle.networks['42'].address,
	//   PriceFeed: PriceFeed.networks['42'].address,
	// }]

	// await writeJsonFile('./abi/Addresses.json', addresses);
};

main();
