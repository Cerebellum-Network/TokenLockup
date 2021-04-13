const hre = require("hardhat");
const { expect } = require("chai");

let reserveAccount, recipientAccount, token;
let decimals = 10;
let totalSupply = 10000;

describe("Token", function() {
  beforeEach(async () => {
    const accounts = await hre.ethers.getSigners();

    reserveAccount = accounts[0];
    recipientAccount = accounts[1];

    const Token = await hre.ethers.getContractFactory("Token");
    token = await Token.deploy(
      "Test Scheduled Release Token",
      "SCHR",
      decimals,
      reserveAccount.address,
      totalSupply
    );
  });

  it("deploys a token with the expected details", async function () {
    expect(await token.name()).to.equal("Test Scheduled Release Token");
    expect(await token.symbol()).to.equal("SCHR");
    expect(await token.decimals()).to.equal(decimals);

    expect(await token.totalSupply()).to.equal(totalSupply);
    expect(await token.balanceOf(reserveAccount.address)).to.equal(totalSupply);

    await (token.connect(reserveAccount).transfer(recipientAccount.address, 30));

    expect(await token.balanceOf(recipientAccount.address)).to.equal(30);
    expect(await token.balanceOf(reserveAccount.address)).to.equal(totalSupply - 30);
  });
});