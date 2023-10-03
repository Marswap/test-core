import { NetworkProvider } from '@ton-community/blueprint';
import { JettonWalletB } from '../wrappers/JettonWalletB';
import { Address, beginCell, toNano } from 'ton-core';
import { JettonMinterB } from '../wrappers/JettonMinterB';

export async function run(provider: NetworkProvider, args: string[]) {

    const userJettonWalletBAddress = Address.parse('EQASLfEGfhpq3HxUBD9jvjs_dNRzSueMpxKe0gQLo7mGdCZk');

    const userJettonWalletB = provider.open(JettonWalletB.createFromAddress(userJettonWalletBAddress));

    const routerAddress = Address.parse('EQAFnsKjovbqxFmUjgdkdDCdV2dbDJm07Gf60H8Pta-NvSki')

    const jettonMinterBAddress = Address.parse('EQDdcF7zjjnSX8Ie7B588ZxY44U3idOAZnddHGmOET8q4E2e');

    const jettonMinterA = provider.open(JettonMinterB.createFromAddress(jettonMinterBAddress));

    const routerJettonWalletBAddress = await jettonMinterA.getWalletAddress(routerAddress);

    await userJettonWalletB.sendTransfer(provider.sender(), {
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