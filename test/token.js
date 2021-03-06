const LogicBank = artifacts.require('./helpers/MockLogicBank.sol');
const ERC1214 = artifacts.require('./ERC1214.sol');
const Founder = web3.eth.accounts[0];
const Investor = web3.eth.accounts[1];
const assertRevert = require("./helpers/assertRevert");

contract('ERC1214', (accounts) => {
  let proxy;
  let proxyInstance;
  let controller;

  before(async () => {
    controller = await LogicBank.new(100000e18);
    proxyInstance = await ERC1214.new();
    await proxyInstance.setKeyHolder('controller', controller.address);
    proxy = LogicBank.at(proxyInstance.address);
    await proxy.initialize(100000e18);
    await proxy.mint(Founder, 4000000000);
  });

  it('should display name and symbol properly', async () => {
    assert.equal(await proxy.name.call(), "Upgradeable Token");
    assert.equal(await proxy.symbol.call(), "UPT");
  });

  it('should delegate call to controller to read balance data', async () => {
    assert.equal((await proxy.balanceOf(Founder)).toNumber(), 4000000000);
    assert.equal((await proxy.totalSupply()).toNumber(), 4000000000);
    assert.equal(await proxyInstance.addresses.call('controller'), controller.address)
    assert.equal(await proxyInstance.addresses.call('owner'), accounts[0])
    assert.equal(await proxy.checkAddress.call('controller'), controller.address)
    assert.equal(await proxy.checkAddress.call('owner'), accounts[0])
  });

  it('should delegate call to controller and allow transfer', async () => {
    await proxy.transfer(Investor, 2000000000)
    assert.equal((await proxy.balanceOf(Investor)).toNumber(), 2000000000);
    assert.equal((await proxy.totalSupply()).toNumber(), 4000000000);
    assert.equal(await proxyInstance.addresses.call('controller'), controller.address)
    assert.equal(await proxyInstance.addresses.call('owner'), accounts[0])
    assert.equal(await proxy.checkAddress.call('controller'), controller.address)
    assert.equal(await proxy.checkAddress.call('owner'), accounts[0])
  });

  it('should delegate call to controller and allow approve plus transferFrom', async () => {
    await proxy.approve(Investor, 2000000000);
    assert.equal((await proxy.allowance.call(Founder, Investor)).toNumber(), 2000000000)

    await proxy.transferFrom(Founder, Investor, 2000000000, {from: Investor});
    assert.equal((await proxy.balanceOf(Investor)).toNumber(), 4000000000);
    assert.equal((await proxy.totalSupply()).toNumber(), 4000000000);
    assert.equal(await proxyInstance.addresses.call('controller'), controller.address)
    assert.equal(await proxyInstance.addresses.call('owner'), accounts[0])
    assert.equal(await proxy.checkAddress.call('controller'), controller.address)
    assert.equal(await proxy.checkAddress.call('owner'), accounts[0])
  });

  it('should allow to change controller and retain data', async () => {
    await proxy.mint(Founder, 4000000000);
    await proxy.approve(Investor, 2000000000);
    await proxy.transferFrom(Founder, Investor, 2000000000, {from: Investor});

    // change controller and set
    const controllerNew = await LogicBank.new(100000e18);
    await proxyInstance.setKeyHolder('controller', controllerNew.address);

    controller = controllerNew;
    assert.equal((await proxy.balanceOf(Investor)).toNumber(), 6000000000);
    assert.equal((await proxy.totalSupply()).toNumber(), 8000000000);
    assert.equal(await proxyInstance.addresses.call('controller'), controller.address)
    assert.equal(await proxyInstance.addresses.call('owner'), accounts[0])
    assert.equal(await proxy.checkAddress.call('controller'), controller.address)
    assert.equal(await proxy.checkAddress.call('owner'), accounts[0])
  });

  it('should not allow to set controller by non owner', async () => {
    const controllerNew = await LogicBank.new(100000e18);
    try {
      await proxyInstance.setKeyHolder('controller', controllerNew.address, {from: Investor});
      assert.fail("should have failed before")
    } catch(error) {
      assertRevert(error);
    }
    assert.equal(await proxyInstance.addresses.call('controller'), controller.address)
    assert.equal(await proxyInstance.addresses.call('owner'), accounts[0])
    assert.equal(await proxy.checkAddress.call('controller'), controller.address)
    assert.equal(await proxy.checkAddress.call('owner'), accounts[0])
  });

  it('should delegate call to controller and allow transfer with data', async () => {
    await proxy.transferData(Investor, 2000000000, "");
    assert.equal((await proxy.balanceOf(Investor)).toNumber(), 8000000000);
    assert.equal((await proxy.totalSupply()).toNumber(), 8000000000);
    assert.equal(await proxyInstance.addresses.call('controller'), controller.address)
    assert.equal(await proxyInstance.addresses.call('owner'), accounts[0])
    assert.equal(await proxy.checkAddress.call('controller'), controller.address)
    assert.equal(await proxy.checkAddress.call('owner'), accounts[0])
  });

  it('should not allow to mint tokens more than cap', async () => {
    try {
      await proxy.mint(Founder, (100001e18 - 8000000000));
      assert.fail('should have failed before');
    } catch (error) {
      assertRevert(error);
    }
    assert.equal((await proxy.totalSupply.call()).toNumber(), 8000000000);
  });

  it('should not allow to re-initialize token contract', async () => {
    const capBefore = await proxy.cap.call();
    try {
      await proxy.initialize(100000e18);
      assert.fail('should have failed before');
    } catch (error) {
      assertRevert(error);
    }
    assert.equal((await proxy.cap.call()).toNumber(), capBefore.toNumber());
  });

});
