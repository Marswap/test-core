import { Blockchain, SandboxContract, TreasuryContract, internal } from '@ton-community/sandbox';
import { Cell, beginCell, toNano } from 'ton-core';
import { Router } from '../wrappers/Router';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { JettonMinterA } from '../wrappers/JettonMinterA';
import { JettonWalletA } from '../wrappers/JettonWalletA';
import { JettonMinterB } from '../wrappers/JettonMinterB';
import { JettonWalletB } from '../wrappers/JettonWalletB';
import { Pool } from '../wrappers/Pool';
import { randomAddress } from '@ton-community/test-utils';
import { Opcodes } from '../wrappers/helpers/op';

describe('Router', () => {
    let routerCode: Cell;
    let jettonAMinterCode: Cell;
    let jettonBMinterCode: Cell;

    beforeAll(async () => {
        routerCode = await compile('Router');
        jettonAMinterCode = await compile('JettonMinterA');
        jettonBMinterCode = await compile('JettonMinterB');
    });

    let blockchain: Blockchain;
    let router: SandboxContract<Router>;
    let jettonAMinter: SandboxContract<JettonMinterA>;
    let jettonBMinter: SandboxContract<JettonMinterB>;
    let user: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
    let tokenWallet0: SandboxContract<TreasuryContract>;
    let tokenWallet1: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        user = await blockchain.treasury('user');
        admin = await blockchain.treasury('admin');
        tokenWallet0 = await blockchain.treasury('tokenWallet0');
        tokenWallet1 = await blockchain.treasury('tokenWallet1');

        router = blockchain.openContract(Router.createFromConfig({
            isLocked: false,
            adminAddress: admin.address,
            LPWalletCode: await compile('LpWallet'),
            poolCode: await compile('Pool'),
            LPAccountCode: await compile('LpAccount'),
            content: new Cell(),
            pTonWalletCode: await compile('PTonWallet'),
    
        }, routerCode));

        jettonAMinter = blockchain.openContract(JettonMinterA.createFromConfig({
            content: beginCell().storeUint(123, 256).endCell(),
            adminAddress: admin.address,
            jettonWalletCode: await compile('JettonWalletA')

        }, jettonAMinterCode));

        jettonBMinter = blockchain.openContract(JettonMinterB.createFromConfig({
            content: beginCell().storeUint(456, 256).endCell(),
            adminAddress: admin.address,
            jettonWalletCode: await compile('JettonWalletB')

        }, jettonBMinterCode));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await router.sendDeploy(deployer.getSender(), toNano('5'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: router.address,
            deploy: true,
            success: true,
        });

        const deployJettonAResult = await jettonAMinter.sendDeploy(admin.getSender(), toNano('0.05'));

        expect(deployJettonAResult.transactions).toHaveTransaction({
            from: admin.address,
            to: jettonAMinter.address,
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

    it('should not allow to provide pTon liquidity in case of insufficient msg_value', async () => {
        const proxyProvideLiquidityResult = await blockchain.sendMessage(
            internal({
                from: user.address,
                to: router.address,
                value: toNano('0.5'),
                body: beginCell()
                .storeUint(Opcodes.proxyProvideLiquidity, 32)
                .storeUint(0, 64)
                .storeCoins(toNano('1'))
                .storeRef(
                    beginCell()
                        .storeUint(0xfcf9e58f, 32)
                        .storeAddress(tokenWallet1.address)
                        .storeCoins(1n)
                    .endCell()
                )
                .endCell()
            })
        );

        expect(proxyProvideLiquidityResult.transactions).toHaveTransaction({
            from: user.address,
            on: router.address,
            success: false,
            exitCode: 89
        });

        expect(proxyProvideLiquidityResult.transactions).toHaveTransaction({
            from: router.address,
            on: user.address,
            success: true,
            inMessageBounced: true
        });
    });

    it('should fulfill the provide_lp request', async () => {

        const mintUserJettonAResult = await jettonAMinter.sendMint(admin.getSender(), {
            toAddress: user.address,
            jettonAmount: toNano('100000'),
            amount: toNano('0.1'),
        });

        expect(mintUserJettonAResult.transactions).toHaveTransaction({
            from: admin.address,
            to: jettonAMinter.address,
            success: true,
        });

        const userJettonAWalletAddress = await jettonAMinter.getWalletAddress(user.address);

        expect((await blockchain.getContract(userJettonAWalletAddress)).accountState?.type == 'active');

        const newTotalASupply = await jettonAMinter.getTotalSupply();

        expect(newTotalASupply).toEqual(toNano('100000'));

        const userJettonAWallet = blockchain.openContract(JettonWalletA.createFromAddress(userJettonAWalletAddress));

        const routerJettonAWalletAddress = await jettonAMinter.getWalletAddress(router.address);

        const mintUserJettonBResult = await jettonBMinter.sendMint(admin.getSender(), {
            toAddress: user.address,
            jettonAmount: toNano('100000'),
            amount: toNano('0.1'),
        });

        expect(mintUserJettonBResult.transactions).toHaveTransaction({
            from: admin.address,
            to: jettonBMinter.address,
            success: true,
        });

        const userJettonBWalletAddress = await jettonBMinter.getWalletAddress(user.address);

        expect((await blockchain.getContract(userJettonBWalletAddress)).accountState?.type == 'active');

        const newTotalBSupply = await jettonBMinter.getTotalSupply();

        expect(newTotalBSupply).toEqual(toNano('100000'));

        const userJettonBWallet = blockchain.openContract(JettonWalletB.createFromAddress(userJettonBWalletAddress));

        const routerJettonBWalletAddress = await jettonBMinter.getWalletAddress(router.address);

        const provideLiquidityAResult = await userJettonAWallet.sendTransfer(user.getSender(), {
                jettonAmount: 1001n,
                toAddress: router.address, 
                fromAddress: user.address, 
                fwdAmount: toNano('1'),
                fwdPayload: beginCell()
                    .storeUint(0xfcf9e58f, 32)
                    .storeAddress(routerJettonBWalletAddress) 
                    .storeCoins(1)
                .endCell(),
                value: toNano('2')
        });

        expect(provideLiquidityAResult.transactions).toHaveTransaction({
            from: routerJettonAWalletAddress,
            to: router.address,
            success: true
        });

        expect((await router.getPoolsDict()).size).toEqual(1);
        
        const provideLiquidityBResult = await userJettonBWallet.sendTransfer(user.getSender(), {
                jettonAmount: 1001n,
                toAddress: router.address, 
                fromAddress: user.address, 
                fwdAmount: toNano('1'),
                fwdPayload: beginCell()
                    .storeUint(0xfcf9e58f, 32)
                    .storeAddress(routerJettonAWalletAddress) 
                    .storeCoins(1)
                .endCell(),
                value: toNano('2')
        });

        expect(provideLiquidityBResult.transactions).toHaveTransaction({
            from: routerJettonBWalletAddress,
            to: router.address,
            success: true
        });

        const poolAddress = await router.getPoolAddress(routerJettonAWalletAddress, routerJettonBWalletAddress);
        expect((await blockchain.getContract(poolAddress)).accountState?.type == 'active');

        const pool = blockchain.openContract(Pool.createFromAddress(poolAddress));

        const lpAccountAddress = await pool.getLpAccountAddress(user.address);
        expect((await blockchain.getContract(lpAccountAddress)).accountState?.type == 'active');
    });

    it('should fulfill swap request', async () => {

        const swapResult = await router.sendSwap(tokenWallet0.getSender(), {
            jettonAmount: 100n,
            fromAddress: user.address,
            walletTokenBAddress: tokenWallet1.address,
            toAddress: user.address,
            expectedOutput: 100n,
            refAddress: randomAddress(),
        });

        expect(swapResult.transactions).toHaveTransaction({
            from: tokenWallet0.address,
            to: router.address,
            success: true,
            outMessagesCount: 1
        });
    });

    it('should refuse to pay if caller is not valid', async () => {

        const wrongSenderResult = await router.sendPayTo(user.getSender(), {
            owner: randomAddress(),
            tokenAAmount: 100n,
            walletTokenAAddress: tokenWallet0.address,
            tokenBAmount: 200n,
            walletTokenBAddress: tokenWallet1.address,
        });

        expect(wrongSenderResult.transactions).toHaveTransaction({
            from: user.address,
            to: router.address,
            success: false,
            exitCode: 82
        });
    });

    it('should collect fees from pool', async () => {

        const poolAddress = await router.getPoolAddress(tokenWallet0.address, tokenWallet1.address);

        const wrongSenderResult = await router.sendCollectFees(user.getSender(), {
            jetton0Address: tokenWallet0.address,
            jetton1Address: tokenWallet1.address
        });

        expect(wrongSenderResult.transactions).toHaveTransaction({
            from: user.address,
            to: router.address,
            success: false
        });

        const collectFeesResult = await router.sendCollectFees(admin.getSender(), {
            jetton0Address: tokenWallet0.address,
            jetton1Address: tokenWallet1.address
        });

        expect(collectFeesResult.transactions).toHaveTransaction({
            from: router.address,
            to: poolAddress
        });
    });

    it('should set fees', async () => {

        const poolAddress = await router.getPoolAddress(tokenWallet0.address, tokenWallet1.address);

        const setFeesResult = await router.sendSetFees(admin.getSender(), {
            jetton0Address: tokenWallet0.address,
            jetton1Address: tokenWallet1.address,
            newLPFee: 2n,
            newProtocolFee: 1n,
            newRefFee: 1n,
            newProtocolFeeAddress: randomAddress()
        });

        expect(setFeesResult.transactions).toHaveTransaction({
            from: router.address,
            to: poolAddress
        });
    });

    it('should lock and unlock', async () => {

        const lockResult = await router.sendLock(admin.getSender());
        
        expect(lockResult.transactions).toHaveTransaction({
            from: admin.address,
            to: router.address,
            success: true
        });

        expect(await router.getIsLocked()).toEqual(true);

        const unlockResult = await router.sendUnlock(admin.getSender());
        
        expect(unlockResult.transactions).toHaveTransaction({
            from: admin.address,
            to: router.address,
            success: true
        });

        expect(await router.getIsLocked()).toEqual(false);
    });
});
