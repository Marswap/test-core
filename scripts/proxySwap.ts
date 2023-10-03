import { Router } from '../wrappers/Router';
import { NetworkProvider } from '@ton-community/blueprint';
import { Address, toNano } from 'ton-core';
import { JettonMinterA } from '../wrappers/JettonMinterA';
import { randomAddress } from '@ton-community/test-utils';

export async function run(provider: NetworkProvider, args: string[]) {

    const routerAddress = Address.parse('EQAjTnR28ANDITshynZz-Js_QtIFs72xqPmxOoVFnyRi9RoG');

    const router = provider.open(Router.createFromAddress(routerAddress));

    const jettonMinterBAddress = Address.parse('EQDdcF7zjjnSX8Ie7B588ZxY44U3idOAZnddHGmOET8q4E2e');

    const jettonMinterA = provider.open(JettonMinterA.createFromAddress(jettonMinterBAddress));

    const routerJettonWalletBAddress = await jettonMinterA.getWalletAddress(routerAddress);

    await router.sendProxySwap(provider.sender(), {
        jettonAmount: toNano('1'),
        walletTokenBAddress: routerJettonWalletBAddress,
        expectedOutput: 1000n,
        toAddress: provider.sender().address as Address,
        refAddress: randomAddress()
    });
}