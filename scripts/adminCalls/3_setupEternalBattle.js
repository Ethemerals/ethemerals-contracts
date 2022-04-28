const { ethers } = require('hardhat');
const hre = require('hardhat');
const { getAddresses, currentChain } = require('./addresses');

currentChain;

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(getAddresses(currentChain).meralManager);

	const EternalBattle = await ethers.getContractFactory('EternalBattle');
	const eternalBattle = await EternalBattle.attach(getAddresses(currentChain).eternalBattle);

	let cmIds = [1027];
	await eternalBattle.setCMIDBonus(cmIds, 1, true, true);

	await sleep(5000);
	cmIds = [825, 3408, 4687, 7129, 2563, 4943];
	await eternalBattle.setCMIDBonus(cmIds, 1, false, true);

	await sleep(5000);
	cmIds = [1, 3717, 4023];
	await eternalBattle.setCMIDBonus(cmIds, 2, true, true);

	await sleep(5000);
	cmIds = [825, 3408, 4687, 7129, 2563, 4943];
	await eternalBattle.setCMIDBonus(cmIds, 2, false, true);

	console.log('set CMID');
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
