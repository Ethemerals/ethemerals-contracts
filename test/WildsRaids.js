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

	describe('GO RAIDING!', function () {
		it('Should allow death kiss defenders and swap to defenders', async function () {
			let landId = 1;

			for (let i = 1; i <= 5; i++) {
				await merals.changeScore(i, 1000, true, 0);
				await wilds.stake(landId, i, 1);

				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			for (let i = 11; i <= 15; i++) {
				await merals.changeScore(i, 1000, true, 0);
				await wilds.connect(player1).stake(landId, i, 4);

				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			await network.provider.send('evm_increaseTime', [day * 2]);
			await network.provider.send('evm_mine');

			let remainingHealth = await wilds.calculateDamage(1);

			while (remainingHealth > 1) {
				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
				let value = await wilds.calculateDamage(1);
				remainingHealth = 1000 - value;

				if (remainingHealth <= 25) {
					console.log(remainingHealth);
					await expect(wilds.connect(player1).deathKiss(1, 1)).to.be.revertedWith('need success');
					await expect(wilds.connect(player2).deathKiss(25, 21)).to.be.revertedWith('need success');
					await wilds.connect(player1).deathKiss(1, 11);
					let defenderSlots = await wilds.getSlots(1, 1);

					expect(defenderSlots.length).to.equal(4);
					let defender = await merals.getEthemeral(1);
					expect(remainingHealth).to.equal(defender.score);
					break;
				}
			}

			await expect(wilds.stake(landId, 1, 1)).to.be.revertedWith('no reinforcements');

			remainingHealth = await wilds.calculateDamage(2);
			while (remainingHealth > 1) {
				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
				let value = await wilds.calculateDamage(2);
				remainingHealth = 1000 - value;

				if (remainingHealth < 25) {
					console.log(remainingHealth);
					await wilds.connect(player2).deathKiss(2, 21);
					let defenderSlots = await wilds.getSlots(1, 1);
					expect(defenderSlots.length).to.equal(3);
					let defender = await merals.getEthemeral(2);
					expect(remainingHealth).to.equal(defender.score);
					break;
				}
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			// SWAP DEFENDERS
			await wilds.connect(player2).deathKiss(3, 21);
			await wilds.connect(player2).deathKiss(4, 21);
			let defenderSlots = await wilds.getSlots(1, 1);
			expect(defenderSlots.length).to.equal(1);
			let attackerSlots = await wilds.getSlots(1, 4);
			expect(attackerSlots.length).to.equal(5);
			// last defender
			await wilds.connect(player2).deathKiss(5, 21);
			attackerSlots = await wilds.getSlots(1, 4);
			expect(attackerSlots.length).to.equal(0);
			defenderSlots = await wilds.getSlots(1, 1);
			expect(defenderSlots.length).to.equal(5);

			for (let i = 1; i <= 5; i++) {
				let value = await wilds.getStake(i);
				expect(value.stakeAction).to.equal(0);
				expect(await merals.ownerOf(i)).to.equal(admin.address);
			}

			for (let i = 11; i <= 15; i++) {
				let value = await wilds.getStake(i);
				expect(value.stakeAction).to.equal(1);
			}

			await network.provider.send('evm_increaseTime', [day * 3]);
			await network.provider.send('evm_mine');

			for (let i = 11; i <= 15; i++) {
				let value = await wilds.getLCP(1, i);
				console.log(value.toString());
				value = await wilds.calculateDamage(i);
				console.log(value.toString());
			}
		});

		it('Should allow new defenders to swap with another token', async function () {
			let landId = 1;

			for (let i = 1; i <= 5; i++) {
				await merals.changeScore(i, 1000, true, 0);
				await wilds.stake(landId, i, 1);

				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			for (let i = 11; i <= 15; i++) {
				await merals.changeScore(i, 1000, true, 0);
				await wilds.connect(player1).stake(landId, i, 4);

				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			await network.provider.send('evm_increaseTime', [day * 10]);
			await network.provider.send('evm_mine');

			for (let i = 1; i <= 5; i++) {
				await wilds.connect(player1).deathKiss(i, 21);
			}

			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');

			await expect(wilds.swapDefenders(11, 5)).to.be.revertedWith('need success'); // only owner
			await wilds.connect(player2).stake(2, 21, 1);
			await wilds.connect(player2).stake(2, 22, 2);
			await expect(wilds.connect(player2).swapDefenders(22, 23)).to.be.revertedWith('need success'); // not defending

			for (let i = 11; i <= 14; i++) {
				await wilds.connect(player1).swapDefenders(i, i + 5);

				expect(await merals.ownerOf(i)).to.equal(player1.address);
				expect(await merals.ownerOf(i + 5)).to.equal(wilds.address);
				value = await wilds.getStake(i);
				expect(value.stakeAction).to.equal(0);
				value = await wilds.getStake(i + 5);
				expect(value.stakeAction).to.equal(1);
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');
			await expect(wilds.connect(player1).swapDefenders(15, 20)).to.be.revertedWith('need success'); // to late
		});
	});
});
