const { expect } = require('chai');
const { ethers } = require('hardhat');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('Wilds', function () {
	let merals;
	let wilds;
	let admin;
	let player1;
	let player2;
	let player3;
	let [min, hour, day, week] = [60, 3600, 86400, 604800];

	const makeRaid = async () => {
		const landId = 1;
		for (let i = 1; i <= 5; i++) {
			await merals.changeScore(i, 1000, true, 0);
			await wilds.stake(landId, i, 1);
			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');
		}

		for (let i = 11; i <= 15; i++) {
			await wilds.connect(player1).stake(landId, i, 4);
			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');
		}
	};

	const getXp = (now, start) => {
		return parseInt((now - start) / 3600);
	};

	beforeEach(async function () {
		[admin, player1, player2, player3] = await ethers.getSigners();

		const Ethemerals = await ethers.getContractFactory('Ethemerals');
		merals = await Ethemerals.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ADDRESS
		await merals.deployed();

		const WildsAdminActions = await ethers.getContractFactory('WildsAdminActions');
		wildsAdminActions = await WildsAdminActions.deploy();
		await wildsAdminActions.deployed();

		const WildsStaking = await ethers.getContractFactory('WildsStaking');
		wildsStaking = await WildsStaking.deploy();
		await wildsStaking.deployed();

		const WildsActions = await ethers.getContractFactory('WildsActions');
		wildsActions = await WildsActions.deploy();
		await wildsActions.deployed();

		const Wilds = await ethers.getContractFactory('Wilds');

		wilds = await Wilds.deploy(merals.address, wildsAdminActions.address, wildsStaking.address, wildsActions.address);
		await wilds.deployed();

		// mint merals
		await merals.mintReserve();
		await merals.setPrice(0);
		await merals.setMaxMeralIndex(1000);

		await network.provider.send('evm_increaseTime', [day]);
		await network.provider.send('evm_mine');

		await merals.mintMeralsAdmin(player1.address, 10); // ID starts at 11
		await merals.mintMeralsAdmin(player2.address, 10); // ID starts at 21
		await merals.mintMeralsAdmin(player3.address, 10); // ID starts at 31

		// set and allow delegates
		await merals.addDelegate(wilds.address, true);
		await merals.addDelegate(admin.address, true);
		await merals.setAllowDelegates(true);
		await merals.connect(player1).setAllowDelegates(true);
		await merals.connect(player2).setAllowDelegates(true);
		await merals.connect(player3).setAllowDelegates(true);
	});

	describe('BIRTHING', function () {
		it.only('Should slowly damage birthers', async function () {
			const landId = 1;

			for (let i = 1; i <= 5; i++) {
				await merals.changeScore(i, 1000, true, 0);
				await merals.changeScore(i + 10, 1000, true, 0);
				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
				await wilds.stake(landId, i, 1);
				await wilds.connect(player1).stake(landId, i + 10, 3);
			}

			for (let i = 1; i <= 5; i++) {
				await wilds.connect(player2).stake(landId, i + 20, 4);
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			for (let i = 1; i <= 5; i++) {
				// let damage = await wilds.calculateDamage(i + 10);
				// console.log(damage, 'birth');
				// damage = await wilds.calculateDamage(i + 20);
				// console.log(damage, 'looters');
				// damage = await wilds.calculateDamage(i);
				// console.log(damage, 'defenders');
				await wilds.unstake(i + 10);
			}

			for (let i = 1; i <= 5; i++) {
				let meral = await merals.getEthemeral(i + 10);
				console.log(meral.score);
				expect(meral.score).to.be.lt(1000);
			}
		});
	});
});
