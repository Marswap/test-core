import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano } from 'ton-core';
import { TupleItemInt, TupleItemSlice } from 'ton-core/dist/tuple/tuple';

export type PoolConfig = {
    routerAddress: Address;
    lpFee: bigint;
    protocolFee: bigint;
    refFee: bigint;
    protocolFeesAddress: Address;
    collectedTokenAProtocolFees: bigint;
    collectedTokenBProtocolFees: bigint;
    reserve0: bigint;
    reserve1: bigint;
    wallet0: Address;
    wallet1: Address;
    supplyLP: bigint;
    LPWalletCode: Cell;
    LPAccountCode: Cell;
};

export function poolConfigToCell(params: PoolConfig): Cell {
    return beginCell()
        .storeAddress(params.routerAddress)
        .storeUint(params.lpFee, 8)
        .storeUint(params.protocolFee, 8)
        .storeUint(params.refFee, 8)
        .storeAddress(params.wallet0)
        .storeAddress(params.wallet1)
        .storeCoins(params.supplyLP)
        .storeRef(
            beginCell()
                .storeCoins(params.collectedTokenAProtocolFees)
                .storeCoins(params.collectedTokenBProtocolFees)
                .storeAddress(params.protocolFeesAddress)
                .storeCoins(params.reserve0)
                .storeCoins(params.reserve1)
            .endCell()
        )
        .storeRef(params.LPWalletCode)
        .storeRef(params.LPAccountCode)
    .endCell();
}

export class Pool implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Pool(address);
    }

    static createFromConfig(config: PoolConfig, code: Cell, workchain = 0) {
        const data = poolConfigToCell(config);
        const init = { code, data };
        return new Pool(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendSwap(provider: ContractProvider, via: Sender,
        params: {
            fromAddress: Address;
            tokenWallet: Address;
            jettonAmount: bigint;
            toAddress: Address;
            minOutput: bigint;
            hasRef?: boolean;
            refAddress?: Address;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x25938561, 32)
                .storeUint(0, 64)
                .storeAddress(params.fromAddress)
                .storeAddress(params.tokenWallet)
                .storeCoins(params.jettonAmount)
                .storeCoins(params.minOutput)
                .storeBit(!!params.hasRef)
                .storeBit(true)
                .storeRef(
                    beginCell()
                        .storeAddress(params.fromAddress)
                        .storeAddress(params.refAddress || null)
                    .endCell()
                )
            .endCell()
        });
    }

    async sendProvideLiquidity(provider: ContractProvider, via: Sender,
        params: {
            fromAddress: Address;
            jettonAmount0: bigint;
            jettonAmount1: bigint;
            minLPOut: bigint;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xfcf9e58f, 32)
                .storeUint(0, 64)
                .storeAddress(params.fromAddress)
                .storeCoins(params.minLPOut)
                .storeCoins(params.jettonAmount0)
                .storeCoins(params.jettonAmount1)
            .endCell()
        });
    }

    async sendCbAddLiquidity(provider: ContractProvider, via: Sender,
        params: {
            totAm0: bigint;
            totAm1: bigint;
            userAddress: Address;
            minLpOut: bigint;
            poolCollector: Address;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x56dfeb8a, 32)
                .storeUint(0, 64)
                .storeCoins(params.totAm0)
                .storeCoins(params.totAm1)
                .storeAddress(params.userAddress)
                .storeCoins(params.minLpOut)
                .storeAddress(params.poolCollector)
            .endCell()
        });
    }

    async sendResetGas(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x42a0fb43, 32)
                .storeUint(0, 64)
            .endCell()
        });
    }

    async sendCollectFees(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value: value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x1fcb7d3d, 32)
                .storeUint(0, 64)
            .endCell()
        });
    }

    async sendGetPoolData(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x43c034e6, 32)
                .storeUint(0, 64)
            .endCell()
        });
    }

    async getLpAccountAddress(provider: ContractProvider, address: Address): Promise<Address> {
        const result = await provider.get('get_lp_account_address', [
            {
                type: 'slice',
                cell: beginCell().storeAddress(address).endCell()

            } as TupleItemSlice
        ]);

        return result.stack.readAddress();
    }

    async getExpectedOutputs(provider: ContractProvider, amount: bigint, 
                                        tokenWallet: Address): Promise<[bigint, bigint, bigint]> {
        const result = await provider.get('get_expected_outputs', [
            {
                type: 'int',
                value: amount

            } as TupleItemInt,

            {
                type: 'slice',
                cell: beginCell().storeAddress(tokenWallet).endCell()

            } as TupleItemSlice
        ]);

        return [result.stack.readBigNumber(), result.stack.readBigNumber(), result.stack.readBigNumber()];
    }
}