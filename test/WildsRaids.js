const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('./utils');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('Wilds Raiding', function () {
	let merals;
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
		meralManager = await MeralManager.deploy(); // TODO random register
		await meralManager.deployed();

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

		// set approvals for bridge
		await merals.connect(admin).setApprovalForAll(escrowL1.address, true);
		await merals.connect(player1).setApprovalForAll(escrowL1.address, true);
		await merals.connect(player2).setApprovalForAll(escrowL1.address, true);
		await merals.connect(player3).setApprovalForAll(escrowL1.address, true);

		// register Meral Addresses
		await escrowL1.addContract(1, merals.address);

		// add admin as delegate and game master BRIDGE ADMIN
		await meralManager.addGM(admin.address, true);

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
		for (let i = 1; i <= 40; i++) {
			let _id = await escrowL1.getIdFromType(type, i);
			let deposits = await escrowL1.allDeposits(_id);
			await meralManager.releaseFromPortal(deposits, _id);
		}

		// // set and allow delegates
		await meralManager.addGM(onsen.address, true);
		await meralManager.addGM(wilds.address, true);
		await meralManager.addGM(meralManager.address, true);

		// ADMIN
		for (let i = 1; i <= 40; i++) {
			let meralStats = allMeralStats[i];
			await meralManager.registerOGMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		}
	});

	describe('GO RAIDING!', function () {
		it('Should allow death kiss defenders and swap to defenders', async function () {
			let landId = 1;

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				await meralManager.changeHP(id, 1000, true);
				await wilds.stake(landId, id, 1);

				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			for (let i = 11; i <= 15; i++) {
				let id = getOGMeralId(i);
				await meralManager.changeHP(id, 1000, true);
				await wilds.connect(player1).stake(landId, id, 4);

				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			await network.provider.send('evm_increaseTime', [day * 2]);
			await network.provider.send('evm_mine');

			let id1 = getOGMeralId(1);

			let remainingHealth = await wilds.calculateDamage(id1);

			while (remainingHealth > 1) {
				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
				let value = await wilds.calculateDamage(id1);
				remainingHealth = 1000 - value;

				if (remainingHealth <= 25) {
					console.log(remainingHealth);
					await expect(wilds.connect(player1).deathKiss(id1, id1)).to.be.revertedWith('need success');
					await expect(wilds.connect(player2).deathKiss(getOGMeralId(25), getOGMeralId(21))).to.be.revertedWith('need success');
					await wilds.connect(player1).deathKiss(id1, getOGMeralId(11));
					let defenderSlots = await wilds.getSlots(1, 1);

					expect(defenderSlots.length).to.equal(4);
					let defender = await meralManager.getMeralById(id1);
					expect(remainingHealth).to.equal(defender.hp);
					break;
				}
			}

			await expect(wilds.stake(landId, id1, 1)).to.be.revertedWith('no reinforcements');

			let id2 = getOGMeralId(2);

			remainingHealth = await wilds.calculateDamage(id2);
			while (remainingHealth > 1) {
				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
				let value = await wilds.calculateDamage(id2);
				remainingHealth = 1000 - value;

				if (remainingHealth < 25) {
					console.log(remainingHealth);
					await wilds.connect(player2).deathKiss(id2, getOGMeralId(21));
					let defenderSlots = await wilds.getSlots(1, 1);
					expect(defenderSlots.length).to.equal(3);
					let defender = await meralManager.getMeralById(id2);
					expect(remainingHealth).to.equal(defender.hp);
					break;
				}
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			// SWAP DEFENDERS
			await wilds.connect(player2).deathKiss(getOGMeralId(3), getOGMeralId(21));
			await wilds.connect(player2).deathKiss(getOGMeralId(4), getOGMeralId(21));
			let defenderSlots = await wilds.getSlots(1, 1);
			expect(defenderSlots.length).to.equal(1);
			let attackerSlots = await wilds.getSlots(1, 4);
			expect(attackerSlots.length).to.equal(5);
			// last defender
			await wilds.connect(player2).deathKiss(getOGMeralId(5), getOGMeralId(21));
			attackerSlots = await wilds.getSlots(1, 4);
			expect(attackerSlots.length).to.equal(0);
			defenderSlots = await wilds.getSlots(1, 1);
			expect(defenderSlots.length).to.equal(5);

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				let value = await wilds.stakes(id);
				expect(value.stakeAction).to.equal(0);
				expect(await meralManager.ownerOf(getIdFromType(1, i))).to.equal(admin.address);
			}

			for (let i = 11; i <= 15; i++) {
				let id = getOGMeralId(i);
				let value = await wilds.stakes(id);
				expect(value.stakeAction).to.equal(1);
			}

			await network.provider.send('evm_increaseTime', [day * 3]);
			await network.provider.send('evm_mine');

			for (let i = 11; i <= 15; i++) {
				let id = getOGMeralId(i);
				let value = await wilds.getLCP(1, id);
				console.log(value.toString());
				value = await wilds.calculateDamage(id);
				console.log(value.toString());
			}
		});

		it('Should allow new defenders to swap with another token', async function () {
			let landId = 1;

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				await meralManager.changeHP(id, 1000, true);
				await wilds.stake(landId, id, 1);

				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			for (let i = 11; i <= 15; i++) {
				let id = getOGMeralId(i);
				await meralManager.changeHP(id, 1000, true);
				await wilds.connect(player1).stake(landId, id, 4);

				await network.provider.send('evm_increaseTime', [hour]);
				await network.provider.send('evm_mine');
			}

			await network.provider.send('evm_increaseTime', [day * 10]);
			await network.provider.send('evm_mine');

			for (let i = 1; i <= 5; i++) {
				let id = getOGMeralId(i);
				await wilds.connect(player1).deathKiss(id, getOGMeralId(21));
			}

			await network.provider.send('evm_increaseTime', [hour]);
			await network.provider.send('evm_mine');

			await expect(wilds.swapDefenders(getOGMeralId(11), getOGMeralId(5))).to.be.revertedWith('need success'); // only owner
			await wilds.connect(player2).stake(2, getOGMeralId(21), 1);
			await wilds.connect(player2).stake(2, getOGMeralId(22), 2);
			await expect(wilds.connect(player2).swapDefenders(getOGMeralId(22), getOGMeralId(23))).to.be.revertedWith('need success'); // not defending

			for (let i = 11; i <= 14; i++) {
				let id = getOGMeralId(i);
				let id_b = getOGMeralId(i + 5);

				await wilds.connect(player1).swapDefenders(id, id_b);

				expect(await meralManager.ownerOf(getIdFromType(1, i))).to.equal(player1.address);
				expect(await meralManager.ownerOf(getIdFromType(1, i + 5))).to.equal(wilds.address);
				value = await wilds.stakes(id);
				expect(value.stakeAction).to.equal(0);
				value = await wilds.stakes(id_b);
				expect(value.stakeAction).to.equal(1);
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');
			await expect(wilds.connect(player1).swapDefenders(getOGMeralId(15), getOGMeralId(20))).to.be.revertedWith('need success'); // to late
		});
	});
});
