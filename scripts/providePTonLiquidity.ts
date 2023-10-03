import { Router } from '../wrappers/Router';
import { NetworkProvider } from '@ton-community/blueprint';
import { Address, toNano } from 'ton-core';
import { JettonMinterA } from '../wrappers/JettonMinterA';

export async function run(provider: NetworkProvider, args: string[]) {
    const routerAddress = Address.parse('EQBpjR6BdZSL1XqpNAWg65nJNBhE-EZ3F-WK3w-sjvilUUgq');

    const router = provider.open(Router.createFromAddress(routerAddress));

    const jettonMinterBAddress = Address.parse('EQDdcF7zjjnSX8Ie7B588ZxY44U3idOAZnddHGmOET8q4E2e');

    const jettonMinterB = provider.open(JettonMinterA.createFromAddress(jettonMinterBAddress));

    const routerJettonWalletBAddress = await jettonMinterB.getWalletAddress(routerAddress);

    await router.sendProxyProvideLiquidity(provider.sender(), {
        jettonAmount: 1001n,
        walletTokenBAddress: routerJettonWalletBAddress,
        minLPOut: 1n,
    });
}