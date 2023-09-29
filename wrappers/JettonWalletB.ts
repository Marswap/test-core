import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type JettonWalletBConfig = {
    ownerAddress: Address;
    minterAddress: Address;
    walletCode: Cell;
};

export function jettonWalletBConfigToCell(config: JettonWalletBConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.ownerAddress)
        .storeAddress(config.minterAddress)
        .storeRef(config.walletCode)
    .endCell();
}

export class JettonWalletB implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new JettonWalletB(address);
    }

    static createFromConfig(config: JettonWalletBConfig, code: Cell, workchain = 0) {
        const data = jettonWalletBConfigToCell(config);
        const init = { code, data };
        return new JettonWalletB(contractAddress(workchain, init), init);
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
