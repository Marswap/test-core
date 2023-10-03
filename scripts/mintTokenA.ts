import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { JettonMinterA } from '../wrappers/JettonMinterA';

export async function run(provider: NetworkProvider, args: string[]) {

    const jettonMinterAAddress = Address.parse('EQDdcF7zjjnSX8Ie7B588ZxY44U3idOAZnddHGmOET8q4E2e');

    const jettonMinterA = provider.open(JettonMinterA.createFromAddress(jettonMinterAAddress));

    await jettonMinterA.sendMint(provider.sender(), {
        amount: toNano('0.5'),
        jettonAmount: toNano('100'),
        toAddress: provider.sender().address as Address,
    });
}