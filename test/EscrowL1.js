const { expect } = require('chai');
const { ethers, network, waffle } = require('hardhat');
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

		// register MeralL1 Address
		await escrowL1.addContract(1, merals.address);
		// add admin as delegate and game master BRIDGE ADMIN
		await meralManager.addGM(admin.address, true);

		for (let i = 1; i <= 40; i++) {
			let meralStats = allMeralStats[i];
			await meralManager.registerOGMeral(i, meralStats.score, meralStats.rewards, meralStats.atk, meralStats.def, meralStats.spd, meralStats.element, meralStats.subclass);
		}
	});

	describe('EscrowL1', function () {
		it('not register an already registered contract', async function () {
			await expect(escrowL1.addContract(1, merals.address)).to.be.revertedWith('type already exists');
			await escrowL1.addContract(2, merals.address);
		});

		it('deposit and withdraw with exceptions', async function () {
			let type = 1;
			let tokenId = 1;

			await expect(escrowL1.deposit(type, tokenId)).to.be.revertedWith('ERC721: transfer caller is not owner nor approved');
			await merals.setApprovalForAll(escrowL1.address, true);
			await escrowL1.deposit(type, tokenId);

			let id = await escrowL1.getIdFromType(type, tokenId);
			let _deposit = await escrowL1.allDeposits(id);
			expect(_deposit).to.equal(admin.address);
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

			await network.provider.send('evm_increaseTime', [day]);
			await network.provider.send('evm_mine');

			await escrowL1.connect(player1).withdraw(type2, 11);
			owner = await meralsB.ownerOf(11);
			expect(owner).to.equal(player1.address);
			let _id = await escrowL1.getIdFromType(2, 11);
			value = await escrowL1.allDeposits(_id);
			expect(value).to.equal(addressZero);
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

			// ADMIN

			for (let i = 1; i <= 40; i++) {
				let _id = await escrowL1.getIdFromType(type, i);
				let deposits = await escrowL1.allDeposits(_id);
				await meralManager.releaseFromPortal(deposits, _id);
				let owner = await meralManager.ownerOf(_id);
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

			for (let i = 1; i <= 40; i++) {
				let _id = await escrowL1.getIdFromType(type, i);
				await meralManager.returnToPortal(_id);
				let exists = await meralManager.exists(_id);
				expect(exists).to.equal(false);
			}

			// // TODO disallow transfers?
			// // TODO what if staked?

			// for (let i = 1; i <= 40; i++) {
			// 	let _id = await escrowL1.getIdFromType(type, i);
			// 	await meralManager.returnToPortal(_id);
			// 	let owner = await meralsL2.ownerOf(i);
			// 	expect(owner).to.equal(meralManager.address);
			// }
		});

		it('deposit and sell ', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			await escrowL1.connect(player1).deposit(type, tokenId);
			const price = 10;
			await escrowL1.connect(player1).sellNft(type, tokenId, price);
			let sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(price);

			let id = await escrowL1.getIdFromType(type, tokenId);
			let ownerInEscrow = await escrowL1.allDeposits(id);
			expect(ownerInEscrow).to.equal(player1.address);

			let ownerInMeral = await merals.ownerOf(tokenId);
			expect(ownerInMeral).to.equal(escrowL1.address);
		});

		it('deposit and revert sell if not the owner tries to sell', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			await escrowL1.connect(player1).deposit(type, tokenId);
			const price = 10;
			await expect(escrowL1.connect(player2).sellNft(type, tokenId, price)).to.be.revertedWith('only owner');
		});

		it('deposit and revert sell if the contract is paused', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			await escrowL1.connect(player1).deposit(type, tokenId);
			await escrowL1.connect(admin).pause();
			const price = 10;
			await expect(escrowL1.connect(player2).sellNft(type, tokenId, price)).to.be.revertedWith('paused');
		});

		it('deposit, sell and cancel sell order', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			await escrowL1.connect(player1).deposit(type, tokenId);
			const price = 10;
			await escrowL1.connect(player1).sellNft(type, tokenId, price);
			let sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(price);

			await escrowL1.connect(player1).cancelSellNftOrder(type, tokenId);
			sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(0);
		});

		it('deposit, sell and revert sell order if not the owner tries to cancel', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			await escrowL1.connect(player1).deposit(type, tokenId);
			const price = 10;
			await escrowL1.connect(player1).sellNft(type, tokenId, price);
			let sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(price);

			await expect(escrowL1.connect(player2).cancelSellNftOrder(type, tokenId)).to.be.revertedWith('only owner');
		});

		it('deposit, sell and revert sell order if the contract is paused', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			await escrowL1.connect(player1).deposit(type, tokenId);
			const price = 10;
			await escrowL1.connect(player1).sellNft(type, tokenId, price);
			let sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(price);

			await escrowL1.connect(admin).pause();
			await expect(escrowL1.connect(player2).cancelSellNftOrder(type, tokenId)).to.be.revertedWith('paused');
		});

		it('deposit, sell and buy', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			await escrowL1.connect(player1).deposit(type, tokenId);
			const price = 10;
			await escrowL1.connect(player1).sellNft(type, tokenId, price);
			let sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(price);

			const provider = waffle.provider;
			let previousOwnerBalanceBefore = await provider.getBalance(player1.address);
			await expect(escrowL1.connect(player2).buyNft(type, tokenId, { value: price })).to.emit(escrowL1, 'TokenOwnerChange');

			sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(0);

			let id = await escrowL1.getIdFromType(type, tokenId);
			let newOwner = await escrowL1.allDeposits(id);
			expect(newOwner).to.equal(player2.address);

			let previousOwnerBalanceAfter = await provider.getBalance(player1.address);
			expect(previousOwnerBalanceAfter).to.equal(previousOwnerBalanceBefore.add(price));
		});

		it('deposit, sell and revert on buy if the contract is paused', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			await escrowL1.connect(player1).deposit(type, tokenId);
			const price = 10;
			await escrowL1.connect(player1).sellNft(type, tokenId, price);
			let sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(price);

			await escrowL1.connect(admin).pause();
			await expect(escrowL1.connect(player2).buyNft(type, tokenId, { value: price })).to.be.revertedWith('paused');
		});

		it('deposit, sell and revert on buy if the token is not for sale', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			await escrowL1.connect(player1).deposit(type, tokenId);
			let sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(0);

			const price = 1;
			await expect(escrowL1.connect(player2).buyNft(type, tokenId, { value: price })).to.be.revertedWith('token is not for sale');
		});

		it('deposit, sell and revert on buy if the price is different from the msg.value', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			await escrowL1.connect(player1).deposit(type, tokenId);
			const price = 10;
			await escrowL1.connect(player1).sellNft(type, tokenId, price);
			let sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(price);

			let msgValue = price + 1;
			await expect(escrowL1.connect(player2).buyNft(type, tokenId, { value: msgValue })).to.be.revertedWith('msg.value different from the price');
		});

		it('deposit, sell and buy and withdraw', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			await escrowL1.connect(player1).deposit(type, tokenId);
			const price = 10;
			await escrowL1.connect(player1).sellNft(type, tokenId, price);
			let sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(price);

			let ownerInMeral = await merals.ownerOf(tokenId);
			expect(ownerInMeral).to.equal(escrowL1.address);

			const provider = waffle.provider;
			let previousOwnerBalanceBefore = await provider.getBalance(player1.address);
			await expect(escrowL1.connect(player2).buyAndWithdrawNft(type, tokenId, { value: price })).to.emit(escrowL1, 'TokenOwnerChange');

			sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(0);

			let id = await escrowL1.getIdFromType(type, tokenId);
			let newOwnerInEscrow = await escrowL1.allDeposits(id);
			expect(newOwnerInEscrow).to.equal(addressZero);

			let newOwnerInMeral = await merals.ownerOf(tokenId);
			expect(newOwnerInMeral).to.equal(player2.address);

			let previousOwnerBalanceAfter = await provider.getBalance(player1.address);
			expect(previousOwnerBalanceAfter).to.equal(previousOwnerBalanceBefore.add(price));
		});

		it('deposit and sell at the same time', async function () {
			let type = 1;
			await merals.addDelegate(escrowL1.address, true);
			await merals.setAllowDelegates(true);
			await merals.connect(player1).setAllowDelegates(true);

			const tokenId = 11;
			const price = 10;
			await escrowL1.connect(player1).depositAndSellNft(type, tokenId, price);
			let sellPrice = await escrowL1.getPrice(type, tokenId);
			expect(sellPrice).to.equal(price);

			let id = await escrowL1.getIdFromType(type, tokenId);
			let ownerInEscrow = await escrowL1.allDeposits(id);
			expect(ownerInEscrow).to.equal(player1.address);

			let ownerInMeral = await merals.ownerOf(tokenId);
			expect(ownerInMeral).to.equal(escrowL1.address);
		});
	});
});
