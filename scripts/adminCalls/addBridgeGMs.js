const hre = require('hardhat');
const { getAddresses } = require('./addresses');

let chain = 4;

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(getAddresses(chain).meralManagerAddress);

	await meralManager.addGM(admin.address, true);
	await sleep(10000);
	await meralManager.addGM(getAddresses(chain).bridgeGM1, true);
	await sleep(10000);
	await meralManager.addGM(getAddresses(chain).bridgeGM2, true);
	await sleep(10000);
	await meralManager.addGM(getAddresses(chain).bridgeGM3, true);
	await sleep(10000);

	console.log('set gm');
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
