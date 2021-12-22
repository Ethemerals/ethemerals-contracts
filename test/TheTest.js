// const { expect } = require('chai');
// const { ethers } = require('hardhat');

// describe.only('Test', function () {
// 	let merals;
// 	let wilds;
// 	let admin;
// 	let player1;
// 	let player2;
// 	let player3;
// 	let [min, hour, day, week] = [60, 3600, 86400, 604800];

// 	beforeEach(async function () {
// 		[admin, player1, player2, player3] = await ethers.getSigners();

// 		const Actions = await ethers.getContractFactory('Actions');
// 		actions = await Actions.deploy();
// 		await actions.deployed();

// 		const WildsTest = await ethers.getContractFactory('WildsTest');
// 		wildsTest = await WildsTest.deploy(actions.address);
// 		await wildsTest.deployed();
// 	});

// 	describe('Deployment', function () {
// 		it('Should set the right admin', async function () {
// 			expect(await wildsTest.owner()).to.equal(admin.address);
// 			let value = await wildsTest.owner();
// 			console.log(value);

// 			value = await wildsTest.actions();
// 			console.log(value);

// 			await wildsTest.createStake(1000, 3000);

// 			value = await wildsTest.getStakeEvent(0, 0);
// 			console.log(value);
// 		});
// 	});
// });
