import { NetworkProvider } from '@ton-community/blueprint';
import { JettonWalletB } from '../wrappers/JettonWalletB';
import { Address, beginCell, toNano } from 'ton-core';
import { JettonMinterA } from '../wrappers/JettonMinterA';
import { JettonMinterB } from '../wrappers/JettonMinterB';

export async function run(provider: NetworkProvider, args: string[]) {
    const routerAddress = Address.parse('EQBpjR6BdZSL1XqpNAWg65nJNBhE-EZ3F-WK3w-sjvilUUgq');

    const userWalletAddressV4 = Address.parse('kQAULcjDZ4TK9huUxR4Vl_Tfa8JRooU3bhvPrmHJHZIPGdKY');

    // Minter A

    const jettonMinterAAddress = Address.parse('EQBaOpKcH43HIiENY-Bdqt4z_wVhxYlmS74Y6Ixp2DKNxq3T');

    const jettonMinterA = provider.open(JettonMinterA.createFromAddress(jettonMinterAAddress));

    // Wallet A

    const routerJettonWalletAAddress = await jettonMinterA.getWalletAddress(routerAddress);

    // Miner B

    const jettonMinterBAddress = Address.parse('EQDdcF7zjjnSX8Ie7B588ZxY44U3idOAZnddHGmOET8q4E2e');

    const jettonMinterB = provider.open(JettonMinterB.createFromAddress(jettonMinterBAddress));

    // Wallet B

    const userJettonWalletBAddress = await jettonMinterB.getWalletAddress(userWalletAddressV4);
    const userJettonWalletB = provider.open(JettonWalletB.createFromAddress(userJettonWalletBAddress));

    await userJettonWalletB.sendTransfer(provider.sender(), {
        jettonAmount: 10001n,
        toAddress: routerAddress,
        fromAddress: provider.sender().address as Address,
        fwdAmount: toNano('0.4'),
        fwdPayload: beginCell()
            .storeUint(0xfcf9e58f, 32)
            .storeAddress(routerJettonWalletAAddress)
            .storeCoins(1)
            .endCell(),
        value: toNano('0.5'),
    });
}