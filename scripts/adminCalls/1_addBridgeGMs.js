const hre = require('hardhat');
const { getAddresses, currentChain } = require('./addresses');

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(getAddresses(currentChain).meralManager);

	await meralManager.addValidators(admin.address, true);
	await sleep(10000);
	await meralManager.addValidators(getAddresses(currentChain).bridgeGM1, true);
	await sleep(10000);
	await meralManager.addValidators(getAddresses(currentChain).bridgeGM2, true);
	await sleep(10000);
	await meralManager.addValidators(getAddresses(currentChain).bridgeGM3, true);
	await sleep(10000);

	console.log('set validators');
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
