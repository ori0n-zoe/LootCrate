const { expect, assert } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { Base64 } = require("js-base64");
const { parse } = require("svg-parser");


describe("Loot Crate", function () {

  let MessageInABottle721, messageInABottle721;
  let owner, addr1, addr2, dao0, dao1, dao2, dao3, dao4, dao5, dao6, dao7,
    dao8, dao9, dao10, dao11, dao12, dao13, dao14, dao15, dao16, addrs;
  let Loot, loot;
  let GenesisMana, genesisMana;
  let GenesisAdventurer, genesisAdventurer;  
  let AdventureTime, adventureTime;
  let atimeCost = ethers.utils.parseEther("100");
  let LootCrate, lootCrate;
  let crateId;
  
  describe("LootCrate part 1 tests", function () {

    beforeEach(async function () {

        // dao0    = Genesis DAO
        // dao1-16 = The Order DAOs, needed for GA contract
        [owner, addr1, addr2, dao0, dao1, dao2, dao3, dao4, dao5, dao6, dao7,
            dao8, dao9, dao10, dao11, dao12, dao13, dao14, dao15, dao16,...addrs] = await ethers.getSigners();

        LootCrate = await ethers.getContractFactory("LootCrate");
        lootCrate = await LootCrate.deploy();

        Loot = await ethers.getContractFactory("Loot");
        loot = await Loot.deploy();
        result = await loot.connect(dao0).claim(69);
        result = await loot.connect(dao0).claim(420);
        result = await loot.connect(dao0).claim(888);

    });

     it("create a Crate aka Quest aka tokenID", async function () {
        result = await lootCrate.connect(addr1).createCrate();
        crateId = await lootCrate.connect(addr1).getNextTokenId();
        result = await lootCrate.connect(addr1).createCrate();
        crateId2 = await lootCrate.connect(addr1).getNextTokenId();
        expect(crateId).to.equal(crateId2-1);
     }); 

     it("add reward without calling setApprovalForAll reverts with 'ERC721: transfer caller is not owner nor approved'", async function () {
        crateId = await lootCrate.connect(dao0).getNextTokenId();
        result = await lootCrate.connect(dao0).createCrate();
        let input = {erc721contract:loot.address, tokenId:69, rarity:1};
        await expect(lootCrate.connect(dao0).addItemToCrate(crateId, input)).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
     }); 

     it("adding 3 rewards works", async function () {
        crateId = await lootCrate.connect(dao0).getNextTokenId();
        result = await lootCrate.connect(dao0).createCrate();
        let reward1 = {erc721contract:loot.address, tokenId:69, rarity:1};
        let reward2 = {erc721contract:loot.address, tokenId:420, rarity:1};
        let reward3 = {erc721contract:loot.address, tokenId:888, rarity:1};
        result = await loot.connect(dao0).setApprovalForAll(lootCrate.address, true);
        result = await lootCrate.connect(dao0).addItemToCrate(crateId, reward1);
        result = await lootCrate.connect(dao0).addItemToCrate(crateId, reward2);
        result = await lootCrate.connect(dao0).addItemToCrate(crateId, reward3);
        result = await lootCrate.connect(addr1).rewards(1,2)
        // ensure we've added the item
        expect(result[0]).to.equal(reward3["erc721contract"]);
        expect(result[1]).to.equal(reward3["tokenId"]);
        expect(result[2]).to.equal(reward3["rarity"]);
        // check that exactly 3 keys exist for the Quest owned by dao0
        expect(await lootCrate.connect(addr1).balanceOf(dao0.address, crateId)).to.equal(3);
     }); 
  });
  

  describe("LootCrate part 2 tests", function () {

    beforeEach(async function () {

        // dao0    = Genesis DAO
        // dao1-16 = The Order DAOs, needed for GA contract
        [owner, addr1, addr2, dao0, dao1, dao2, dao3, dao4, dao5, dao6, dao7,
            dao8, dao9, dao10, dao11, dao12, dao13, dao14, dao15, dao16,...addrs] = await ethers.getSigners();

        LootCrate = await ethers.getContractFactory("LootCrate");
        lootCrate = await LootCrate.deploy();

        Loot = await ethers.getContractFactory("Loot");
        loot = await Loot.deploy();
        result = await loot.connect(dao0).claim(69);
        result = await loot.connect(dao0).claim(420);
        result = await loot.connect(dao0).claim(888);

        // create
        crateId = await lootCrate.connect(dao0).getNextTokenId();
        result = await lootCrate.connect(dao0).createCrate();        
        let reward1 = {erc721contract:loot.address, tokenId:69, rarity:1};
        let reward2 = {erc721contract:loot.address, tokenId:420, rarity:3};
        let reward3 = {erc721contract:loot.address, tokenId:888, rarity:15};
        result = await loot.connect(dao0).setApprovalForAll(lootCrate.address, true);
        result = await lootCrate.connect(dao0).addItemToCrate(crateId, reward1);
        result = await lootCrate.connect(dao0).addItemToCrate(crateId, reward2);
        result = await lootCrate.connect(dao0).addItemToCrate(crateId, reward3);

        // distribute the keys to players
        result = await lootCrate.connect(dao0).safeTransferFrom(dao0.address, addr1.address, crateId, 2, ethers.utils.hexlify(0));
        result = await lootCrate.connect(dao0).safeTransferFrom(dao0.address, addr2.address, crateId, 1, ethers.utils.hexlify(0));

    });

     it("trying to claim rewards for an empty crate reverts with 'NO_CRATE_REWARDS_EXIST'", async function () {
        await expect(lootCrate.connect(addr1).claimItemFromCrate(2)).to.be.revertedWith("NO_CRATE_REWARDS_EXIST");
     }); 

     it("claiming gets you an item at random", async function () {
        // console.log("addr1     = ", addr1.address);
        // console.log("addr2     = ", addr2.address); 
        // console.log("lootCrate = ", lootCrate.address);

        result = await lootCrate.connect(addr1).claimItemFromCrate(crateId);
        expect(await loot.connect(addr1).balanceOf(addr1.address)).to.equal(1);
        expect(await lootCrate.connect(addr1).balanceOf(addr1.address, crateId)).to.equal(1);

        result = await lootCrate.connect(addr1).claimItemFromCrate(crateId);
        expect(await loot.connect(addr1).balanceOf(addr1.address)).to.equal(2);
        expect(await lootCrate.connect(addr1).balanceOf(addr1.address, crateId)).to.equal(0);

        result = await lootCrate.connect(addr2).claimItemFromCrate(crateId);
        expect(await loot.connect(addr1).balanceOf(addr2.address)).to.equal(1);
        expect(await lootCrate.connect(addr1).balanceOf(addr2.address, crateId)).to.equal(0);

        // result = await loot.connect(addr1).ownerOf(69);
        // console.log("ownerOf loot #69  = ", result);
        // result = await loot.connect(addr1).ownerOf(420);
        // console.log("ownerOf loot #420 = ", result);
        // result = await loot.connect(addr1).ownerOf(888);
        // console.log("ownerOf loot #888 = ", result);        
     }); 

     it("trying to claim if you don't have a key reverts with 'CALLER_DOES_NOT_HAVE_ANY_KEY'", async function () {
        await expect(lootCrate.connect(dao1).claimItemFromCrate(crateId)).to.be.revertedWith("CALLER_DOES_NOT_HAVE_ANY_KEY");
     }); 

  });

});
