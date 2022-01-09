const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('./utils');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('Wilds Raid Actions', function () {
	let merals;
	let meralsL2;
	let escrowL1;
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
		escrowL1 = await EscrowL1.deploy();
		await escrowL1.deployed();

		// L2 Contracts
		const MeralManager = await ethers.getContractFactory('MeralManager');
		meralManager = await MeralManager.deploy('0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // TODO random register
		await meralManager.deployed();

		const EthemeralsL2 = await ethers.getContractFactory('EthemeralsOnL2');
		meralsL2 = await EthemeralsL2.deploy(meralManager.address);
		await meralsL2.deployed();

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

		// set and allow delegates
		await merals.addDelegate(escrowL1.address, true);
		await merals.connect(admin).setAllowDelegates(true);
		await merals.connect(player1).setAllowDelegates(true);
		await merals.connect(player2).setAllowDelegates(true);
		await merals.connect(player3).setAllowDelegates(true);

		// register MeralL1 Address
		await escrowL1.addContract(1, merals.address);

		// DO ESCROW ON L1
		let type = 1;
		for (let i = 1; i <= 10; i++) {
			await escrowL1.deposit(type, i);
		}
		for (let i = 11; i <= 20; i++) {
			await escrowL1.connect(player1).deposit(type, i);
		}
		for (let i = 21; i <= 30; i++) {
			await escrowL1.connect(player2).deposit(type, i);
		}
		for (let i = 31; i <= 40; i++) {
			await escrowL1.connect(player3).deposit(type, i);
		}

		// NODE BACKEND MINT (MIGRATE) TO L2
		await meralManager.addGM(admin.address, true);
		await meralManager.addGM(meralsL2.address, true);
		await meralManager.addMeralContracts(1, meralsL2.address);

		// // set and allow delegates
		await meralManager.addGM(onsen.address, true);
		await meralManager.addGM(wilds.address, true);
		await meralsL2.addDelegate(meralManager.address, true);

		for (let i = 1; i <= 40; i++) {
			let meralStats = allMeralStats[i];
			await meralsL2.migrateMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		}

		// ADMIN
		for (let i = 1; i <= 40; i++) {
			let deposits = await escrowL1.allDeposits(getOGMeralId(i));
			let _id = await escrowL1.getIdFromType(type, i);
			await meralManager.releaseFromPortal(deposits.owner, _id);
			let owner = await meralsL2.ownerOf(i);
		}
	});

	describe('GO RAIDING WITH ACTIONS!', function () {
		it('Should not allow raidActions', async function () {
			await makeRaid();
			let landId = 1;

			// LAND2
			for (let i = 6; i <= 10; i++) {
				let id = getOGMeralId(i);
				await wilds.stake(landId + 1, id, 1);
				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			for (let i = 16; i <= 20; i++) {
				let id = getOGMeralId(i);
				await wilds.connect(player1).stake(landId + 1, id, 4);
				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			// LOOTERS
			for (let i = 21; i <= 25; i++) {
				let id = getOGMeralId(i);
				await wilds.connect(player2).stake(landId, id, 2);
				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			// use stamina
			let id = getOGMeralId(1);
			let id2 = getOGMeralId(2);
			await wilds.raidAction(id, id2, 6);
			await wilds.raidAction(id, id2, 6);
			await meralManager.changeHP(id, 1000, false, 0);

			await expect(wilds.raidAction(getOGMeralId(11), getOGMeralId(12), 1)).to.be.revertedWith('need success'); // only owner
			await expect(wilds.raidAction(id, id2, 6)).to.be.revertedWith('need success'); // need stamina
			await expect(wilds.connect(player2).raidAction(id, getOGMeralId(21), 1)).to.be.revertedWith('need success'); // DEFers or ATKers
			await expect(wilds.connect(player1).raidAction(getOGMeralId(6), getOGMeralId(15), 1)).to.be.revertedWith('need success'); // raid group only
			await expect(wilds.raidAction(getOGMeralId(11), id, 0)).to.be.revertedWith('need success'); // alive only

			// // type specific
			let id11 = getOGMeralId(11);
			await expect(wilds.connect(player1).raidAction(id, id11, 5)).to.be.revertedWith('need success'); // allies only
			await expect(wilds.connect(player1).raidAction(id, id11, 6)).to.be.revertedWith('need success'); // allies only
			await expect(wilds.connect(player1).raidAction(id, id11, 7)).to.be.revertedWith('need success'); // defenders only
		});

		it('Should calculate damage in raidActions', async function () {
			await makeRaid();

			for (let i = 1; i < 20; i++) {
				let id = getOGMeralId(i);
				let id_b = getOGMeralId(i + 10);
				let meral = await meralManager.getMeralById(id);
				let meral2 = await meralManager.getMeralById(id_b);
				let defDamage = await wilds.calculateDefendedDamage(meral.atk, meral2.def);
				let lightMagic = await wilds.calculateLightMagicDamage(meral.def, meral.spd);
				let darkMagic = await wilds.calculateDarkMagicDamage(meral.atk, meral.def);
				let spdDamage = await wilds.calculateSpdDamage(meral.atk, meral2.def, meral.spd);
				console.log(`${meral.atk} atk, ${meral.def} def, ${meral.spd} spd, ${lightMagic} LM, ${darkMagic} DM, ${spdDamage} SD, ${defDamage} DD`);
			}
		});

		it('Should allow attack raidActions', async function () {
			await makeRaid();

			// single attack
			let raidAction = 0;
			let defender = getOGMeralId(2);
			let attacker = getOGMeralId(11);
			let damage = 0;
			let count = 0;

			while (damage < 1000) {
				count++;
				let preAttacker = await wilds.stakes(attacker);
				let stamina = await wilds.calculateStamina(attacker);
				console.log('calcStamina', stamina);
				if (stamina < 100 - 30) {
					let preStake = await wilds.stakes(defender);
					await wilds.connect(player1).raidAction(defender, attacker, raidAction);
					let postStake = await wilds.stakes(defender);
					let postAttacker = await wilds.stakes(attacker);
					expect(preStake.damage).to.be.lt(postStake.damage);

					console.log('stake.damage', postStake.damage);
					console.log('stamina', postAttacker.stamina);
					damage = await wilds.calculateDamage(defender);
					console.log('calculate damage', damage.toString());
				}
				await network.provider.send('evm_increaseTime', [hour * 4]);
				await network.provider.send('evm_mine');
			}

			console.log(count, 'count');
		});

		it('Should allow attack and set stamina', async function () {
			await makeRaid();
			//attack all
			let raidAction = 0;
			let staminaCost = await wilds.staminaCosts(raidAction);
			let defender = getOGMeralId(2);
			let attacker = getOGMeralId(11);

			let attackerStake = await wilds.stakes(attacker);
			expect(attackerStake.stamina).to.equal(0);

			let value = await wilds.stakes(1);
			expect(value.damage).to.equal(0);

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			attackerStake = await wilds.stakes(attacker);
			expect(attackerStake.stamina).to.equal(staminaCost);

			await wilds.setStaminas([10, 10]);
			let staminaCost2 = await wilds.staminaCosts(raidAction);
			expect(staminaCost2).to.equal(10);

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			attackerStake = await wilds.stakes(attacker);
			expect(attackerStake.stamina).to.equal(staminaCost + staminaCost2);
		});

		it('Should allow attackAll raidActions', async function () {
			await makeRaid();
			//attack all
			let raidAction = 1;
			let staminaCost = await wilds.staminaCosts(raidAction);
			let defender = getOGMeralId(2);
			let attacker = getOGMeralId(11);

			let attackerStake = await wilds.stakes(attacker);
			expect(attackerStake.stamina).to.equal(0);

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				let value = await wilds.stakes(id);
				expect(value.damage).to.equal(0);
			}

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			attackerStake = await wilds.stakes(attacker);
			expect(attackerStake.stamina).to.equal(staminaCost);

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				let value = await wilds.stakes(id);
				expect(value.damage).to.be.gt(0);
				console.log(value.damage);
			}

			await expect(wilds.connect(player1).raidAction(defender, attacker, raidAction)).to.be.revertedWith('need success');
		});

		it('Should heal in raidActions', async function () {
			await makeRaid();
			//attack all

			let attackAllAction = 1;
			let healAction = 5;
			let staminaCost = await wilds.staminaCosts(healAction);
			let defender = getOGMeralId(1);
			let attacker = getOGMeralId(11);
			let healer = getOGMeralId(5);

			let attackerStake = await wilds.stakes(attacker);
			expect(attackerStake.stamina).to.equal(0);

			await wilds.connect(player1).raidAction(defender, attacker, attackAllAction);

			let preHealDamage = await wilds.calculateDamage(defender);
			console.log(preHealDamage);

			let preHealStamina = await wilds.stakes(getOGMeralId(2));
			expect(preHealStamina.stamina).to.equal(0);
			await wilds.raidAction(defender, healer, healAction);
			let postHealDamage = await wilds.calculateDamage(defender);

			expect(parseInt(preHealDamage)).to.be.gt(parseInt(postHealDamage));

			let postHealStamina = await wilds.stakes(healer);
			expect(postHealStamina.stamina).to.equal(staminaCost);
		});

		it('Should heal all in raidActions', async function () {
			await makeRaid();
			//attack all

			let attackAllAction = 1;
			let healAction = 6;
			let staminaCost = await wilds.staminaCosts(healAction);
			let defender = getOGMeralId(1);
			let attacker = getOGMeralId(11);
			let healer = getOGMeralId(1);

			let meral = await meralManager.getMeralById(healer);
			console.log(meral.atk, meral.def, meral.spd);

			let attackerStake = await wilds.stakes(attacker);
			expect(attackerStake.stamina).to.equal(0);

			await wilds.connect(player1).raidAction(defender, attacker, attackAllAction);
			await wilds.connect(player1).raidAction(defender, attacker, 0);

			let preHealStamina = await wilds.stakes(2);
			expect(preHealStamina.stamina).to.equal(0);

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				let preHealDamage = await wilds.calculateDamage(id);
				console.log(preHealDamage);
			}

			await wilds.raidAction(defender, healer, healAction);

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				let postHealDamage = await wilds.calculateDamage(id);
				console.log(postHealDamage);
			}

			let postHealStamina = await wilds.stakes(healer);
			expect(postHealStamina.stamina).to.equal(staminaCost);
		});

		it('Should allow magic attack', async function () {
			await makeRaid();
			//attack all
			let raidAction = 2;
			let staminaCost = await wilds.staminaCosts(raidAction);
			let defender = getOGMeralId(5);
			let attacker = getOGMeralId(11);

			let attackerStake = await wilds.stakes(attacker);
			expect(attackerStake.stamina).to.equal(0);

			let value = await wilds.stakes(getOGMeralId(1));
			expect(value.damage).to.equal(0);

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			attackerStake = await wilds.stakes(attacker);
			expect(attackerStake.stamina).to.equal(staminaCost);

			value = await wilds.stakes(defender);
			console.log(value.damage, 'magic attack');
		});

		it('Should allow speed attack', async function () {
			await makeRaid();
			//attack all
			let raidAction = 3;
			let staminaCost = await wilds.staminaCosts(raidAction);
			let defender = getOGMeralId(5);
			let attacker = getOGMeralId(11);

			let attackerStake = await wilds.stakes(attacker);
			expect(attackerStake.stamina).to.equal(0);

			let value = await wilds.stakes(getOGMeralId(1));
			expect(value.damage).to.equal(0);

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			attackerStake = await wilds.stakes(attacker);
			expect(attackerStake.stamina).to.equal(staminaCost);

			value = await wilds.stakes(defender);
			console.log(value.damage, 'speed attack');
		});

		it('Should allow concentration action', async function () {
			await makeRaid();
			//attack all
			let raidAction = 7;
			let staminaCost = await wilds.staminaCosts(raidAction);
			let defender = getOGMeralId(5);
			let attacker = getOGMeralId(11);

			let defenderStake = await wilds.stakes(defender);
			expect(defenderStake.stamina).to.equal(0);

			let preLand = await wilds.landPlots(1);
			console.log(preLand.baseDefence, 'baseDefence');

			await wilds.raidAction(defender, defender, raidAction);
			defenderStake = await wilds.stakes(defender);
			expect(defenderStake.stamina).to.equal(staminaCost);

			let postLand = await wilds.landPlots(1);
			console.log(postLand.baseDefence, 'baseDefence');
			expect(postLand.baseDefence).to.be.gt(preLand.baseDefence);
		});

		it('Should allow enrage action', async function () {
			await makeRaid();
			//attack all
			let raidAction = 4;
			let staminaCost = await wilds.staminaCosts(raidAction);
			let defender = getOGMeralId(5);
			let attacker = getOGMeralId(11);

			let stake = await wilds.stakes(attacker);
			expect(stake.stamina).to.equal(0);

			let preLand = await wilds.landPlots(1);
			console.log(preLand.baseDefence, 'baseDefence');

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			stake = await wilds.stakes(attacker);
			expect(stake.stamina).to.equal(staminaCost);

			let postLand = await wilds.landPlots(1);
			console.log(postLand.baseDefence, 'baseDefence');
			expect(postLand.baseDefence).to.be.lt(preLand.baseDefence);
		});

		it('Should upgrade Actions to V2', async function () {
			await makeRaid();

			let raidAction = 0;
			let defender = getOGMeralId(5);
			let attacker = getOGMeralId(11);

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			let damage = await wilds.calculateDamage(defender);
			console.log(damage);

			const WildsActionsV2 = await ethers.getContractFactory('WildsActionsV2');
			wildsActionsV2 = await WildsActionsV2.deploy();
			await wildsActionsV2.deployed();

			await wilds.setAddresses(wildsStaking.address, wildsActionsV2.address);

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			let damage2 = await wilds.calculateDamage(defender);
			expect(parseInt(damage2)).to.be.lt(parseInt(damage));
		});
	});
});
