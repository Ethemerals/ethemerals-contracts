const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
const { meralsL2Address, meralManagerAddress } = require('./addresses');

const metadata = require('../metadata/migrationData.json');

async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
	const meralsL2 = await EthemeralsL2.attach(meralsL2Address);

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(meralManagerAddress);

	for (let i = 123; i <= 353; i++) {
		try {
			let meral = metadata[i];

			let exists = await meralsL2.exists(i);
			if (!exists) {
				await meralsL2.migrateMeral(meral.tokenId, meral.score, meral.rewards, meral.atk, meral.def, meral.spd, meral.element, meral.subclass);
				await sleep(10000);
			}
			await sleep(2000);
			console.log(i, exists);
		} catch (error) {
			console.log(error, i);
		}
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
