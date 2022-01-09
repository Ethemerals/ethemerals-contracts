const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MeralsL1Data, minMaxAvg, getRandomInt } = require('./utils');
const addressZero = '0x0000000000000000000000000000000000000000';

describe('Escrow Migration', function () {
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

		// register MeralL1 Address
		await escrowL1.addContract(1, merals.address);

		// NODE BACKEND MINT (MIGRATE) TO L2
		await meralManager.addGM(admin.address, true);
		await meralManager.addGM(meralsL2.address, true);
		await meralManager.addMeralContracts(1, meralsL2.address);

		for (let i = 1; i <= 40; i++) {
			let meralStats = allMeralStats[i];
			await meralsL2.migrateMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		}
	});

	describe('EscrowL1', function () {
		it('deposit and withdraw with exceptions', async function () {
			let type = 1;
			let tokenId = 1;

			await expect(escrowL1.deposit(type, tokenId)).to.be.revertedWith('ERC721: transfer caller is not owner nor approved');
			await merals.setApprovalForAll(escrowL1.address, true);
			await escrowL1.deposit(type, tokenId);

			let _deposit = await escrowL1.allDeposits(getOGMeralId(tokenId));
			expect(_deposit.owner).to.equal(admin.address);
			let owner = await merals.ownerOf(tokenId);
			expect(owner).to.equal(escrowL1.address);

			await expect(escrowL1.deposit(type, 11)).to.be.revertedWith('only owner');

			await escrowL1.pause();
			await expect(escrowL1.deposit(type, 2)).to.be.revertedWith('paused');
			await expect(escrowL1.withdraw(type, tokenId)).to.be.revertedWith('paused');
			await escrowL1.unpause();
			await escrowL1.deposit(type, 2);

			// SECOND CONTRACT
			const EthemeralsB = await ethers.getContractFactory('Ethemerals');
			meralsB = await EthemeralsB.deploy('https://api.ethemerals.com/api/', '0x169310e61e71ef5834ce5466c7155d8a90d15f1e'); // RANDOM ELF ADDRESS
			await meralsB.deployed();

			await meralsB.mintReserve();
			await meralsB.setPrice(0);
			await meralsB.setMaxMeralIndex(1000);

			await meralsB.mintMeralsAdmin(player1.address, 10); // ID starts at 11
			await meralsB.mintMeralsAdmin(player2.address, 10); // ID starts at 21
			await meralsB.mintMeralsAdmin(player3.address, 10); // ID starts at 31

			let type2 = 2;

			await expect(escrowL1.deposit(type2, 1)).to.be.revertedWith('not registered');
			await expect(escrowL1.connect(player1).addContract(2, meralsB.address)).to.be.revertedWith('Ownable: caller is not the owner');

			await escrowL1.addContract(2, meralsB.address);

			idType2 = await escrowL1.getIdFromType(type2, 11);
			await meralsB.connect(player1).setApprovalForAll(escrowL1.address, true);
			await escrowL1.connect(player1).deposit(type2, 11);

			let contract2 = await escrowL1.allContracts(2);
			expect(contract2).to.equal(meralsB.address);

			// WITHDRAWS
			await expect(escrowL1.withdraw(type2, 11)).to.be.revertedWith('only owner');
			await expect(escrowL1.connect(player1).withdraw(type2, 11)).to.be.revertedWith('cooldown');

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			await escrowL1.connect(player1).withdraw(type2, 11);
			owner = await meralsB.ownerOf(11);
			expect(owner).to.equal(player1.address);
			let _id = await escrowL1.getIdFromType(2, 11);
			value = await escrowL1.allDeposits(_id);
			expect(value.owner).to.equal(addressZero);
		});

		it('deposit and withdraw ', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);
			await merals.connect(player2).setAllowDelegates(true);
			await merals.connect(player3).setAllowDelegates(true);

			// DO ESCROW ON L1
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

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			for (let i = 1; i <= 10; i++) {
				await escrowL1.withdraw(type, i);
			}
			for (let i = 11; i <= 20; i++) {
				await escrowL1.connect(player1).withdraw(type, i);
			}
			for (let i = 21; i <= 30; i++) {
				await escrowL1.connect(player2).withdraw(type, i);
			}
			for (let i = 31; i <= 40; i++) {
				await escrowL1.connect(player3).withdraw(type, i);
			}
		});

		it('deposit and withdraw on L2', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);
			await merals.connect(player2).setAllowDelegates(true);
			await merals.connect(player3).setAllowDelegates(true);

			// DO ESCROW ON L1
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

			for (let i = 1; i <= 40; i++) {
				let owner = await meralsL2.ownerOf(i);
				expect(owner).to.equal(meralManager.address);
			}

			// ADMIN
			for (let i = 1; i <= 40; i++) {
				let deposits = await escrowL1.allDeposits(getOGMeralId(i));
				let _id = await escrowL1.getIdFromType(type, i);
				await meralManager.releaseFromPortal(deposits.owner, _id);
				let owner = await meralsL2.ownerOf(i);
				if (i < 11) {
					expect(owner).to.equal(admin.address);
				} else if (i < 21) {
					expect(owner).to.equal(player1.address);
				} else if (i < 31) {
					expect(owner).to.equal(player2.address);
				} else if (i < 41) {
					expect(owner).to.equal(player3.address);
				}
			}

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			for (let i = 1; i <= 10; i++) {
				await escrowL1.withdraw(type, i);
			}
			for (let i = 11; i <= 20; i++) {
				await escrowL1.connect(player1).withdraw(type, i);
			}
			for (let i = 21; i <= 30; i++) {
				await escrowL1.connect(player2).withdraw(type, i);
			}
			for (let i = 31; i <= 40; i++) {
				await escrowL1.connect(player3).withdraw(type, i);
			}

			await meralsL2.connect(player2).transferFrom(player2.address, player3.address, 21);

			// TODO disallow transfers?
			// TODO what if staked?

			for (let i = 1; i <= 40; i++) {
				let _id = await escrowL1.getIdFromType(type, i);
				await meralManager.returnToPortal(_id);
				let owner = await meralsL2.ownerOf(i);
				expect(owner).to.equal(meralManager.address);
			}
		});
	});
});
