import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano } from 'ton-core';
import { TupleItemSlice } from 'ton-core/dist/tuple/tuple';

export type JettonMinterAConfig = {
    adminAddress: Address;
    content: Cell;
    jettonWalletCode: Cell;
};

export function jettonMinterAConfigToCell(config: JettonMinterAConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.adminAddress)
        .storeRef(config.content)
        .storeRef(config.jettonWalletCode)
    .endCell();
}

export class JettonMinterA implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new JettonMinterA(address);
    }

    static createFromConfig(config: JettonMinterAConfig, code: Cell, workchain = 0) {
        const data = jettonMinterAConfigToCell(config);
        const init = { code, data };
        return new JettonMinterA(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMint(
        provider: ContractProvider,
        via: Sender,
        opts: {
            toAddress: Address;
            jettonAmount: bigint;
            amount: bigint;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.8'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(21, 32)
                .storeUint(0, 64)
                .storeAddress(opts.toAddress)
                .storeCoins(opts.amount)
                .storeRef(
                    beginCell()
                        .storeUint(0x178d4519, 32)
                        .storeUint(0, 64)
                        .storeCoins(opts.jettonAmount)
                        .storeAddress(this.address)
                        .storeAddress(this.address)
                        .storeCoins(0)
                        .storeUint(0, 1)
                        .endCell()
                )
                .endCell(),
        });
    }

    async getTotalSupply(provider: ContractProvider): Promise<bigint> {
        const result = await provider.get('get_jetton_data', []);
        return result.stack.readBigNumber();
    }

    async getWalletAddress(provider: ContractProvider, address: Address): Promise<Address> {
        const result = await provider.get('get_wallet_address', [
            {
                type: 'slice',
                cell: beginCell().storeAddress(address).endCell(),
            } as TupleItemSlice,
        ]);

        return result.stack.readAddress();
    }
}