import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { Cell, beginCell, toNano } from 'ton-core';
import { Router } from '../wrappers/Router';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { JettonMinterB } from '../wrappers/JettonMinterB';
import { JettonWalletB } from '../wrappers/JettonWalletB';

describe('Router', () => {
    let routerCode: Cell;
    let jettonBMinterCode: Cell;

    beforeAll(async () => {
        routerCode = await compile('Router');
        jettonBMinterCode = await compile('JettonMinterB');
    });

    let blockchain: Blockchain;
    let router: SandboxContract<Router>;
    let jettonBMinter: SandboxContract<JettonMinterB>;
    let user: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        user = await blockchain.treasury('user');
        admin = await blockchain.treasury('admin');

        router = blockchain.openContract(Router.createFromConfig({
            isLocked: false,
            adminAddress: admin.address,
            LPWalletCode: await compile('LpWallet'),
            poolCode: await compile('Pool'),
            LPAccountCode: await compile('LpAccount'),
            content: new Cell(),
            pTonWalletCode: await compile('PTonWallet'),

        }, routerCode));

        jettonBMinter = blockchain.openContract(JettonMinterB.createFromConfig({
            content: beginCell().storeUint(456, 256).endCell(),
            adminAddress: admin.address,
            jettonWalletCode: await compile('JettonWalletB')

        }, jettonBMinterCode));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await router.sendDeploy(deployer.getSender(), toNano('2'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: router.address,
            deploy: true,
            success: true,
        });

        const deployJettonBResult = await jettonBMinter.sendDeploy(admin.getSender(), toNano('0.05'));

        expect(deployJettonBResult.transactions).toHaveTransaction({
            from: admin.address,
            to: jettonBMinter.address,
            deploy: true,
            success: true,
        });

    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and router are ready to use
    });

    it('should fulfill the proxy_provide_liquidity request', async () => {

        await jettonBMinter.sendMint(admin.getSender(), {
            toAddress: user.address,
            jettonAmount: toNano('100000'),
            amount: toNano('0.1'),
        });

        const userJettonBWalletAddress = await jettonBMinter.getWalletAddress(user.address);

        expect((await blockchain.getContract(userJettonBWalletAddress)).accountState?.type == 'active');

        const newTotalBSupply = await jettonBMinter.getTotalSupply();

        expect(newTotalBSupply).toEqual(toNano('100000'));

        const userJettonBWallet = blockchain.openContract(JettonWalletB.createFromAddress(userJettonBWalletAddress));

        const routerJettonBWalletAddress = await jettonBMinter.getWalletAddress(router.address);

        await router.sendDeployPTonWallet(admin.getSender());

        const routerPTonWalletAddress = await router.getWalletAddress(router.address);

        expect((await blockchain.getContract(routerPTonWalletAddress)).accountState?.type == 'active');

        const proxyProvideLiquidityResult = await router.sendProxyProvideLiquidity(user.getSender(), {
            jettonAmount: 1001n,
            walletTokenBAddress: routerJettonBWalletAddress,
            minLPOut: 1n
        });

        expect(proxyProvideLiquidityResult.transactions).toHaveTransaction({
            from: user.address,
            to: router.address,
            outMessagesCount: 1,
            success: true
        });

        expect((await router.getPoolsDict()).size).toEqual(1);

        const provideLiquidityBResult = await userJettonBWallet.sendTransfer(user.getSender(), {
            jettonAmount: 1001n,
            toAddress: router.address,
            fromAddress: user.address,
            fwdAmount: toNano('0.4'),
            fwdPayload: beginCell()
                .storeUint(0xfcf9e58f, 32)
                .storeAddress(routerPTonWalletAddress)
                .storeCoins(1)
            .endCell(),
            value: toNano('0.5')
        });

        expect(provideLiquidityBResult.transactions).toHaveTransaction({
            from: routerJettonBWalletAddress,
            to: router.address,
            success: true,
            outMessagesCount: 1
        });
    });
});