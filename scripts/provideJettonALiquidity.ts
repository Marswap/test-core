import { NetworkProvider } from '@ton-community/blueprint';
import { JettonWalletA } from '../wrappers/JettonWalletA';
import { Address, beginCell, toNano } from 'ton-core';
import { Router } from '../wrappers/Router';

export async function run(provider: NetworkProvider, args: string[]) {

    const userJettonWalletAAddress = Address.parse('EQD_xSr58MQPzG6hyKHHbgM4-J9tzBVz2LWo7LyvBIi9Glzy');

    const userJettonWalletA = provider.open(JettonWalletA.createFromAddress(userJettonWalletAAddress));

    const routerAddress = Address.parse('EQARK2zDjIFAMW00WT9Pdb5pmi61uOH1kBkgMXkY49Y58XXu');

    const router = provider.open(Router.createFromAddress(routerAddress));

    const routerJettonWalletBAddress = await router.getWalletAddress(routerAddress);

    await userJettonWalletA.sendTransfer(provider.sender(), {
        jettonAmount: toNano('10'),
        toAddress: routerAddress, 
        fromAddress: provider.sender().address as Address, 
        fwdAmount: toNano('0.8'),
        fwdPayload: beginCell()
                .storeUint(0xfcf9e58f, 32)
                .storeAddress(routerJettonWalletBAddress) 
                .storeCoins(1)
            .endCell(),
        value: toNano('1')
    });
}