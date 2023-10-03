import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, fromNano, Sender, SendMode, toNano } from 'ton-core';

export type PTonWalletConfig = {
    owner: Address;
    jettonMasterAddress: Address;
    jettonWalletCode: Cell;
};

export function pTonWalletConfigToCell(config: PTonWalletConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        .storeAddress(config.jettonMasterAddress)
        .storeRef(config.jettonWalletCode)
    .endCell();
}

export class PTonWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new PTonWallet(address);
    }

    static createFromConfig(config: PTonWalletConfig, code: Cell, workchain = 0) {
        const data = pTonWalletConfigToCell(config);
        const init = { code, data };
        return new PTonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendProxy(provider: ContractProvider, via: Sender,
        params: {
            jettonAmount: bigint;
            routerAddress: Address;
            walletTokenBAddress: Address;
            minLPOut: bigint;
        }
    ) {
        await provider.internal(via, {
            value: params.jettonAmount + toNano('0.45'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xf8a7ea5, 32)
                .storeUint(0, 64)
                .storeCoins(params.jettonAmount)
                .storeAddress(params.routerAddress)
                .storeAddress(via.address)
                .storeBit(false)
                .storeCoins(toNano('0.4'))
                .storeBit(true)
                .storeRef(
                    beginCell()
                        .storeUint(0xfcf9e58f, 32)
                        .storeAddress(params.walletTokenBAddress)
                        .storeCoins(params.minLPOut)
                    .endCell()
                )
            .endCell(),
        });
    }

    async getWalletData(provider: ContractProvider): Promise<[bigint, Address, Address, Cell]> {
        const res = await provider.get('get_wallet_data', []);
        return [res.stack.readBigNumber(), res.stack.readAddress(), res.stack.readAddress(), res.stack.readCell()]
    }
}