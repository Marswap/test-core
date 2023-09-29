import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { Address, Cell, toNano } from 'ton-core';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { Pool } from '../wrappers/Pool';

const zeroAddress = new Address(0, Buffer.alloc(32, 0));

describe('Pool', () => {
    let poolCode: Cell;

    beforeAll(async () => {
        poolCode = await compile('Pool');
    });

    let blockchain: Blockchain;
    let pool: SandboxContract<Pool>;
    let user: SandboxContract<TreasuryContract>;
    let router: SandboxContract<TreasuryContract>;
    let wallet0: SandboxContract<TreasuryContract>;
    let wallet1: SandboxContract<TreasuryContract>;
    let protocolFeeAddress: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        user = await blockchain.treasury('user');
        router = await blockchain.treasury('router');
        wallet0 = await blockchain.treasury('wallet0');
        wallet1 = await blockchain.treasury('wallet1');
        protocolFeeAddress = await blockchain.treasury('protocolFeeAddress');

        pool = blockchain.openContract(Pool.createFromConfig({
            routerAddress: router.address,
            lpFee: 20n,
            protocolFee: 10n,
            refFee: 5n,
            protocolFeesAddress: protocolFeeAddress.address,
            collectedTokenAProtocolFees: 0n,
            collectedTokenBProtocolFees: 0n,
            reserve0: 0n,
            reserve1: 0n,
            wallet0: wallet0.address,
            wallet1: wallet1.address,
            supplyLP: 0n,
            LPWalletCode: await compile('LpWallet'),
            LPAccountCode: await compile('LpAccount')

        }, poolCode));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await pool.sendDeploy(deployer.getSender(), toNano('5'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: pool.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and router are ready to use
    });

    it('should provide liquidity', async () => {
        const provideLiquidityAResult = await pool.sendProvideLiquidity(router.getSender(), {
            fromAddress: user.address,
            jettonAmount0: toNano('0'),
            jettonAmount1: toNano('1001'),
            minLPOut: toNano('1')
        });

        expect(provideLiquidityAResult.transactions).toHaveTransaction({
            from: router.address, 
            to: pool.address,
            success: true,
            outMessagesCount: 1
        });

        const provideLiquidityBResult = await pool.sendProvideLiquidity(router.getSender(), {
            fromAddress: user.address,
            jettonAmount0: toNano('10000'),
            jettonAmount1: toNano('0'),
            minLPOut: toNano('1')
        });

        expect(provideLiquidityBResult.transactions).toHaveTransaction({
            from: router.address, 
            to: pool.address,
            success: true, 
            outMessagesCount: 1
        });
    });

    it('should reset gas', async () => {
        const resetGasResult = await pool.sendResetGas(router.getSender());

        expect(resetGasResult.transactions).toHaveTransaction({
            from: pool.address,
            to: router.address,
            success: true
        });
    });

    it('should collect fees', async () => {
        const noLiquidityResult = await pool.sendCollectFees(router.getSender(), toNano('0.05'));

        expect(noLiquidityResult.transactions).toHaveTransaction({
            from: router.address,
            to: pool.address,
            success: false,
            exitCode: 80
        });

        pool = blockchain.openContract(Pool.createFromConfig({
            routerAddress: router.address,
            lpFee: 20n,
            protocolFee: 0n,
            refFee: 10n,
            protocolFeesAddress: zeroAddress,
            collectedTokenAProtocolFees: 110n,
            collectedTokenBProtocolFees: 440n,
            wallet0: wallet0.address,
            wallet1: wallet1.address,
            reserve0: 1310n,
            reserve1: 203333n,
            supplyLP: 10000000n,
            LPWalletCode: await compile('LpWallet'),
            LPAccountCode: await compile('LpAccount'),
        }, poolCode));

        const zeroFeeAddressResult = await pool.sendCollectFees(router.getSender(), toNano('0.05'));

        expect(zeroFeeAddressResult.transactions).toHaveTransaction({
            from: router.address,
            to: pool.address,
            success: false,
            exitCode: 91
        });

        pool = blockchain.openContract(Pool.createFromConfig({
            routerAddress: router.address,
            lpFee: 20n,
            protocolFee: 0n,
            refFee: 10n,
            protocolFeesAddress: protocolFeeAddress.address,
            collectedTokenAProtocolFees: 100000n,
            collectedTokenBProtocolFees: 200000000n,
            wallet0: wallet0.address,
            wallet1: wallet1.address,
            reserve0: 1310n,
            reserve1: 203333n,
            supplyLP: 10000000n,
            LPWalletCode: await compile('LpWallet'),
            LPAccountCode: await compile('LpAccount'),
        }, poolCode));

        const collectFeesResult = await pool.sendCollectFees(router.getSender(), toNano('0.05'));

        expect(collectFeesResult.transactions).toHaveTransaction({
            from: pool.address,
            to: router.address,
            success: true
        });
    });

    it('should swap', async () => {
        pool = blockchain.openContract(Pool.createFromConfig({
            routerAddress: router.address,
            lpFee: 20n,
            protocolFee: 0n,
            refFee: 10n,
            protocolFeesAddress: protocolFeeAddress.address,
            collectedTokenAProtocolFees: 100000n,
            collectedTokenBProtocolFees: 200000000n,
            wallet0: wallet0.address,
            wallet1: wallet1.address,
            reserve0: 1000000000000n,
            reserve1: 2000000000000n,
            supplyLP: 500000000000000n,
            LPWalletCode: await compile('LpWallet'),
            LPAccountCode: await compile('LpAccount'),
        }, poolCode));

        const swapResult = await pool.sendSwap(router.getSender(), {
            fromAddress: user.address,
            jettonAmount: 20000000000n,
            tokenWallet: wallet0.address,
            toAddress: user.address,
            minOutput: 200n,
        });

        expect(swapResult.transactions).toHaveTransaction({
            from: router.address,
            to: pool.address,
            success: true,
            outMessagesCount: 1
        });
    });
});