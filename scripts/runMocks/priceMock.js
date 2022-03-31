const hre = require('hardhat');
const { getAddresses } = require('../adminCalls/addresses');

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

	////////////////////////////

	const Aggrator = await ethers.getContractFactory('AggregatorV3Mock');
	const aggrator1 = await Aggrator.attach(getAddresses(chain).aggregatorMock1);
	const aggrator2 = await Aggrator.attach(getAddresses(chain).aggregatorMock2);

	let price1 = '5320161587121';
	let price2 = '450632446780';
	await aggrator1.updateAnswer(price1);
	console.log('update price');
	await sleep(10000);

	await aggrator2.updateAnswer(price2);
	console.log('update price');
	await sleep(10000);

	const PriceFeedProvider = await ethers.getContractFactory('PriceFeedProvider');
	const priceFeedProvider = await PriceFeedProvider.attach(getAddresses(chain).priceFeedProvider);

	let answer;
	answer = await priceFeedProvider.getLatestPrice(1);
	console.log(answer);

	answer = await priceFeedProvider.getLatestPrice(2);
	console.log(answer);

	//////////////////////////

	// await meralManager.registerMeral(getAddresses(chain).merals, 363, 300, 2000, 665, 475, 371, 10, 4);
	// console.log('register meral');

	const EternalBattle = await ethers.getContractFactory('EternalBattle');
	const eternalBattle = await EternalBattle.attach(getAddresses(chain).eternalBattle);

	// await eternalBattle.createStake(1000363, 1, 255, true);
	await eternalBattle.cancelStake(1000363);
	console.log('stake');
	await sleep(10000);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
