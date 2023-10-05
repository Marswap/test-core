import { Address, beginCell, toNano } from 'ton-core';
import { Router } from '../wrappers/Router';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const router = provider.open(
        Router.createFromConfig(
            {
                isLocked: false,
                adminAddress: provider.sender().address as Address,
                LPWalletCode: await compile('LpWallet'),
                poolCode: await compile('Pool'),
                LPAccountCode: await compile('LpAccount'),
                content: beginCell().storeUint(1, 8).storeStringTail('https://lp.optus.fi/ton-proxy.json').endCell(),
                pTonWalletCode: await compile('PTonWallet'),
            },
            await compile('Router')
        )
    );

    if (!(await provider.isContractDeployed(router.address))) {
        await router.sendDeploy(provider.sender(), toNano('2'));
    }

    await provider.waitForDeploy(router.address);

    if (!(await provider.isContractDeployed(await router.getWalletAddress(router.address)))) {
        await router.sendDeployPTonWallet(provider.sender());
    }

    await provider.waitForDeploy(await router.getWalletAddress(router.address));
}
