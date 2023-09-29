import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type JettonWalletAConfig = {
    ownerAddress: Address;
    minterAddress: Address;
    walletCode: Cell;
};

export function jettonWalletAConfigToCell(config: JettonWalletAConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.ownerAddress)
        .storeAddress(config.minterAddress)
        .storeRef(config.walletCode)
    .endCell();
}

export class JettonWalletA implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new JettonWalletA(address);
    }

    static createFromConfig(config: JettonWalletAConfig, code: Cell, workchain = 0) {
        const data = jettonWalletAConfigToCell(config);
        const init = { code, data };
        return new JettonWalletA(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendTransfer(provider: ContractProvider, via: Sender,
        opts: {
            value: bigint;
            toAddress: Address;
            fwdAmount: bigint;
            fromAddress: Address;
            jettonAmount: bigint;
            fwdPayload: Cell;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xf8a7ea5, 32)
                .storeUint(0, 64)
                .storeCoins(opts.jettonAmount)
                .storeAddress(opts.toAddress)
                .storeAddress(opts.fromAddress)
                .storeUint(0, 1)
                .storeCoins(opts.fwdAmount)
                .storeUint(1, 1)
                .storeRef(opts.fwdPayload)
            .endCell(),
        });
    }
}
