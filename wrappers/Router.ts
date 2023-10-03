import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, Sender, SendMode, toNano } from 'ton-core';
import { Opcodes } from './helpers/op';
import { TupleItemSlice } from 'ton-core/dist/tuple/tuple';
import { PoolSlice, PoolValue } from './helpers/utils';

export type RouterConfig = {
    isLocked: boolean;
    adminAddress: Address;
    pTonWalletCode: Cell;
    LPWalletCode: Cell;
    poolCode: Cell;
    content: Cell;
    LPAccountCode: Cell;
};

export function routerConfigToCell(config: RouterConfig): Cell {
    return beginCell()
        .storeUint(config.isLocked ? 1 : 0, 1)
        .storeAddress(config.adminAddress)
        .storeRef(
            beginCell()
                .storeRef(config.pTonWalletCode)
                .storeRef(config.LPWalletCode)
                .storeRef(config.poolCode)
                .storeRef(config.LPAccountCode)
            .endCell()
        )
        .storeRef(config.content)
        .storeDict(Dictionary.empty(Dictionary.Keys.Address(), PoolValue))
        .storeRef(
            beginCell()
                .storeUint(0, 64)
                .storeUint(0, 64)
                .storeAddress(null)
                .storeRef(beginCell().endCell())
            .endCell()
        )
    .endCell();
}

