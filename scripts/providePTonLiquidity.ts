import { Router } from '../wrappers/Router';
import { NetworkProvider } from '@ton-community/blueprint';
import { Address, toNano } from 'ton-core';
import { JettonMinterA } from '../wrappers/JettonMinterA';

export async function run(provider: NetworkProvider, args: string[]) {

    const routerAddress = Address.parse('EQARK2zDjIFAMW00WT9Pdb5pmi61uOH1kBkgMXkY49Y58XXu'); 

    const router = provider.open(Router.createFromAddress(routerAddress));

    const jettonMinterBAddress = Address.parse('EQDdcF7zjjnSX8Ie7B588ZxY44U3idOAZnddHGmOET8q4E2e');

    const jettonMinterA = provider.open(JettonMinterA.createFromAddress(jettonMinterBAddress));

    const routerJettonWalletBAddress = await jettonMinterA.getWalletAddress(routerAddress);

    await router.sendProxyProvideLiquidity(provider.sender(), {
        jettonAmount: toNano('10'),
        walletTokenBAddress: routerJettonWalletBAddress,
        minLPOut: 1n,
    });
}