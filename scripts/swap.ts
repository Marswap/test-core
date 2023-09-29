import { Address, beginCell, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { JettonWalletA } from '../wrappers/JettonWalletA';
import { Router } from '../wrappers/Router';

export async function run(provider: NetworkProvider, args: string[]) {

    const routerAddress = Address.parse('EQAjTnR28ANDITshynZz-Js_QtIFs72xqPmxOoVFnyRi9RoG')

    const userJettonWalletAAddress = Address.parse('EQD_xSr58MQPzG6hyKHHbgM4-J9tzBVz2LWo7LyvBIi9Glzy');

    const userJettonWalletA = provider.open(JettonWalletA.createFromAddress(userJettonWalletAAddress));

    const router = provider.open(Router.createFromAddress(routerAddress));

    const routerJettonWalletBAddress = await router.getWalletAddress(routerAddress);

    await userJettonWalletA.sendTransfer(provider.sender(), {
        jettonAmount: toNano('1'),
        toAddress: routerAddress, 
        fromAddress: provider.sender().address as Address, 
        fwdAmount: toNano('0.4'),
        fwdPayload: beginCell()
                .storeUint(0x25938561, 32)
                .storeAddress(routerJettonWalletBAddress) 
                .storeCoins(1001n)
                .storeAddress(provider.sender().address as Address)
                .storeBit(false)
            .endCell(),
        value: toNano('0.5')
    });
}