export class Router implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Router(address);
    }

    static createFromConfig(config: RouterConfig, code: Cell, workchain = 0) {
        const data = routerConfigToCell(config);
        const init = { code, data };
        return new Router(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendProvideLiquidity(provider: ContractProvider, via: Sender,
        params: {
            jettonAmount: bigint;
            fromAddress: Address;
            walletTokenBAddress: Address;
            minLPOut: bigint;
        }
    ) {
        await provider.internal(via, {
            value: toNano('1'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(params.jettonAmount)
                .storeAddress(params.fromAddress)
                .storeBit(true)
                .storeRef(beginCell()
                    .storeUint(0xfcf9e58f, 32)
                    .storeAddress(params.walletTokenBAddress)
                    .storeCoins(params.minLPOut)
                .endCell()
                )
            .endCell(),
        });
    }

    async sendProxyProvideLiquidity(provider: ContractProvider, via: Sender,
        params: {
            jettonAmount: bigint;
            walletTokenBAddress: Address;
            minLPOut: bigint;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.5') + params.jettonAmount,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.proxyProvideLiquidity, 32)
                .storeUint(0, 64)
                .storeCoins(params.jettonAmount)
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

    async sendSwap(provider: ContractProvider, via: Sender,
        params: {
            jettonAmount: bigint;
            fromAddress: Address;
            walletTokenBAddress: Address;
            toAddress: Address;
            expectedOutput: bigint;
            refAddress?: Address;
        }
    ) {
        let fwdPayload = beginCell()
                .storeUint(0x25938561, 32)
                .storeAddress(params.walletTokenBAddress)
                .storeCoins(params.expectedOutput)
                .storeAddress(params.toAddress);

                if(!!params.refAddress) {
                    fwdPayload.storeUint(1, 1).storeAddress(params.refAddress);
                }

        await provider.internal(via, {
            value: toNano('1'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x7362d09c, 32)
                .storeUint(0, 64)
                .storeCoins(params.jettonAmount)
                .storeAddress(params.fromAddress)
                .storeRef(fwdPayload.endCell())
            .endCell(),
        });
    }

    async sendProxySwap(provider: ContractProvider, via: Sender,
        params: {
            jettonAmount: bigint;
            walletTokenBAddress: Address;
            toAddress: Address;
            expectedOutput: bigint;
            refAddress?: Address;
        }
    ) {
        let fwdPayload = beginCell()
                .storeUint(0x25938561, 32)
                .storeAddress(params.walletTokenBAddress)
                .storeCoins(params.expectedOutput)
                .storeAddress(params.toAddress);

            if(!!params.refAddress) {
                fwdPayload.storeUint(1, 1).storeAddress(params.refAddress);
            }


        await provider.internal(via, {
            value: toNano('0.5') + params.jettonAmount,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.proxySwap, 32)
                .storeUint(0, 64)
                .storeCoins(params.jettonAmount)
                .storeRef(
                    fwdPayload.endCell()
                )
            .endCell(),
        });
    }

    async sendPayTo(provider: ContractProvider, via: Sender,
        params: {
            owner: Address;
            tokenAAmount: bigint;
            walletTokenAAddress: Address;
            tokenBAmount: bigint;
            walletTokenBAddress: Address
        }

    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xf93bb43f, 32)
                .storeUint(0, 64)
                .storeAddress(params.owner)
                .storeUint(0, 32)
                .storeRef(
                    beginCell()
                        .storeCoins(params.tokenAAmount)
                        .storeAddress(params.walletTokenAAddress)
                        .storeCoins(params.tokenBAmount)
                        .storeAddress(params.walletTokenBAddress)
                    .endCell()
                )
            .endCell(),
        });
    }

    async sendSetFees(provider: ContractProvider, via: Sender,
        params: {
            jetton0Address: Address;
            jetton1Address: Address;
            newLPFee: bigint;
            newProtocolFee: bigint;
            newRefFee: bigint;
            newProtocolFeeAddress: Address;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x355423e5, 32)
                .storeUint(0, 64)
                .storeUint(params.newLPFee, 8)
                .storeUint(params.newProtocolFee, 8)
                .storeUint(params.newRefFee, 8)
                .storeAddress(params.newProtocolFeeAddress)
                .storeRef(
                    beginCell()
                        .storeAddress(params.jetton0Address)
                        .storeAddress(params.jetton1Address)
                    .endCell()
                )
            .endCell()
        });
    }

    async sendCollectFees(provider: ContractProvider, via: Sender,
        params: {
            jetton0Address: Address;
            jetton1Address: Address;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x1fcb7d3d, 32)
                .storeUint(0, 64)
                .storeAddress(params.jetton0Address)
                .storeAddress(params.jetton1Address)
            .endCell()
        });
    }

    async sendInitCodeUpgrade(provider: ContractProvider, via: Sender,
        params: {
            newCode: Cell;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xdf1e233d, 32)
                .storeUint(0, 64)
                .storeRef(params.newCode)
            .endCell()
        });
    }

    async sendInitAdminUpgrade(provider: ContractProvider, via: Sender,
        params: {
            newAdmin: Address;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x2fb94384, 32)
                .storeUint(0, 64)
                .storeAddress(params.newAdmin)
            .endCell()
        });
    }

    async sendCancelCodeUpgrade(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x357ccc67, 32)
                .storeUint(0, 64)
            .endCell()
        });
    }

    async sendCancelAdminUpgrade(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xa4ed9981, 32)
                .storeUint(0, 64)
            .endCell()
        });
    }

    async sendFinalizeUpgrades(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x6378509f, 32)
                .storeUint(0, 64)
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

    async sendLock(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x878f9b0e, 32)
                .storeUint(0, 64)
            .endCell()
        });
    }

    async sendUnlock(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x6ae4b0ef, 32)
                .storeUint(0, 64)
            .endCell()
        });
    }

    async sendDeployPTonWallet(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.5'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.deployPTonWallet, 32)
                .storeUint(0, 64)
            .endCell()
        });
    }

    async getWalletAddress(provider: ContractProvider, address: Address): Promise<Address> {
        const result = await provider.get('get_wallet_address', [
            {
                type: 'slice',
                cell: beginCell().storeAddress(address).endCell()
            } as TupleItemSlice
        ]);

        return result.stack.readAddress();
    }

    async getPoolAddress(provider: ContractProvider, token0: Address, token1: Address): Promise<Address> {
        const result = await provider.get('get_pool_address', [
            {
                type: 'slice',
                cell: beginCell().storeAddress(token0).endCell()
            } as TupleItemSlice,

            {
                type: 'slice',
                cell: beginCell().storeAddress(token1).endCell()
            } as TupleItemSlice
        ]);

        return result.stack.readAddress();
    }

    async getPoolsDict(provider: ContractProvider): Promise<Dictionary<Address, PoolSlice>> {
        const result = await provider.get('get_pools_dict', []);
        return result.stack.readCell().beginParse().loadDict(Dictionary.Keys.Address(), PoolValue);
    }

    async getIsLocked(provider: ContractProvider): Promise<boolean> {
        const result = await provider.get('get_router_data', []);
        return result.stack.readBoolean();
    }
}
