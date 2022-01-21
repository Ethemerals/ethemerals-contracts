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

	let value = await meralManager.ownerOf(getIdFromType(1, 264));
	console.log(value);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
