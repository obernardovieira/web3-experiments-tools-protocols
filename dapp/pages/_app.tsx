import { AuthType } from '@particle-network/auth-core';
import { ScrollSepolia } from '@particle-network/chains';
import { AuthCoreContextProvider } from '@particle-network/auth-core-modal';
import type { AppProps } from 'next/app';
import config from '../utils/config';

function MyApp({ Component, pageProps }: AppProps) {
	return (
		<AuthCoreContextProvider
			options={{
				...config.particleNetwork,
				authTypes: [AuthType.email, AuthType.google, AuthType.twitter],
				themeType: 'dark',
				fiatCoin: 'USD',
				language: 'en',
				erc4337: {
					name: "SIMPLE",
					version: "1.0.0",
				},
				wallet: {
					visible: true,
					customStyle: {
						supportChains: [ScrollSepolia]
					}
				},
			}}
		>
			<Component {...pageProps} />
		</AuthCoreContextProvider>
	);
}

export default MyApp;
