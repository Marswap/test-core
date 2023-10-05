import { Router } from '../wrappers/Router';
import { NetworkProvider } from '@ton-community/blueprint';
import { Address, toNano } from 'ton-core';
import { JettonMinterB } from '../wrappers/JettonMinterB';

export async function run(provider: NetworkProvider, args: string[]) {
    const routerAddress = Address.parse('EQBpjR6BdZSL1XqpNAWg65nJNBhE-EZ3F-WK3w-sjvilUUgq');

    const router = provider.open(Router.createFromAddress(routerAddress));

    const jettonMinterBAddress = Address.parse('EQDCJL0iQHofcBBvFBHdVG233Ri2V4kCNFgfRT-gqAd3Oc86');

    const jettonMinterB = provider.open(JettonMinterB.createFromAddress(jettonMinterBAddress));

    const routerJettonWalletBAddress = await jettonMinterB.getWalletAddress(routerAddress);

    await router.sendProxyProvideLiquidity(provider.sender(), {
        jettonAmount: 1001n,
        walletTokenBAddress: routerJettonWalletBAddress,
        minLPOut: 1n,
    });
}