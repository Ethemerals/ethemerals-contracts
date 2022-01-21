const hre = require('hardhat');

const metadata = require('../metadata/migrationData.json');
const { getAddresses } = require('./addresses');

const typeMult = 100000;
const getTypeFromId = (id) => {
	return parseInt(parseInt(id) / typeMult);
};

const getTokenIdFromId = (id) => {
	let type = getTypeFromId(id);
	return parseInt(parseInt(id) - parseInt(type) * typeMult);
};

const getIdFromType = (type, tokenId) => {
	return parseInt(parseInt(tokenId) + parseInt(type) * typeMult);
};

let chain = 4;
async function main() {
	async function sleep(millis) {
		return new Promise((resolve) => setTimeout(resolve, millis));
	}
	let admin;
	[admin, player1, player2, player3] = await ethers.getSigners();

	console.log(admin.address);

	const MeralManager = await ethers.getContractFactory('MeralManager');
	const meralManager = await MeralManager.attach(getAddresses(chain).meralManager);

	for (let i = 1; i <= 413; i++) {
		try {
			let meral = metadata[i];

			await meralManager.registerOGMeral(meral.tokenId, meral.score, meral.rewards, meral.atk, meral.def, meral.spd, meral.element, meral.subclass);
			await sleep(10000);

			console.log(i);
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
