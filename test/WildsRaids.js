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
				let value = await wilds.calculateLCP(1, i);
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

			await expect(wilds.connect(admin).swapDefenders(11, 5)).to.be.revertedWith('need success');
			await wilds.connect(player2).stake(2, 21, 1);
			await wilds.connect(player2).stake(2, 22, 2);
			await expect(wilds.connect(player2).swapDefenders(22, 23)).to.be.revertedWith('need success');

			for (let i = 11; i <= 12; i++) {
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
			await expect(wilds.connect(player1).swapDefenders(15, 20)).to.be.revertedWith('need success');
		});

		it('Should not allow raidActions', async function () {
			await makeRaid();
			let landId = 1;

			// LAND2
			for (let i = 6; i <= 10; i++) {
				await wilds.stake(landId + 1, i, 1);
				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			await expect(wilds.raidAction(11, 12, 1)).to.be.revertedWith('need success');
			await expect(wilds.raidAction(1, 12, 1)).to.be.revertedWith('need success');
			await expect(wilds.connect(player1).raidAction(6, 15, 1)).to.be.revertedWith('need success');

			await wilds.raidAction(1, 1, 1);
		});

		it('Should allow attack raidActions', async function () {
			await makeRaid();

			// single attack
			let raidAction = 0;
			let defender = 2;
			let attacker = 11;
			let damage = 0;
			let count = 0;

			while (damage < 1000) {
				count++;
				let preAttacker = await wilds.getStake(attacker);
				let stamina = await wilds.calculateStamina(attacker);
				console.log('calcStamina', stamina);
				if (stamina < 100 - 30) {
					let preStake = await wilds.getStake(defender);
					await wilds.connect(player1).raidAction(defender, attacker, raidAction);
					let postStake = await wilds.getStake(defender);
					let postAttacker = await wilds.getStake(attacker);
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
			let defender = 2;
			let attacker = 11;

			let attackerStake = await wilds.getStake(attacker);
			expect(attackerStake.stamina).to.equal(0);

			let value = await wilds.getStake(1);
			expect(value.damage).to.equal(0);

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			attackerStake = await wilds.getStake(attacker);
			expect(attackerStake.stamina).to.equal(staminaCost);

			await wilds.setStaminas([10, 10]);
			let staminaCost2 = await wilds.staminaCosts(raidAction);
			expect(staminaCost2).to.equal(10);

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			attackerStake = await wilds.getStake(attacker);
			expect(attackerStake.stamina).to.equal(staminaCost + staminaCost2);
		});

		it('Should allow attackAll raidActions', async function () {
			await makeRaid();
			//attack all
			let raidAction = 1;
			let staminaCost = await wilds.staminaCosts(raidAction);
			let defender = 2;
			let attacker = 11;

			let attackerStake = await wilds.getStake(attacker);
			expect(attackerStake.stamina).to.equal(0);

			for (let i = 1; i <= 5; i++) {
				let value = await wilds.getStake(i);
				expect(value.damage).to.equal(0);
			}

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			attackerStake = await wilds.getStake(attacker);
			expect(attackerStake.stamina).to.equal(staminaCost);

			for (let i = 1; i <= 5; i++) {
				let value = await wilds.getStake(i);
				expect(value.damage).to.be.gt(0);
				console.log(value.damage);
			}

			await expect(wilds.connect(player1).raidAction(defender, attacker, raidAction)).to.be.revertedWith('need success');
		});

		it('Should calculate damage in raidActions', async function () {
			await makeRaid();

			for (let i = 1; i < 20; i++) {
				let meral = await merals.getEthemeral(i);
				let meral2 = await merals.getEthemeral(i + 10);
				let defDamage = await wilds.calculateDefendedDamage(meral.atk, meral2.def);
				let lightMagic = await wilds.calculateLightMagicDamage(meral.def, meral.spd);
				let darkMagic = await wilds.calculateDarkMagicDamage(meral.atk, meral.def);
				let spdDamage = await wilds.calculateSpdDamage(meral.atk, meral2.def, meral.spd);
				console.log(`${meral.atk} atk, ${meral.def} def, ${meral.spd} spd, ${lightMagic} LM, ${darkMagic} DM, ${spdDamage} SD, ${defDamage} DD`);
			}
		});

		it('Should not allow actions if dead', async function () {
			await makeRaid();
			await network.provider.send('evm_increaseTime', [day * 4]);
			await network.provider.send('evm_mine');

			let value = await wilds.calculateDamage(1);
			console.log(value);
			await expect(wilds.raidAction(1, 1, 7)).to.be.revertedWith('need success');
		});

		it('Should heal in raidActions', async function () {
			await makeRaid();
			//attack all

			let attackAllAction = 1;
			let healAction = 5;
			let staminaCost = await wilds.staminaCosts(healAction);
			let defender = 1;
			let attacker = 11;
			let healer = 5;

			let attackerStake = await wilds.getStake(attacker);
			expect(attackerStake.stamina).to.equal(0);

			await wilds.connect(player1).raidAction(defender, attacker, attackAllAction);

			let preHealDamage = await wilds.calculateDamage(defender);
			console.log(preHealDamage);

			let preHealStamina = await wilds.getStake(2);
			expect(preHealStamina.stamina).to.equal(0);
			await wilds.raidAction(defender, healer, healAction);
			let postHealDamage = await wilds.calculateDamage(defender);

			expect(parseInt(preHealDamage)).to.be.gt(parseInt(postHealDamage));

			let postHealStamina = await wilds.getStake(healer);
			expect(postHealStamina.stamina).to.equal(staminaCost);
		});

		it('Should heal all in raidActions', async function () {
			await makeRaid();
			//attack all

			let attackAllAction = 1;
			let healAction = 6;
			let staminaCost = await wilds.staminaCosts(healAction);
			let defender = 1;
			let attacker = 11;
			let healer = 1;

			let meral = await merals.getEthemeral(healer);
			console.log(meral.atk, meral.def, meral.spd);

			let attackerStake = await wilds.getStake(attacker);
			expect(attackerStake.stamina).to.equal(0);

			await wilds.connect(player1).raidAction(defender, attacker, attackAllAction);
			await wilds.connect(player1).raidAction(defender, attacker, 0);

			let preHealStamina = await wilds.getStake(2);
			expect(preHealStamina.stamina).to.equal(0);

			for (let i = 1; i <= 5; i++) {
				let preHealDamage = await wilds.calculateDamage(i);
				console.log(preHealDamage);
			}

			await wilds.raidAction(defender, healer, healAction);

			for (let i = 1; i <= 5; i++) {
				let postHealDamage = await wilds.calculateDamage(i);
				console.log(postHealDamage);
			}

			let postHealStamina = await wilds.getStake(healer);
			expect(postHealStamina.stamina).to.equal(staminaCost);
		});

		it('Should allow magic attack', async function () {
			await makeRaid();
			//attack all
			let raidAction = 2;
			let staminaCost = await wilds.staminaCosts(raidAction);
			let defender = 5;
			let attacker = 11;

			let attackerStake = await wilds.getStake(attacker);
			expect(attackerStake.stamina).to.equal(0);

			let value = await wilds.getStake(1);
			expect(value.damage).to.equal(0);

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			attackerStake = await wilds.getStake(attacker);
			expect(attackerStake.stamina).to.equal(staminaCost);

			value = await wilds.getStake(defender);
			console.log(value.damage, 'magic attack');
		});

		it('Should allow speed attack', async function () {
			await makeRaid();
			//attack all
			let raidAction = 3;
			let staminaCost = await wilds.staminaCosts(raidAction);
			let defender = 5;
			let attacker = 11;

			let attackerStake = await wilds.getStake(attacker);
			expect(attackerStake.stamina).to.equal(0);

			let value = await wilds.getStake(1);
			expect(value.damage).to.equal(0);

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			attackerStake = await wilds.getStake(attacker);
			expect(attackerStake.stamina).to.equal(staminaCost);

			value = await wilds.getStake(defender);
			console.log(value.damage, 'speed attack');
		});

		it('Should allow concentration action', async function () {
			await makeRaid();
			//attack all
			let raidAction = 7;
			let staminaCost = await wilds.staminaCosts(raidAction);
			let defender = 5;
			let attacker = 11;

			let defenderStake = await wilds.getStake(defender);
			expect(defenderStake.stamina).to.equal(0);

			let preLand = await wilds.landPlots(1);
			console.log(preLand.baseDefence, 'baseDefence');

			await wilds.raidAction(defender, defender, raidAction);
			defenderStake = await wilds.getStake(defender);
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
			let defender = 5;
			let attacker = 11;

			let stake = await wilds.getStake(attacker);
			expect(stake.stamina).to.equal(0);

			let preLand = await wilds.landPlots(1);
			console.log(preLand.baseDefence, 'baseDefence');

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			stake = await wilds.getStake(attacker);
			expect(stake.stamina).to.equal(staminaCost);

			let postLand = await wilds.landPlots(1);
			console.log(postLand.baseDefence, 'baseDefence');
			expect(postLand.baseDefence).to.be.lt(preLand.baseDefence);
		});

		it('Should upgrade Actions to V2', async function () {
			await makeRaid();

			let raidAction = 0;
			let defender = 5;
			let attacker = 11;

			await wilds.connect(player1).raidAction(defender, attacker, raidAction);
			let damage = await wilds.calculateDamage(defender);
			console.log(damage);

			const WildsActionsV2 = await ethers.getContractFactory('WildsActionsV2');
			wildsActionsV2 = await WildsActionsV2.deploy();
			await wildsActionsV2.deployed();

			await wilds.setAddresses(wildsStaking.address, wildsActionsV2.address);

			await wilds.raidAction(defender, 2, raidAction);
			let damage2 = await wilds.calculateDamage(defender);
			expect(damage2).to.be.lt(damage);
		});
	});
});
