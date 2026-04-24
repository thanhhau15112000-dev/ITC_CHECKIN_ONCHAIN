// dapp-kit.ts
import { createDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const GRPC_URLS = {
	testnet: 'https://fullnode.testnet.sui.io:443',
};

const dAppKit = createDAppKit({
	networks: ['testnet'],
	createClient: (network) => new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }),
});
export { dAppKit };
export default dAppKit;

// Register types for hook type inference
declare module '@mysten/dapp-kit-react' {
	interface Register {
		dAppKit: typeof dAppKit;
	}
}