import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { LpAccount } from '../wrappers/LpAccount';

describe('LpAccount', () => {
    let lpAccountCode: Cell;

    beforeAll(async () => {
        lpAccountCode = await compile('LpAccount');
    });

    let blockchain: Blockchain;
    let lpAccount: SandboxContract<LpAccount>;
    let user: SandboxContract<TreasuryContract>;
    let someone: SandboxContract<TreasuryContract>;
    let pool: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        user = await blockchain.treasury('user');
        someone = await blockchain.treasury('someone');
        pool = await blockchain.treasury('pool');

        lpAccount = blockchain.openContract(LpAccount.createFromConfig({
            user: user.address,
            pool: pool.address,
            amount0: toNano('0'),
            amount1: toNano('0')
        }, lpAccountCode));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await lpAccount.sendDeploy(deployer.getSender(), toNano('5'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lpAccount.address,
            deploy: true,
            success: true,
        });

    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and router are ready to use
    });

    it('should add new liquidity', async () => {
        const wrongSenderResult = await lpAccount.sendAddLiquidity(someone.getSender(), {
            newAmount0: toNano('1'),
            newAmount1: toNano('0'),
            minLPOut: toNano('1')
        });

        expect(wrongSenderResult.transactions).toHaveTransaction({
            from: someone.address,
            to: lpAccount.address,
            success: false
        });

        const addLiquidityAResult = await lpAccount.sendAddLiquidity(pool.getSender(), {
            newAmount0: toNano('1'),
            newAmount1: toNano('0'),
            minLPOut: toNano('1')
        });

        expect(addLiquidityAResult.transactions).toHaveTransaction({
            from: pool.address,
            to: lpAccount.address,
            success: true
        });

        const addLiquidityBResult = await lpAccount.sendAddLiquidity(pool.getSender(), {
            newAmount0: toNano('0'),
            newAmount1: toNano('10'),
            minLPOut: toNano('1')
        });

        expect(addLiquidityBResult.transactions).toHaveTransaction({
            from: pool.address,
            to: lpAccount.address,
            success: true,
            outMessagesCount: 1
        });
    });

    it('should add new liquidity directly', async () => {
        const wrongSenderResult = await lpAccount.sendDirectAddLiquidity(someone.getSender(), {
            amount0: toNano('1'),
            amount1: toNano('0'),
            minLPOut: toNano('1')
        });

        expect(wrongSenderResult.transactions).toHaveTransaction({
            from: someone.address,
            to: lpAccount.address,
            success: false
        });

        const addInsufficientLiquidityResult = await lpAccount.sendDirectAddLiquidity(user.getSender(), {
            amount0: toNano('1'),
            amount1: toNano('0'),
            minLPOut: toNano('1')
        });

        expect(addInsufficientLiquidityResult.transactions).toHaveTransaction({
            from: user.address,
            to: lpAccount.address,
            success: false,
            exitCode: 81
        });

        const badAddLiquidityResult = await lpAccount.sendDirectAddLiquidity(user.getSender(), {
            amount0: toNano('1'),
            amount1: toNano('1'),
            minLPOut: toNano('1')
        });

        expect(badAddLiquidityResult.transactions).toHaveTransaction({
            from: user.address,
            to: lpAccount.address,
            success: false,
            exitCode: 80
        });

        lpAccount = blockchain.openContract(LpAccount.createFromConfig({
            user: user.address,
            pool: pool.address,
            amount0: toNano('1'),
            amount1: toNano('1')
        }, lpAccountCode));

        const successAddLiquidityResult = await lpAccount.sendDirectAddLiquidity(user.getSender(), {
            amount0: toNano('1'),
            amount1: toNano('1'),
            minLPOut: toNano('1')
        });

        expect(successAddLiquidityResult.transactions).toHaveTransaction({
            from: user.address,
            to: lpAccount.address,
            success: true,
            outMessagesCount: 1
        });
    });

    it('should refund', async () => {
        const wrongSenderResult = await lpAccount.sendRefundLiquidity(someone.getSender());

        expect(wrongSenderResult.transactions).toHaveTransaction({
            from: someone.address,
            to: lpAccount.address,
            success: false
        });

        const badRefundResult = await lpAccount.sendRefundLiquidity(user.getSender());

        expect(badRefundResult.transactions).toHaveTransaction({
            from: user.address,
            to: lpAccount.address,
            success: false,
            exitCode: 80
        });

        lpAccount = blockchain.openContract(LpAccount.createFromConfig({
            user: user.address,
            pool: pool.address,
            amount0: toNano('1'),
            amount1: toNano('1')
        }, lpAccountCode));

        const successRefundResult = await lpAccount.sendRefundLiquidity(user.getSender());

        expect(successRefundResult.transactions).toHaveTransaction({
            from: user.address,
            to: lpAccount.address,
            success: true,
            outMessagesCount: 1
        });
    });

    it('should reset gas', async () => {
        const wrongSenderResult = await lpAccount.sendResetGas(someone.getSender());

        expect(wrongSenderResult.transactions).toHaveTransaction({
            from: someone.address,
            to: lpAccount.address,
            success: false
        });
        const resetGasResult = await lpAccount.sendResetGas(user.getSender());

        expect(resetGasResult.transactions).toHaveTransaction({
            from: user.address,
            to: lpAccount.address,
            success: true,
            outMessagesCount: 1
        });
    });

    it('should response on a get request', async () => {
        const getLpAccountDataResult = await lpAccount.sendGetLpAccountData(someone.getSender());

        expect(getLpAccountDataResult.transactions).toHaveTransaction({
            from: lpAccount.address,
            to: someone.address,
            success: true
        });
    });
});