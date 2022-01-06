const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('./utils');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('Wilds XP', function () {
	let merals;
	let meralsL2;
	let escrowL1;
	let escrowL2;
	let meralManager;
	let wilds;
	let onsen;
	let admin;
	let player1;
	let player2;
	let player3;
	let [min, hour, day, week] = [60, 3600, 86400, 604800];
	let allMeralStats = MeralsL1Data();

	const getOGMeralId = async (tokenId) => {
		let type = 1;
		let id = await meralManager.getIdFromType(type, tokenId);
		return id;
	};

	const makeRaid = async () => {
		const landId = 1;
		for (let i = 1; i <= 5; i++) {
			let id = await getOGMeralId(i);
			await meralManager.changeHP(id, 1000, true, 0);
			await wilds.stake(landId, id, 1);
			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');
		}

		for (let i = 11; i <= 15; i++) {
			let id = getOGMeralId(i);
			await wilds.connect(player1).stake(landId, id, 4);
			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');
		}
	};

	beforeEach(async function () {
		[admin, player1, player2, player3] = await ethers.getSigners();

		// L1 Contracts
		const Ethemerals = await ethers.getContractFactory('Ethemerals');
		merals = await Ethemerals.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ELF ADDRESS
		await merals.deployed();

		const EscrowL1 = await ethers.getContractFactory('EscrowOnL1');
		escrowL1 = await EscrowL1.deploy(merals.address);
		await escrowL1.deployed();

		// L2 Contracts
		const MeralManager = await ethers.getContractFactory('MeralManager');
		meralManager = await MeralManager.deploy('0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // TODO random register
		await meralManager.deployed();

		const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
		meralsL2 = await EthemeralsL2.deploy(meralManager.address);
		await meralsL2.deployed();

		const EscrowL2 = await ethers.getContractFactory('EscrowOnL2');
		escrowL2 = await EscrowL2.deploy(meralsL2.address);
		await escrowL2.deployed();

		// L2 Wilds Contracts
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

		wilds = await Wilds.deploy(meralManager.address, wildsAdminActions.address, wildsStaking.address, wildsActions.address);
		await wilds.deployed();

		const Onsen = await ethers.getContractFactory('Onsen');
		onsen = await Onsen.deploy(meralManager.address);
		await onsen.deployed();

		// L1 mint merals
		await merals.mintReserve();
		await merals.setPrice(0);
		await merals.setMaxMeralIndex(1000);

		await network.provider.send('evm_increaseTime', [day]);
		await network.provider.send('evm_mine');

		await merals.mintMeralsAdmin(player1.address, 10); // ID starts at 11
		await merals.mintMeralsAdmin(player2.address, 10); // ID starts at 21
		await merals.mintMeralsAdmin(player3.address, 10); // ID starts at 31

		// NODE BACKEND MINT (MIGRATE) TO L2
		await meralManager.addGM(admin.address, true);
		await meralManager.addGM(meralsL2.address, true);
		await meralManager.addMeralContracts(1, meralsL2.address);
		await meralsL2.setEscrowAddress(escrowL2.address);

		for (let i = 1; i <= 40; i++) {
			let meralStats = allMeralStats[i];
			await meralsL2.migrateMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		}

		// set and allow delegates
		await merals.addDelegate(escrowL1.address, true);
		await merals.connect(admin).setAllowDelegates(true);
		await merals.connect(player1).setAllowDelegates(true);
		await merals.connect(player2).setAllowDelegates(true);
		await merals.connect(player3).setAllowDelegates(true);

		// DO ESCROW ON L1
		for (let i = 1; i <= 10; i++) {
			await escrowL1.deposit(i);
		}
		for (let i = 11; i <= 20; i++) {
			await escrowL1.connect(player1).deposit(i);
		}
		for (let i = 21; i <= 30; i++) {
			await escrowL1.connect(player2).deposit(i);
		}
		for (let i = 31; i <= 40; i++) {
			await escrowL1.connect(player3).deposit(i);
		}

		// DO ESCROW ON L2
		for (let i = 1; i <= 10; i++) {
			await escrowL2.transferToOwner(i, admin.address, i);
		}
		for (let i = 11; i <= 20; i++) {
			await escrowL2.transferToOwner(i, player1.address, i);
		}
		for (let i = 21; i <= 30; i++) {
			await escrowL2.transferToOwner(i, player2.address, i);
		}
		for (let i = 31; i <= 40; i++) {
			await escrowL2.transferToOwner(i, player3.address, i);
		}

		// // set and allow delegates
		await meralManager.addGM(onsen.address, true);
		await meralManager.addGM(wilds.address, true);
		await meralsL2.addDelegate(meralManager.address, true);
	});

	const getXp = (now, start) => {
		return parseInt((now - start) / 3600);
	};

	describe('GIVE XP', function () {
		it('Should boot looters and birthers with no defenders and gain XP', async function () {
			const landId = 1;

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				let id_b = getOGMeralId(i + 10);
				let id_c = getOGMeralId(i + 20);
				await meralManager.changeHP(id, 1000, true, 0);
				await meralManager.changeHP(id_b, 1000, true, 0);
				await meralManager.changeHP(id_c, 1000, true, 0);
				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
				await wilds.stake(landId, id, 1);
				await wilds.connect(player1).stake(landId, id_b, 2);
				await wilds.connect(player2).stake(landId, id_c, 3);
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				let stake = await wilds.stakes(id);
				let event = await wilds.stakeEvents(1, stake.entryPointer);

				const blockNumBefore = await ethers.provider.getBlockNumber();
				const blockBefore = await ethers.provider.getBlock(blockNumBefore);
				const timestamp = blockBefore.timestamp;

				await wilds.unstake(id);
				let value = await meralManager.getMeralById(id);
				expect(value.xp - 2000).to.equal(getXp(timestamp, event.timestamp));
			}

			for (let i = 1; i <= 5; i++) {
				expect(await meralsL2.ownerOf(i + 10)).to.equal(player1.address);
				expect(await meralsL2.ownerOf(i + 20)).to.equal(player2.address);
			}

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				let id_b = getOGMeralId(i + 10);
				let id_c = getOGMeralId(i + 20);
				let value = await meralManager.getMeralById(id);
				console.log(value.xp, i);
				value = await meralManager.getMeralById(id_b);
				console.log(value.xp, i + 10);
				value = await meralManager.getMeralById(id_c);
				console.log(value.xp, i + 20);
			}
		});

		it('Should reward merals with XP', async function () {
			const landId = 1;

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				await meralManager.changeHP(id, 1000, true, 0);
				await network.provider.send('evm_increaseTime', [day]);
				await network.provider.send('evm_mine');
				await wilds.stake(landId, id, 1);
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				let stake = await wilds.stakes(id);
				let event = await wilds.stakeEvents(1, stake.entryPointer);

				const blockNumBefore = await ethers.provider.getBlockNumber();
				const blockBefore = await ethers.provider.getBlock(blockNumBefore);
				const timestamp = blockBefore.timestamp;

				await wilds.unstake(id);
				let value = await meralManager.getMeralById(id);
				expect(value.xp - 2000).to.equal(getXp(timestamp, event.timestamp));
			}
		});

		it('Should reward LOOTERS AND BIRTHERS with XP', async function () {
			const landId = 1;

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				let id_b = getOGMeralId(i + 10);
				let id_c = getOGMeralId(i + 20);
				await meralManager.changeHP(id, 1000, true, 0);
				await network.provider.send('evm_increaseTime', [day]);
				await network.provider.send('evm_mine');
				await wilds.stake(landId, id, 1);
				await wilds.connect(player1).stake(landId, id_b, 2);
				await wilds.connect(player2).stake(landId, id_c, 3);
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			for (let i = 11; i <= 15; i++) {
				let id = getOGMeralId(i);
				let stake = await wilds.stakes(id);
				let event = await wilds.stakeEvents(1, stake.entryPointer);

				const blockNumBefore = await ethers.provider.getBlockNumber();
				const blockBefore = await ethers.provider.getBlock(blockNumBefore);
				const timestamp = blockBefore.timestamp;

				await wilds.unstake(id);
				let value = await meralManager.getMeralById(id);
				expect(value.xp - 2000).to.equal(getXp(timestamp, event.timestamp));
			}

			for (let i = 21; i <= 25; i++) {
				let id = getOGMeralId(i);
				let stake = await wilds.stakes(id);
				let event = await wilds.stakeEvents(1, stake.entryPointer);

				const blockNumBefore = await ethers.provider.getBlockNumber();
				const blockBefore = await ethers.provider.getBlock(blockNumBefore);
				const timestamp = blockBefore.timestamp;

				await wilds.unstake(id);
				let value = await meralManager.getMeralById(id);
				expect(value.xp - 2000).to.equal(getXp(timestamp, event.timestamp));
			}
		});

		it('Should reward ATTACKERS WHO NOW DEFENDED with XP', async function () {
			const landId = 1;
			let elapsedTime = 0;

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				await meralManager.changeHP(id, 1000, true, 0);
				await wilds.stake(landId, id, 1);
			}

			for (let i = 11; i <= 15; i++) {
				let id = getOGMeralId(i);
				await wilds.connect(player1).stake(landId, id, 4);
			}

			for (let i = 1; i <= 5; i++) {
				let defender = getOGMeralId(i);
				let attacker = getOGMeralId(i + 10);
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
				let meral = await meralManager.getMeralById(defender);

				let kiss = parseInt(damage) >= meral.hp;
				if (kiss) {
					await wilds.connect(player1).deathKiss(defender, attacker);
				}
			}

			for (let i = 11; i <= 15; i++) {
				let id = getOGMeralId(i);
				await network.provider.send('evm_increaseTime', [day]);
				await network.provider.send('evm_mine');
				elapsedTime += day;

				await wilds.connect(player1).unstake(id);
				let value = await meralManager.getMeralById(id);
				expect(value.xp - 2000).to.equal(elapsedTime / 3600);
			}
		});

		it('Should deathkiss attacker and reward with XP', async function () {
			const landId = 1;

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				await meralManager.changeHP(id, 1000, true, 0);
				await wilds.stake(landId, id, 1);
			}

			let id11 = getOGMeralId(11);
			await wilds.connect(player1).stake(landId, id11, 4);

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			let raidAction = 0;
			let raidActionStamina = await wilds.staminaCosts(raidAction);
			let meral = await meralManager.getMeralById(id11);
			let xp = meral.xp;
			let attackerHP = meral.hp;

			while (attackerHP > 25) {
				for (let i = 1; i < 5; i++) {
					let id = getOGMeralId(i);
					let stamina = await wilds.calculateStamina(id);
					if (stamina + raidActionStamina < 100) {
						await wilds.raidAction(id11, id, 0);
					}
					let damage = await wilds.calculateDamage(id11);
					attackerHP = meral.hp - damage;
					console.log(attackerHP);
					await network.provider.send('evm_increaseTime', [hour]);
					await network.provider.send('evm_mine');
				}
			}

			await wilds.deathKiss(id11, getOGMeralId(1));
			// let land = await wilds.landPlots(1);
			// console.log(land);
			// let slots = await wilds.getSlots(1, 4);
			// console.log(slots);
			meral = await meralManager.getMeralById(id11);
			expect(meral.xp).to.be.gt(xp);
			expect(meral.hp).to.be.lt(25);
			// console.log(meral.rewards);

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				let stake = await wilds.stakes(id);
				let event = await wilds.stakeEvents(1, stake.entryPointer);

				const blockNumBefore = await ethers.provider.getBlockNumber();
				const blockBefore = await ethers.provider.getBlock(blockNumBefore);
				const timestamp = blockBefore.timestamp;

				await wilds.unstake(id);
				let value = await meralManager.getMeralById(id);
				expect(value.xp - 2000).to.equal(getXp(timestamp, event.timestamp));
			}
		});
	});
});
