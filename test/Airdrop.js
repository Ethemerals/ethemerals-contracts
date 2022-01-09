const { expect } = require('chai');
const { ethers } = require('hardhat');
const { getOwnerAddresses, chunk, occuranceCount } = require('../utils/airdropUtils');

describe.only('Airdrop', function () {
    let elfx;
    let airdrop;
    let addresses;

    beforeEach(async function () {
        [admin, address1, address2] = await ethers.getSigners();

        const ELFX = await ethers.getContractFactory('ELFX');
        // the admin gets elfx minted in the deployment
        // the airdrop will distribute the minted amount
        elfx = await ELFX.deploy('Excess Ethemeral Life Force ', 'ELFX', 10000);
        await elfx.deployed();

        const Airdrop = await ethers.getContractFactory('Airdrop');
        airdrop = await Airdrop.deploy(elfx.address);
        await airdrop.deployed();
    });

    it('Small address array distribution', async function () {
        addresses = [address1.address, address2.address];

        await elfx.connect(admin).approve(airdrop.address, 40);
        await airdrop.connect(admin).distribute(addresses, 20);

        let adminBalance = await elfx.balanceOf(admin.address);
        expect(adminBalance).to.equal(9960);

        let address1Balance = await elfx.connect(admin).balanceOf(address1.address);
        expect(address1Balance).to.equal(20);

        let address2Balance = await elfx.connect(admin).balanceOf(address2.address);
        expect(address2Balance).to.equal(20);
    });

    it('All owners distribution in small batches', async function () {
        // get all meral owners from the graph
        const owners = await getOwnerAddresses();
        // small batch size
        const batchSize = 10;
        // create batches of owner address of batchSize
        const batches = chunk(owners, batchSize);
        // how many elfx token is distributed for one meral owner - one address can have multiple merals so that address will get the multiple of this
        const distributionPerMeral = 1;
        const totalDistribution = owners.length * distributionPerMeral;
        let adminBalanceBefore = await elfx.balanceOf(admin.address);

        // need to approve the airdrop contract to transfer the elfx onbehalf of the admin
        await elfx.connect(admin).approve(airdrop.address, totalDistribution);

        for (let batch of batches) {
            await airdrop.connect(admin).distribute(batch, distributionPerMeral);
        }

        // for the assertion we need to count the occurancies of unique owners
        let occurances = occuranceCount(owners);
        // for each unique owner
        Object.keys(occurances).forEach(async function (address) {
            // how many times the address occured in owners: how many merals it owns
            let occurance = occurances[address];
            // and its balance of elfx
            let balance = await elfx.balanceOf(address);
            expect(occurance * distributionPerMeral).to.equal(balance);
        })

        let adminBalanceAfter = await elfx.balanceOf(admin.address);
        expect(adminBalanceAfter).to.equal(adminBalanceBefore - totalDistribution);
    });

    it('All owners distribution in big batches', async function () {
        // get all meral owners from the graph
        const owners = await getOwnerAddresses();
        // big batch size 
        // !!!!! This is the biggest batch size that goes through without getting an EVM error: transaction gas limit
        const batchSize = 500;
        // create batches of owner address of batchSize
        const batches = chunk(owners, batchSize);
        // how many elfx token is distributed for one meral owner - one address can have multiple merals so that address will get the multiple of this
        const distributionPerMeral = 1;
        const totalDistribution = owners.length * distributionPerMeral;
        let adminBalanceBefore = await elfx.balanceOf(admin.address);

        // need to approve the airdrop contract to transfer the elfx onbehalf of the admin
        await elfx.connect(admin).approve(airdrop.address, totalDistribution);

        for (let batch of batches) {
            await airdrop.connect(admin).distribute(batch, distributionPerMeral);
        }

        // for the assertion we need to count the occurancies of unique owners
        let occurances = occuranceCount(owners);
        // for each unique owner
        Object.keys(occurances).forEach(async function (address) {
            // how many times the address occured in owners: how many merals it owns
            let occurance = occurances[address];
            // and its balance of elfx
            let balance = await elfx.balanceOf(address);
            expect(occurance * distributionPerMeral).to.equal(balance);
        })

        let adminBalanceAfter = await elfx.balanceOf(admin.address);
        expect(adminBalanceAfter).to.equal(adminBalanceBefore - totalDistribution);
    });

    it('Higher elfx distribution per meral', async function () {
        // get all meral owners from the graph
        const owners = await getOwnerAddresses();
        // big batch size 
        // !!!!! This is the biggest batch size that goes through without getting an EVM error: transaction gas limit
        const batchSize = 500;
        // create batches of owner address of batchSize
        const batches = chunk(owners, batchSize);
        // how many elfx token is distributed for one meral owner - one address can have multiple merals so that address will get the multiple of this
        const distributionPerMeral = 10;
        const totalDistribution = owners.length * distributionPerMeral;
        let adminBalanceBefore = await elfx.balanceOf(admin.address);

        // need to approve the airdrop contract to transfer the elfx onbehalf of the admin
        await elfx.connect(admin).approve(airdrop.address, totalDistribution);

        for (let batch of batches) {
            await airdrop.connect(admin).distribute(batch, distributionPerMeral);
        }

        // for the assertion we need to count the occurancies of unique owners
        let occurances = occuranceCount(owners);
        // for each unique owner
        Object.keys(occurances).forEach(async function (address) {
            // how many times the address occured in owners: how many merals it owns
            let occurance = occurances[address];
            // and its balance of elfx
            let balance = await elfx.balanceOf(address);
            expect(occurance * distributionPerMeral).to.equal(balance);
        })

        let adminBalanceAfter = await elfx.balanceOf(admin.address);
        expect(adminBalanceAfter).to.equal(adminBalanceBefore - totalDistribution);
    });

    it('reverts if the admin does not own enough token to distribute', async function () {
        // get all meral owners from the graph
        const owners = await getOwnerAddresses();
        // big batch size 
        // !!!!! This is the biggest batch size that goes through without getting an EVM error: transaction gas limit
        const batchSize = 500;
        // create batches of owner address of batchSize
        const batches = chunk(owners, batchSize);
        const distributionPerMeral = 100;
        const totalDistribution = owners.length * distributionPerMeral;

        // need to approve the airdrop contract to transfer the elfx onbehalf of the admin
        await elfx.connect(admin).approve(airdrop.address, totalDistribution);

        await expect(airdrop.connect(admin).distribute(batches[0], distributionPerMeral))
            .to.be.revertedWith('Admin does not have enough tokens to distribute');
    });

})
