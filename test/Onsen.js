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

		const Onsen = await ethers.getContractFactory('Onsen');
		onsen = await Onsen.deploy(merals.address);
		await onsen.deployed();

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
		await merals.addDelegate(onsen.address, true);
		await merals.setAllowDelegates(true);
		await merals.connect(player1).setAllowDelegates(true);
		await merals.connect(player2).setAllowDelegates(true);
		await merals.connect(player3).setAllowDelegates(true);
	});

	function safeScale(number, inMax, outMin, outMax) {
		let scaled = (number * (outMax - outMin)) / inMax + outMin;
		return scaled > outMax ? outMax : scaled;
	}

	const getXp = (now, start, mod) => {
		return parseInt((now - start) / mod);
	};

	const getScore = (now, start, stat, mod) => {
		let scaled = safeScale(stat, 2000, 14, 22);
		return parseInt(((now - start) * parseInt(scaled)) / mod);
	};

	describe('Onsen score and xp gains', function () {
		it('Should allow and restrict admin actions', async function () {
			let meral = await merals.getEthemeral(1);
			let score = meral.score;
			let rewards = meral.rewards;
			let rewardsMod = 7200;
			let scoreMod = 10000;

			await onsen.stake(1);
			let blockNumBefore = await ethers.provider.getBlockNumber();
			let blockBefore = await ethers.provider.getBlock(blockNumBefore);
			let _start = blockBefore.timestamp;

			await network.provider.send('evm_increaseTime', [day * 2]);
			await network.provider.send('evm_mine');

			blockNumBefore = await ethers.provider.getBlockNumber();
			blockBefore = await ethers.provider.getBlock(blockNumBefore);
			let _now = blockBefore.timestamp;

			let change = await onsen.calculateChange(1);
			console.log(change);
			await onsen.unstake(1);
			let value = await merals.getEthemeral(1);

			console.log(value);
			expect(value.rewards - rewards).to.equal(getXp(_now, _start, rewardsMod));
			expect(value.score - score).to.equal(getScore(_now, _start, value.spd, scoreMod));

			rewardsMod = 3600;
			scoreMod = 5000;
			await onsen.setMods(scoreMod, rewardsMod);
			await onsen.stake(2);
			await expect(onsen.connect(player1).setMods(100, 100)).to.be.revertedWith('admin only');
			await expect(onsen.connect(player1).unstake(2)).to.be.revertedWith('owner only');
			await expect(onsen.connect(player1).stake(1)).to.be.revertedWith('ERC721: transfer of token that is not own');

			await network.provider.send('evm_increaseTime', [day * 2]);
			await network.provider.send('evm_mine');

			change = await onsen.calculateChange(2);
			console.log(change);
			await onsen.unstake(2);
			value = await merals.getEthemeral(2);
			console.log(value);
			expect(value.rewards - rewards).to.equal(getXp(_now, _start, rewardsMod));
			expect(value.score - score).to.equal(getScore(_now, _start, value.spd, scoreMod));
		});
	});
});
