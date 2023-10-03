import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { JettonMinterB } from '../wrappers/JettonMinterB';

export async function run(provider: NetworkProvider, args: string[]) {

    const jettonMinterBAddress = Address.parse('EQBaOpKcH43HIiENY-Bdqt4z_wVhxYlmS74Y6Ixp2DKNxq3T');

    const jettonMinterB = provider.open(JettonMinterB.createFromAddress(jettonMinterBAddress));

    await jettonMinterB.sendMint(provider.sender(), {
        amount: toNano('0.5'),
        jettonAmount: toNano('100'),
        toAddress: provider.sender().address as Address,
    });
}