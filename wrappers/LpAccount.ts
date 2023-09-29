import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano } from 'ton-core';

export type LpAccountConfig = {
    user: Address;
    pool: Address;
    amount0: bigint;
    amount1: bigint;
};

export function lpAccountConfigToCell(config: LpAccountConfig): Cell {
    return beginCell()
        .storeAddress(config.user)
        .storeAddress(config.pool)
        .storeCoins(config.amount0)
        .storeCoins(config.amount1)
    .endCell();
}

export class LpAccount implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new LpAccount(address);
    }

    static createFromConfig(config: LpAccountConfig, code: Cell, workchain = 0) {
        const data = lpAccountConfigToCell(config);
        const init = { code, data };
        return new LpAccount(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendAddLiquidity(provider: ContractProvider, via: Sender,
        params: {
            newAmount0: bigint;
            newAmount1: bigint;
            minLPOut: bigint;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x3ebe5431, 32)
                .storeUint(0, 64)
                .storeCoins(params.newAmount0)
                .storeCoins(params.newAmount1)
                .storeCoins(params.minLPOut)
            .endCell(),
        });
    }

    async sendRefundLiquidity(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.5'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x0bf3f447, 32)
                .storeUint(0, 64)
            .endCell(),
        });
    }

    async sendDirectAddLiquidity(provider: ContractProvider, via: Sender,
        params: {
            amount0: bigint;
            amount1: bigint;
            minLPOut: bigint;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.5'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x4cf82803, 32)
                .storeUint(0, 64)
                .storeCoins(params.amount0)
                .storeCoins(params.amount1)
                .storeCoins(params.minLPOut)
            .endCell()
        });
    }

    async sendResetGas(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.5'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x42a0fb43, 32)
                .storeUint(0, 64)
            .endCell()
        });
    }

    async sendGetLpAccountData(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.5'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xea97bbef, 32)
                .storeUint(0, 64)
            .endCell()
        });
    }
}