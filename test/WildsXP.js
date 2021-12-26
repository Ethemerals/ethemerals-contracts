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

	describe('GIVE XP', function () {
		it('Should boot looters and birthers with no defenders and gain XP', async function () {
			const landId = 1;

			for (let i = 1; i <= 5; i++) {
				await merals.changeScore(i, 1000, true, 0);
				await merals.changeScore(i + 10, 1000, true, 0);
				await merals.changeScore(i + 20, 1000, true, 0);
				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
				await wilds.stake(landId, i, 1);
				await wilds.connect(player1).stake(landId, i + 10, 2);
				await wilds.connect(player2).stake(landId, i + 20, 3);
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			for (let i = 1; i <= 5; i++) {
				let stake = await wilds.getStake(i);
				let event = await wilds.getStakeEvent(1, stake.entryPointer);

				const blockNumBefore = await ethers.provider.getBlockNumber();
				const blockBefore = await ethers.provider.getBlock(blockNumBefore);
				const timestamp = blockBefore.timestamp;

				await wilds.unstake(i);
				let value = await merals.getEthemeral(i);
				expect(value.rewards - 2000).to.equal(getXp(timestamp, event.timestamp));
			}

			for (let i = 1; i <= 5; i++) {
				expect(await merals.ownerOf(i + 10)).to.equal(player1.address);
				expect(await merals.ownerOf(i + 20)).to.equal(player2.address);
			}

			for (let i = 1; i <= 5; i++) {
				let value = await merals.getEthemeral(i);
				console.log(value.rewards, i);
				value = await merals.getEthemeral(i + 10);
				console.log(value.rewards, i + 10);
				value = await merals.getEthemeral(i + 20);
				console.log(value.rewards, i + 20);
			}
		});

		it('Should reward merals with XP', async function () {
			const landId = 1;

			for (let i = 1; i <= 5; i++) {
				await merals.changeScore(i, 1000, true, 0);
				await network.provider.send('evm_increaseTime', [day]);
				await network.provider.send('evm_mine');
				await wilds.stake(landId, i, 1);
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			for (let i = 1; i <= 5; i++) {
				let stake = await wilds.getStake(i);
				let event = await wilds.getStakeEvent(1, stake.entryPointer);

				const blockNumBefore = await ethers.provider.getBlockNumber();
				const blockBefore = await ethers.provider.getBlock(blockNumBefore);
				const timestamp = blockBefore.timestamp;

				await wilds.unstake(i);
				let value = await merals.getEthemeral(i);
				expect(value.rewards - 2000).to.equal(getXp(timestamp, event.timestamp));
			}
		});

		it('Should reward LOOTERS AND BIRTHERS with XP', async function () {
			const landId = 1;

			for (let i = 1; i <= 5; i++) {
				await merals.changeScore(i, 1000, true, 0);
				await network.provider.send('evm_increaseTime', [day]);
				await network.provider.send('evm_mine');
				await wilds.stake(landId, i, 1);
				await wilds.connect(player1).stake(landId, 10 + i, 2);
				await wilds.connect(player2).stake(landId, 20 + i, 3);
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			for (let i = 11; i <= 15; i++) {
				let stake = await wilds.getStake(i);
				let event = await wilds.getStakeEvent(1, stake.entryPointer);

				const blockNumBefore = await ethers.provider.getBlockNumber();
				const blockBefore = await ethers.provider.getBlock(blockNumBefore);
				const timestamp = blockBefore.timestamp;

				await wilds.unstake(i);
				let value = await merals.getEthemeral(i);
				expect(value.rewards - 2000).to.equal(getXp(timestamp, event.timestamp));
			}

			for (let i = 21; i <= 25; i++) {
				let stake = await wilds.getStake(i);
				let event = await wilds.getStakeEvent(1, stake.entryPointer);

				const blockNumBefore = await ethers.provider.getBlockNumber();
				const blockBefore = await ethers.provider.getBlock(blockNumBefore);
				const timestamp = blockBefore.timestamp;

				await wilds.unstake(i);
				let value = await merals.getEthemeral(i);
				expect(value.rewards - 2000).to.equal(getXp(timestamp, event.timestamp));
			}
		});

		it('Should reward ATTACKERS WHO NOW DEFENDED with XP', async function () {
			const landId = 1;
			let elapsedTime = 0;

			for (let i = 1; i <= 5; i++) {
				await merals.changeScore(i, 1000, true, 0);
				await wilds.stake(landId, i, 1);
			}

			for (let i = 11; i <= 15; i++) {
				await wilds.connect(player1).stake(landId, i, 4);
			}

			for (let i = 1; i <= 5; i++) {
				let defender = i;
				let attacker = 10 + i;
				let raidAction = 1;
				let staminaCost = await wilds.staminaCosts(raidAction);
				let attackerStamina = await wilds.calculateStamina(attacker);
				if (attackerStamina < staminaCost + 100) {
					await wilds.connect(player1).raidAction(defender, attacker, raidAction);
				}

				await network.provider.send('evm_increaseTime', [day * 6]);
				await network.provider.send('evm_mine');
				elapsedTime += day * 6;

				let damage = await wilds.calculateDamage(defender);
				let meral = await merals.getEthemeral(defender);

				let kiss = parseInt(damage) >= meral.score;
				if (kiss) {
					await wilds.connect(player1).deathKiss(defender, attacker);
				}
			}

			for (let i = 11; i <= 15; i++) {
				await network.provider.send('evm_increaseTime', [day]);
				await network.provider.send('evm_mine');
				elapsedTime += day;

				await wilds.connect(player1).unstake(i);
				let value = await merals.getEthemeral(i);
				expect(value.rewards - 2000).to.equal(elapsedTime / 3600);
			}
		});

		it('Should deathkiss attacker and reward with XP', async function () {
			const landId = 1;

			for (let i = 1; i <= 5; i++) {
				await merals.changeScore(i, 1000, true, 0);
				await wilds.stake(landId, i, 1);
			}
			await wilds.connect(player1).stake(landId, 11, 4);

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			let raidAction = 0;
			let raidActionStamina = await wilds.staminaCosts(raidAction);
			let meral = await merals.getEthemeral(11);
			let rewards = meral.rewards;
			let attackerHP = meral.score;

			while (attackerHP > 25) {
				for (let i = 1; i < 5; i++) {
					let stamina = await wilds.calculateStamina(i);
					if (stamina + raidActionStamina < 100) {
						await wilds.raidAction(11, i, 0);
					}
					let damage = await wilds.calculateDamage(11);
					attackerHP = meral.score - damage;
					console.log(attackerHP);
					await network.provider.send('evm_increaseTime', [hour]);
					await network.provider.send('evm_mine');
				}
			}

			await wilds.deathKiss(11, 1);
			// let land = await wilds.landPlots(1);
			// console.log(land);
			// let slots = await wilds.getSlots(1, 4);
			// console.log(slots);
			meral = await merals.getEthemeral(11);
			expect(meral.rewards).to.be.gt(rewards);
			expect(meral.score).to.be.lt(25);
			// console.log(meral.rewards);

			for (let i = 1; i <= 5; i++) {
				let stake = await wilds.getStake(i);
				let event = await wilds.getStakeEvent(1, stake.entryPointer);

				const blockNumBefore = await ethers.provider.getBlockNumber();
				const blockBefore = await ethers.provider.getBlock(blockNumBefore);
				const timestamp = blockBefore.timestamp;

				await wilds.unstake(i);
				let value = await merals.getEthemeral(i);
				expect(value.rewards - 2000).to.equal(getXp(timestamp, event.timestamp));
			}
		});
	});
});
