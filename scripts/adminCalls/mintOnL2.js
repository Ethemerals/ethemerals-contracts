const hre = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('../../test/utils');
let allMeralStats = MeralsL1Data();

const meralsL2Address = '0x4778F420D9a1827e77bd4FB54EcAB65783062fB5';
const meralManagerAddress = '0x1F4d4cDb96801A343492527b96E2C4dE7Bda5b74';

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

	for (let i = 233; i <= 236; i++) {
		try {
			let meralStats = allMeralStats[i];
			await meralsL2.migrateMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
			await sleep(4000);
			let value = await meralManager.getMeral(1, i);
			console.log('tokenId:', i, value.subclass);
			let owner = await meralsL2.ownerOf(i);
			if (owner.toLowerCase() !== meralManagerAddress.toLowerCase()) {
				console.log('no owner', i);
			}
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
